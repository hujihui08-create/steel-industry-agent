package service

import (
	"testing"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupCrawlerTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	if err := db.AutoMigrate(&model.CrawlerSource{}, &model.CrawlerLog{}); err != nil {
		t.Fatalf("failed to migrate test db: %v", err)
	}
	return db
}

func TestNewCrawlerService(t *testing.T) {
	db := setupCrawlerTestDB(t)
	svc := NewCrawlerService(db, nil, nil, nil, nil, nil, nil, nil)

	if svc == nil {
		t.Fatal("NewCrawlerService returned nil")
	}
	if svc.db != db {
		t.Error("db field not set correctly")
	}
	if svc.runningTasks == nil {
		t.Error("runningTasks map should be initialized")
	}
	if svc.stopChan == nil {
		t.Error("stopChan should be initialized")
	}
	if len(svc.runningTasks) != 0 {
		t.Errorf("runningTasks should be empty, got %d entries", len(svc.runningTasks))
	}
}

func TestTriggerCrawl_InvalidID(t *testing.T) {
	db := setupCrawlerTestDB(t)

	sourceRepo := repository.NewCrawlerSourceRepository(db)

	// Create a CrawlerService with only sourceRepo set; other repos are nil
	// because TriggerCrawl only needs sourceRepo.FindByID.
	svc := NewCrawlerService(db, sourceRepo, nil, nil, nil, nil, nil, nil)
	defer svc.Stop()

	// No sources inserted, so any ID should return an error.
	err := svc.TriggerCrawl(999)
	if err == nil {
		t.Error("expected error for non-existent source ID, got nil")
	}
}

func TestTriggerCrawl_ExistingSource(t *testing.T) {
	db := setupCrawlerTestDB(t)

	sourceRepo := repository.NewCrawlerSourceRepository(db)

	source := &model.CrawlerSource{
		SourceName:    "Test Source",
		SourceType:    "price",
		SourceURL:     "://invalid-url",
		CrawlRule:     `{"container":"table tr","fields":{"category":"td.title"}}`,
		CrawlInterval: 3600,
		IsActive:      true,
	}
	if err := sourceRepo.Create(source); err != nil {
		t.Fatalf("failed to create test source: %v", err)
	}

	logRepo := repository.NewCrawlerLogRepository(db)

	svc := NewCrawlerService(db, sourceRepo, logRepo, nil, nil, nil, nil, nil)
	defer svc.Stop()

	// Calling TriggerCrawl on an existing source should succeed (returns nil
	// even if the crawl itself fails). The crawl runs asynchronously via
	// CrawlSource which will fail on the invalid URL.
	err := svc.TriggerCrawl(source.ID)
	if err != nil {
		t.Errorf("TriggerCrawl should not return error for a valid source: %v", err)
	}
}

func TestGetCrawlStatus_Empty(t *testing.T) {
	db := setupCrawlerTestDB(t)

	sourceRepo := repository.NewCrawlerSourceRepository(db)

	svc := NewCrawlerService(db, sourceRepo, nil, nil, nil, nil, nil, nil)
	defer svc.Stop()

	statuses, err := svc.GetCrawlStatus()
	if err != nil {
		t.Fatalf("GetCrawlStatus failed: %v", err)
	}
	if len(statuses) != 0 {
		t.Errorf("expected empty status map, got %d entries", len(statuses))
	}
}

func TestGetCrawlStatus_WithSources(t *testing.T) {
	db := setupCrawlerTestDB(t)

	sourceRepo := repository.NewCrawlerSourceRepository(db)

	// Insert two active sources.
	s1 := &model.CrawlerSource{
		SourceName:    "Source A",
		SourceType:    "price",
		SourceURL:     "https://example.com/a",
		CrawlRule:     `{"container":"table","fields":{"price":"td"}}`,
		CrawlInterval: 3600,
		IsActive:      true,
	}
	s2 := &model.CrawlerSource{
		SourceName:    "Source B",
		SourceType:    "news",
		SourceURL:     "https://example.com/b",
		CrawlRule:     `{"container":"div","fields":{"title":"h2"}}`,
		CrawlInterval: 7200,
		IsActive:      true,
	}
	if err := sourceRepo.Create(s1); err != nil {
		t.Fatalf("failed to create s1: %v", err)
	}
	if err := sourceRepo.Create(s2); err != nil {
		t.Fatalf("failed to create s2: %v", err)
	}

	svc := NewCrawlerService(db, sourceRepo, nil, nil, nil, nil, nil, nil)
	defer svc.Stop()

	statuses, err := svc.GetCrawlStatus()
	if err != nil {
		t.Fatalf("GetCrawlStatus failed: %v", err)
	}
	if len(statuses) != 2 {
		t.Errorf("expected 2 status entries, got %d", len(statuses))
	}

	for _, status := range statuses {
		if status.SourceID != s1.ID && status.SourceID != s2.ID {
			t.Errorf("unexpected source ID: %d", status.SourceID)
		}
		if status.SourceURL == "" {
			t.Error("SourceURL should not be empty")
		}
		if !status.IsActive {
			t.Error("IsActive should be true")
		}
		if status.IsRunning {
			t.Error("IsRunning should be false when no crawl in progress")
		}
	}

	// Verify status entries are keyed by source ID.
	if _, ok := statuses[s1.ID]; !ok {
		t.Errorf("status map missing entry for source %d", s1.ID)
	}
	if _, ok := statuses[s2.ID]; !ok {
		t.Errorf("status map missing entry for source %d", s2.ID)
	}
}

// TestCrawlSourceWithNetwork is skipped because CrawlSource depends on Colly
// which requires a real HTTP server. Integration tests should cover this.
func TestCrawlSourceWithNetwork(t *testing.T) {
	t.Skip("CrawlSource depends on Colly (real HTTP); use integration tests")
}
