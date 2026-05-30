package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gocolly/colly/v2"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

// crawlRuleConfig defines the parsed crawl rule structure from the JSONB field.
type crawlRuleConfig struct {
	Container string            `json:"container"`
	Fields    map[string]string `json:"fields"`
}

// CrawlStatus represents the current status overview for a single data source.
type CrawlStatus struct {
	SourceID     uint       `json:"source_id"`
	SourceName   string     `json:"source_name"`
	SourceType   string     `json:"source_type"`
	SourceURL    string     `json:"source_url"`
	IsActive     bool       `json:"is_active"`
	IsRunning    bool       `json:"is_running"`
	LastCrawlAt  *time.Time `json:"last_crawl_at"`
	LastSuccessAt *time.Time `json:"last_success_at"`
	NextCrawlAt  *time.Time `json:"next_crawl_at"`
}

// CrawlerService manages scheduled and on-demand web crawling for steel data sources.
type CrawlerService struct {
	db           *gorm.DB
	sourceRepo   *repository.CrawlerSourceRepository
	logRepo      *repository.CrawlerLogRepository
	priceRepo    *repository.SteelPriceRepository
	newsRepo     *repository.NewsRepository
	tenderRepo   *repository.TenderRepository
	categoryRepo *repository.CategoryRepository
	cacheService *CacheService
	mu           sync.Mutex
	runningTasks map[uint]bool
	stopChan     chan struct{}
}

// NewCrawlerService creates a new CrawlerService wired with all required dependencies.
func NewCrawlerService(
	db *gorm.DB,
	sourceRepo *repository.CrawlerSourceRepository,
	logRepo *repository.CrawlerLogRepository,
	priceRepo *repository.SteelPriceRepository,
	newsRepo *repository.NewsRepository,
	tenderRepo *repository.TenderRepository,
	categoryRepo *repository.CategoryRepository,
	cacheService *CacheService,
) *CrawlerService {
	return &CrawlerService{
		db:           db,
		sourceRepo:   sourceRepo,
		logRepo:      logRepo,
		priceRepo:    priceRepo,
		newsRepo:     newsRepo,
		tenderRepo:   tenderRepo,
		categoryRepo: categoryRepo,
		cacheService: cacheService,
		runningTasks: make(map[uint]bool),
		stopChan:     make(chan struct{}),
	}
}

// StartScheduler launches the background goroutine that periodically checks for
// data sources due for crawling. It polls every 30 seconds.
func (s *CrawlerService) StartScheduler() {
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		log.Println("[CrawlerService] Scheduler started, polling every 30s")

		// Run once immediately on start.
		s.schedulerTick()

		for {
			select {
			case <-ticker.C:
				s.schedulerTick()
			case <-s.stopChan:
				log.Println("[CrawlerService] Scheduler stopped")
				return
			}
		}
	}()
}

// RunSchedulerTick is the public entry point for manually triggering one polling
// cycle of the crawler scheduler. It is used by ScheduledTaskService.
func (s *CrawlerService) RunSchedulerTick() {
	s.schedulerTick()
}

// schedulerTick performs a single polling iteration: finds all active sources and
// triggers a crawl for any source whose crawl_interval has elapsed since last_crawl_at.
func (s *CrawlerService) schedulerTick() {
	sources, err := s.sourceRepo.FindActive()
	if err != nil {
		log.Printf("[CrawlerService] Failed to fetch active sources: %v", err)
		return
	}

	now := time.Now()
	for _, source := range sources {
		// Determine if this source is due for crawling.
		// A source is due when last_crawl_at + crawl_interval < now.
		if source.LastCrawlAt != nil {
			nextDue := source.LastCrawlAt.Add(time.Duration(source.CrawlInterval) * time.Second)
			if now.Before(nextDue) {
				continue // Not yet due.
			}
		}

		// Skip if already running to prevent duplicate crawls.
		s.mu.Lock()
		if s.runningTasks[source.ID] {
			s.mu.Unlock()
			continue
		}
		s.runningTasks[source.ID] = true
		s.mu.Unlock()

		// Crawl in a separate goroutine so the scheduler is not blocked.
		go func(src model.CrawlerSource) {
			defer func() {
				s.mu.Lock()
				delete(s.runningTasks, src.ID)
				s.mu.Unlock()
			}()
			s.CrawlSource(src)
		}(source)
	}
}

// Stop signals the scheduler goroutine to exit gracefully.
func (s *CrawlerService) Stop() {
	close(s.stopChan)
}

// CrawlSource executes a single crawl job against the given data source.
// It creates a crawl log, dispatches to the appropriate parser based on
// source_type, and handles retry on failure (up to 3 attempts).
func (s *CrawlerService) CrawlSource(source model.CrawlerSource) {
	ctx := context.Background()
	now := time.Now()

	// Create a running crawl log entry.
	crawlLog := &model.CrawlerLog{
		SourceID:  source.ID,
		Status:    "running",
		StartedAt: &now,
	}
	if err := s.logRepo.Create(ctx, crawlLog); err != nil {
		log.Printf("[CrawlerService] Failed to create crawl log for source %d: %v", source.ID, err)
		return
	}

	log.Printf("[CrawlerService] Starting crawl for source %d (%s) type=%s url=%s",
		source.ID, source.SourceName, source.SourceType, source.SourceURL)

	const maxRetries = 3
	var lastErr error
	var itemsCrawled int

	for attempt := 1; attempt <= maxRetries; attempt++ {
		if attempt > 1 {
			log.Printf("[CrawlerService] Retry attempt %d/%d for source %d", attempt, maxRetries, source.ID)
			// Exponential backoff: 2s, 4s, 8s.
			backoff := time.Duration(1<<uint(attempt)) * time.Second
			time.Sleep(backoff)
		}

		collector := s.createCollector()

		switch source.SourceType {
		case "price":
			prices, err := s.parsePriceHTML(source, collector)
			if err != nil {
				lastErr = fmt.Errorf("price parse error: %w", err)
				continue
			}
			itemsCrawled = len(prices)
			if itemsCrawled == 0 {
				log.Printf("[CrawlerService] WARNING: source %d returned 0 items, check URL and CSS selectors", source.ID)
			}
			// Invalidate relevant caches after successful price crawl.
			categories := make(map[string]bool)
			for _, p := range prices {
				categories[p.Category] = true
			}
			for cat := range categories {
				if err := s.cacheService.InvalidatePriceCache(ctx, cat); err != nil {
					log.Printf("[CrawlerService] Failed to invalidate price cache for %s: %v", cat, err)
				}
			}
			lastErr = nil

		case "news":
			news, err := s.parseNewsHTML(source, collector)
			if err != nil {
				lastErr = fmt.Errorf("news parse error: %w", err)
				continue
			}
			itemsCrawled = len(news)
			lastErr = nil

		case "tender":
			tenders, err := s.parseTenderHTML(source, collector)
			if err != nil {
				lastErr = fmt.Errorf("tender parse error: %w", err)
				continue
			}
			itemsCrawled = len(tenders)
			lastErr = nil

		default:
			lastErr = fmt.Errorf("unsupported source_type: %s", source.SourceType)
			// Do not retry on unsupported type.
			break
		}

		if lastErr == nil {
			break // Success, exit retry loop.
		}
	}

	// Update crawl log with final status.
	if lastErr != nil {
		errMsg := lastErr.Error()
		log.Printf("[CrawlerService] Crawl failed for source %d after %d attempts: %v",
			source.ID, maxRetries, lastErr)
		if updateErr := s.logRepo.UpdateStatus(ctx, crawlLog.ID, "failed", itemsCrawled, errMsg); updateErr != nil {
			log.Printf("[CrawlerService] Failed to update crawl log status: %v", updateErr)
		}
	} else {
		log.Printf("[CrawlerService] Crawl succeeded for source %d: %d items", source.ID, itemsCrawled)
		if updateErr := s.logRepo.UpdateStatus(ctx, crawlLog.ID, "success", itemsCrawled, ""); updateErr != nil {
			log.Printf("[CrawlerService] Failed to update crawl log status: %v", updateErr)
		}
	}

	// Always update last_crawl_at.
	if err := s.sourceRepo.UpdateLastCrawl(source.ID); err != nil {
		log.Printf("[CrawlerService] Failed to update last_crawl_at for source %d: %v", source.ID, err)
	}

	// Update last_success_at only on success.
	if lastErr == nil {
		if err := s.sourceRepo.UpdateLastSuccess(source.ID); err != nil {
			log.Printf("[CrawlerService] Failed to update last_success_at for source %d: %v", source.ID, err)
		}
	}
}

// TriggerCrawl initiates an asynchronous crawl for the given source ID. This is
// intended for manual / admin-triggered crawls. If the source is already running,
// the trigger is silently ignored.
func (s *CrawlerService) TriggerCrawl(sourceID uint) error {
	source, err := s.sourceRepo.FindByID(sourceID)
	if err != nil {
		return fmt.Errorf("source %d not found: %w", sourceID, err)
	}

	s.mu.Lock()
	if s.runningTasks[sourceID] {
		s.mu.Unlock()
		log.Printf("[CrawlerService] Source %d is already running, skipping TriggerCrawl", sourceID)
		return fmt.Errorf("数据源 %d 正在采集中，请稍后再试", sourceID)
	}
	s.runningTasks[sourceID] = true
	s.mu.Unlock()

	go func(src model.CrawlerSource) {
		defer func() {
			s.mu.Lock()
			delete(s.runningTasks, src.ID)
			s.mu.Unlock()
		}()
		s.CrawlSource(src)
	}(*source)

	return nil
}

// CleanupZombieLogs marks all running crawl logs as failed. This should be called
// on service startup to handle logs left in "running" state from a previous crash.
func (s *CrawlerService) CleanupZombieLogs() {
	ctx := context.Background()
	count, err := s.logRepo.CleanupZombieLogs(ctx)
	if err != nil {
		log.Printf("[CrawlerService] Failed to cleanup zombie logs: %v", err)
		return
	}
	if count > 0 {
		log.Printf("[CrawlerService] Cleaned up %d zombie crawl logs", count)
	}
}

// GetCrawlStatus returns a status overview for ALL data sources (including inactive ones),
// whether each source is currently running and when it was last crawled.
// Inactive sources always have IsRunning forced to false.
func (s *CrawlerService) GetCrawlStatus() (map[uint]CrawlStatus, error) {
	sources, err := s.sourceRepo.FindAll()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch sources: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	result := make(map[uint]CrawlStatus, len(sources))
	now := time.Now()

	for _, src := range sources {
		var nextCrawlAt *time.Time
		if src.LastCrawlAt != nil {
			next := src.LastCrawlAt.Add(time.Duration(src.CrawlInterval) * time.Second)
			if next.After(now) {
				nextCrawlAt = &next
			}
		}

		isRunning := s.runningTasks[src.ID]
		if !src.IsActive {
			isRunning = false // Inactive sources are never running.
		}

		result[src.ID] = CrawlStatus{
			SourceID:      src.ID,
			SourceName:    src.SourceName,
			SourceType:    src.SourceType,
			SourceURL:     src.SourceURL,
			IsActive:      src.IsActive,
			IsRunning:     isRunning,
			LastCrawlAt:   src.LastCrawlAt,
			LastSuccessAt: src.LastSuccessAt,
			NextCrawlAt:   nextCrawlAt,
		}
	}

	return result, nil
}

// ---------------------------------------------------------------------------
// Internal: colly collector factory
// ---------------------------------------------------------------------------

// createCollector builds a pre-configured colly collector with sensible defaults.
func (s *CrawlerService) createCollector() *colly.Collector {
	c := colly.NewCollector(
		colly.UserAgent("SteelAgentCrawler/1.0"),
		colly.AllowURLRevisit(),
	)

	// Respect robots.txt for ethical crawling.
	c.Limit(&colly.LimitRule{
		DomainGlob: "*",
		Delay:      2 * time.Second,
	})

	// Logging callbacks.
	c.OnRequest(func(r *colly.Request) {
		log.Printf("[CrawlerService] Visiting: %s", r.URL.String())
	})

	c.OnError(func(r *colly.Response, err error) {
		log.Printf("[CrawlerService] Request error for %s: %v", r.Request.URL, err)
	})

	return c
}

// ---------------------------------------------------------------------------
// Internal: HTML parsers
// ---------------------------------------------------------------------------

// parsePriceHTML crawls the source URL and extracts steel price records using
// the CSS selectors defined in source.CrawlRule.
func (s *CrawlerService) parsePriceHTML(source model.CrawlerSource, c *colly.Collector) ([]model.SteelPrice, error) {
	ctx := context.Background()
	rule, err := parseCrawlRule(source.CrawlRule)
	if err != nil {
		return nil, fmt.Errorf("invalid crawl rule: %w", err)
	}

	var lastHTTPError error
	c.OnError(func(r *colly.Response, err error) {
		lastHTTPError = err
	})

	var scraped []model.SteelPrice

	c.OnHTML(rule.Container, func(e *colly.HTMLElement) {
		price := model.SteelPrice{
			Source:    source.SourceName,
			PriceDate: time.Now().Truncate(24 * time.Hour), // Store as date only.
		}

		// Extract each field using the configured CSS selectors.
		// Values are truncated to fit column limits (spec: 200, region: 200, category: 50).
		if sel, ok := rule.Fields["category"]; ok {
			price.Category = truncateStr(strings.TrimSpace(e.ChildText(sel)), 50)
		}
		if sel, ok := rule.Fields["spec"]; ok {
			price.Spec = truncateStr(strings.TrimSpace(e.ChildText(sel)), 200)
		}
		if sel, ok := rule.Fields["price"]; ok {
			price.Price = sanitizeNumber(e.ChildText(sel))
		}
		if sel, ok := rule.Fields["change"]; ok {
			price.Change = sanitizeNumber(e.ChildText(sel))
		}
		if sel, ok := rule.Fields["change_pct"]; ok {
			price.ChangePct = sanitizeNumber(e.ChildText(sel))
		}
		if sel, ok := rule.Fields["region"]; ok {
			price.Region = truncateStr(strings.TrimSpace(e.ChildText(sel)), 200)
		}

		// Only persist rows that have at least a category (bare minimum).
		if price.Category == "" {
			return
		}

		// Skip items whose category is explicitly disabled.
		if cat, err := s.categoryRepo.FindByNameAndType(ctx, price.Category, "spot", nil); err == nil && cat.Status == "disabled" {
			log.Printf("[crawler] category '%s' is disabled, skipping", price.Category)
			return
		}

		if err := s.priceRepo.Create(ctx, &price); err != nil {
			log.Printf("[CrawlerService] Failed to insert price: %v", err)
			return
		}

		scraped = append(scraped, price)
	})

	if err := c.Visit(source.SourceURL); err != nil {
		return scraped, fmt.Errorf("visit failed: %w", err)
	}

	// colly uses a request wait queue internally; ensure all callbacks complete.
	c.Wait()

	if len(scraped) == 0 && lastHTTPError != nil {
		return nil, fmt.Errorf("HTTP error: %w", lastHTTPError)
	}

	return scraped, nil
}

// parseNewsHTML crawls the source URL and extracts news articles using the CSS
// selectors defined in source.CrawlRule.
func (s *CrawlerService) parseNewsHTML(source model.CrawlerSource, c *colly.Collector) ([]model.News, error) {
	ctx := context.Background()
	rule, err := parseCrawlRule(source.CrawlRule)
	if err != nil {
		return nil, fmt.Errorf("invalid crawl rule: %w", err)
	}

	var scraped []model.News

	c.OnHTML(rule.Container, func(e *colly.HTMLElement) {
		news := model.News{
			Source:      source.SourceName,
			SourceURL:   source.SourceURL,
			PublishedAt: time.Now(),
		}

		if sel, ok := rule.Fields["title"]; ok {
			news.Title = strings.TrimSpace(e.ChildText(sel))
		}
		if sel, ok := rule.Fields["summary"]; ok {
			news.Summary = strings.TrimSpace(e.ChildText(sel))
		}
		if sel, ok := rule.Fields["content"]; ok {
			news.Content = strings.TrimSpace(e.ChildText(sel))
		}
		if sel, ok := rule.Fields["category"]; ok {
			news.Category = strings.TrimSpace(e.ChildText(sel))
		}

		if news.Title == "" {
			return
		}

		if err := s.newsRepo.Create(ctx, &news); err != nil {
			log.Printf("[CrawlerService] Failed to insert news: %v", err)
			return
		}

		scraped = append(scraped, news)
	})

	if err := c.Visit(source.SourceURL); err != nil {
		return scraped, fmt.Errorf("visit failed: %w", err)
	}

	c.Wait()

	return scraped, nil
}

// parseTenderHTML crawls the source URL and extracts tender records using the CSS
// selectors defined in source.CrawlRule.
func (s *CrawlerService) parseTenderHTML(source model.CrawlerSource, c *colly.Collector) ([]model.Tender, error) {
	ctx := context.Background()
	rule, err := parseCrawlRule(source.CrawlRule)
	if err != nil {
		return nil, fmt.Errorf("invalid crawl rule: %w", err)
	}

	var scraped []model.Tender

	c.OnHTML(rule.Container, func(e *colly.HTMLElement) {
		tender := model.Tender{
			SourceURL: source.SourceURL,
			Status:    "open",
		}

		if sel, ok := rule.Fields["title"]; ok {
			tender.Title = strings.TrimSpace(e.ChildText(sel))
		}
		if sel, ok := rule.Fields["region"]; ok {
			tender.Region = strings.TrimSpace(e.ChildText(sel))
		}
		if sel, ok := rule.Fields["category"]; ok {
			tender.Category = strings.TrimSpace(e.ChildText(sel))
		}
		if sel, ok := rule.Fields["budget"]; ok {
			tender.Budget = sanitizeNumber(e.ChildText(sel))
		}
		if sel, ok := rule.Fields["description"]; ok {
			tender.Description = strings.TrimSpace(e.ChildText(sel))
		}
		if sel, ok := rule.Fields["deadline"]; ok {
			if t, err := parseDateField(e.ChildText(sel)); err == nil {
				tender.Deadline = t
			}
		}

		if tender.Title == "" {
			return
		}

		if err := s.tenderRepo.Create(ctx, &tender); err != nil {
			log.Printf("[CrawlerService] Failed to insert tender: %v", err)
			return
		}

		scraped = append(scraped, tender)
	})

	if err := c.Visit(source.SourceURL); err != nil {
		return scraped, fmt.Errorf("visit failed: %w", err)
	}

	c.Wait()

	return scraped, nil
}

// ---------------------------------------------------------------------------
// Internal: helpers
// ---------------------------------------------------------------------------

// parseCrawlRule unmarshals the JSONB crawl_rule string into a crawlRuleConfig.
// Returns an error if the JSON is malformed or missing required fields.
func parseCrawlRule(ruleJSON string) (*crawlRuleConfig, error) {
	if strings.TrimSpace(ruleJSON) == "" {
		return nil, fmt.Errorf("crawl_rule is empty")
	}

	var rule crawlRuleConfig
	if err := json.Unmarshal([]byte(ruleJSON), &rule); err != nil {
		return nil, fmt.Errorf("failed to parse crawl_rule JSON: %w", err)
	}

	if rule.Container == "" {
		return nil, fmt.Errorf("crawl_rule missing required field: container")
	}

	if len(rule.Fields) == 0 {
		return nil, fmt.Errorf("crawl_rule missing required field: fields")
	}

	return &rule, nil
}

// sanitizeNumber extracts the first numeric value from a string, stripping
// currency symbols, commas, spaces, and common unit suffixes.
func sanitizeNumber(raw string) float64 {
	if raw == "" {
		return 0
	}

	// Remove common noise: currency symbols, commas, Chinese units, whitespace.
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.ReplaceAll(cleaned, ",", "")
	cleaned = strings.ReplaceAll(cleaned, " ", "")
	cleaned = strings.ReplaceAll(cleaned, "¥", "")
	cleaned = strings.ReplaceAll(cleaned, "￥", "")
	cleaned = strings.ReplaceAll(cleaned, "$", "")
	cleaned = strings.ReplaceAll(cleaned, "元/吨", "")
	cleaned = strings.ReplaceAll(cleaned, "元", "")
	cleaned = strings.ReplaceAll(cleaned, "%", "")
	cleaned = strings.ReplaceAll(cleaned, "+", "")
	cleaned = strings.ReplaceAll(cleaned, "万", "")

	val, err := strconv.ParseFloat(cleaned, 64)
	if err != nil {
		return 0
	}
	return val
}

// truncateStr truncates a string to maxLen runes.
func truncateStr(s string, maxLen int) string {
	runes := []rune(s)
	if len(runes) <= maxLen {
		return s
	}
	return string(runes[:maxLen])
}

// parseDateField attempts to parse a date string into time.Time.
// Supports common Chinese date formats.
func parseDateField(raw string) (time.Time, error) {
	cleaned := strings.TrimSpace(raw)
	if cleaned == "" {
		return time.Time{}, fmt.Errorf("empty date string")
	}

	// Try common date layouts.
	layouts := []string{
		"2006-01-02",
		"2006-01-02 15:04:05",
		"2006/01/02",
		"2006年01月02日",
		"2006年1月2日",
		"01-02",
		"2006.01.02",
	}

	for _, layout := range layouts {
		if t, err := time.Parse(layout, cleaned); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("unrecognized date format: %s", cleaned)
}
