package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"

	"github.com/robfig/cron/v3"
)

// SchedulerService manages periodic background jobs using robfig/cron.
// It runs four core autonomous tasks:
//   - Daily price report at 9:00 AM
//   - Hourly tender deadline check
//   - Price alert check every 5 minutes
//   - Weekly trend report every Monday at 9:00 AM
type SchedulerService struct {
	cron                *cron.Cron
	priceService        *PriceService
	alertService        *AlertService
	tenderService       *TenderService
	notificationService *NotificationService
	priceRepo           *repository.SteelPriceRepository
	tenderRepo          *repository.TenderRepository
	userFavoriteRepo    *repository.UserFavoriteRepository
	userRepo            *repository.UserRepository
	notifRepo           *repository.NotificationRepository
	settingsRepo        *repository.SettingsRepository
	sseNotifier         interface {
		Broadcast(userID uint, message string)
	}
}

// NewSchedulerService creates a new SchedulerService with all required dependencies.
func NewSchedulerService(
	priceSvc *PriceService,
	alertSvc *AlertService,
	tenderSvc *TenderService,
	notificationSvc *NotificationService,
	priceRepo *repository.SteelPriceRepository,
	tenderRepo *repository.TenderRepository,
	userFavoriteRepo *repository.UserFavoriteRepository,
	userRepo *repository.UserRepository,
	notifRepo *repository.NotificationRepository,
	settingsRepo *repository.SettingsRepository,
) *SchedulerService {
	return &SchedulerService{
		cron:                cron.New(cron.WithLocation(time.Local)),
		priceService:        priceSvc,
		alertService:        alertSvc,
		tenderService:       tenderSvc,
		notificationService: notificationSvc,
		priceRepo:           priceRepo,
		tenderRepo:          tenderRepo,
		userFavoriteRepo:    userFavoriteRepo,
		userRepo:            userRepo,
		notifRepo:           notifRepo,
		settingsRepo:        settingsRepo,
	}
}

// SetSSENotifier sets the SSE notifier for real-time push after scheduler
// creates notifications.
func (s *SchedulerService) SetSSENotifier(notifier interface {
	Broadcast(userID uint, message string)
}) {
	s.sseNotifier = notifier
}

// Start registers all cron jobs and starts the cron scheduler.
func (s *SchedulerService) Start() {
	// Daily price summary at 9:00 AM every day
	_, err := s.cron.AddFunc("0 9 * * *", s.generatePriceReport)
	if err != nil {
		log.Printf("[SchedulerService] 注册 generatePriceReport 失败: %v", err)
	}

	// Hourly tender deadline check
	_, err = s.cron.AddFunc("0 * * * *", s.checkTenderDeadlines)
	if err != nil {
		log.Printf("[SchedulerService] 注册 checkTenderDeadlines 失败: %v", err)
	}

	// Price alert check every 5 minutes
	_, err = s.cron.AddFunc("*/5 * * * *", s.checkPriceAlerts)
	if err != nil {
		log.Printf("[SchedulerService] 注册 checkPriceAlerts 失败: %v", err)
	}

	// Weekly trend report every Monday at 9:00 AM
	_, err = s.cron.AddFunc("0 9 * * 1", s.generateWeeklyReport)
	if err != nil {
		log.Printf("[SchedulerService] 注册 generateWeeklyReport 失败: %v", err)
	}

	s.cron.Start()
	log.Println("[SchedulerService] Cron 调度器已启动，已注册 4 个定时任务")
}

// Stop gracefully stops the cron scheduler, waiting for any running jobs to complete.
func (s *SchedulerService) Stop() {
	ctx := s.cron.Stop()
	<-ctx.Done()
	log.Println("[SchedulerService] Cron 调度器已停止")
}

// ---------------------------------------------------------------------------
// Task 1: generatePriceReport — daily price summary at 9:00 AM
// ---------------------------------------------------------------------------

func (s *SchedulerService) generatePriceReport() {
	ctx := context.Background()
	log.Println("[SchedulerService] 执行 generatePriceReport: 每日价格汇总")

	categories, err := s.priceRepo.FindDistinctCategories(ctx)
	if err != nil {
		log.Printf("[SchedulerService] generatePriceReport: 获取品类列表失败: %v", err)
		return
	}

	if len(categories) == 0 {
		log.Println("[SchedulerService] generatePriceReport: 无品类数据，跳过")
		return
	}

	// Build daily summary content
	today := time.Now().Format("2006-01-02")
	summaryTitle := fmt.Sprintf("每日价格汇总（%s）", today)
	summaryText := fmt.Sprintf("今日主要钢材品类价格一览：\n\n")

	for _, cat := range categories {
		price, err := s.priceService.GetLatestPrice(ctx, cat)
		if err != nil {
			summaryText += fmt.Sprintf("- %s：数据暂缺\n", cat)
			continue
		}
		changeStr := ""
		if price.Change > 0 {
			changeStr = fmt.Sprintf(" ↑%.2f", price.Change)
		} else if price.Change < 0 {
			changeStr = fmt.Sprintf(" ↓%.2f", -price.Change)
		}
		summaryText += fmt.Sprintf("- %s（%s）：¥%.2f%s\n", price.Category, price.Spec, price.Price, changeStr)
	}

	// Send notification to all users with notifications enabled
	s.broadcastToNotifications(ctx, "report", summaryTitle, summaryText, summaryText)
	log.Println("[SchedulerService] generatePriceReport: 完成")
}

// ---------------------------------------------------------------------------
// Task 2: checkTenderDeadlines — hourly tender deadline check
// ---------------------------------------------------------------------------

func (s *SchedulerService) checkTenderDeadlines() {
	ctx := context.Background()
	log.Println("[SchedulerService] 执行 checkTenderDeadlines: 招标截止时间检查")

	now := time.Now()
	deadlineEnd := now.Add(24 * time.Hour)

	tenders, err := s.tenderRepo.FindByDeadlineRange(ctx, now, deadlineEnd)
	if err != nil {
		log.Printf("[SchedulerService] checkTenderDeadlines: 查询即将到期的招标失败: %v", err)
		return
	}

	notifiedUsers := make(map[uint]bool)

	for _, tender := range tenders {
		favorites, err := s.userFavoriteRepo.FindByTenderID(ctx, tender.ID)
		if err != nil {
			continue
		}

		hoursLeft := tender.Deadline.Sub(now).Hours()
		for _, fav := range favorites {
			if notifiedUsers[fav.UserID] {
				continue
			}
			notifiedUsers[fav.UserID] = true

			notifTitle := fmt.Sprintf("招标即将截止：%s", tender.Title)
			notifSummary := fmt.Sprintf("您关注的招标「%s」将在 %.0f 小时后截止报名", tender.Title, hoursLeft)
			notifContent := fmt.Sprintf(
				"您关注的招标项目「%s」即将截止。\n\n区域：%s | 品类：%s | 预算：¥%.2f\n报名截止：%s\n投标截止：%s\n\n请及时处理，避免错过。",
				tender.Title, tender.Region, tender.Category, tender.Budget,
				tender.Deadline.Format("2006-01-02 15:04"),
				tender.BidDeadline.Format("2006-01-02 15:04"),
			)

			s.notificationService.CreateNotification(ctx, fav.UserID, "tender", notifTitle, notifSummary, notifContent)

			// Push real-time SSE notification
			if s.sseNotifier != nil {
				s.sseNotifier.Broadcast(fav.UserID, notifSummary)
			}
		}
	}

	log.Printf("[SchedulerService] checkTenderDeadlines: 完成，推送了 %d 条通知", len(notifiedUsers))
}

// ---------------------------------------------------------------------------
// Task 3: checkPriceAlerts — every 5 minutes price alert check
// ---------------------------------------------------------------------------

func (s *SchedulerService) checkPriceAlerts() {
	ctx := context.Background()
	log.Println("[SchedulerService] 执行 checkPriceAlerts: 价格预警检查")

	s.alertService.CheckAndTriggerAlerts(ctx)

	log.Println("[SchedulerService] checkPriceAlerts: 完成")
}

// ---------------------------------------------------------------------------
// Task 4: generateWeeklyReport — Monday 9:00 AM weekly trend report
// ---------------------------------------------------------------------------

func (s *SchedulerService) generateWeeklyReport() {
	ctx := context.Background()
	log.Println("[SchedulerService] 执行 generateWeeklyReport: 周度趋势报告")

	report, err := s.priceService.GetWeeklyReport(ctx)
	if err != nil {
		log.Printf("[SchedulerService] generateWeeklyReport: 生成周报失败: %v", err)
		return
	}

	startDate, _ := report["start_date"].(string)
	endDate, _ := report["end_date"].(string)

	summaryTitle := fmt.Sprintf("周度价格趋势报告（%s ~ %s）", startDate, endDate)
	summaryText := fmt.Sprintf("过去一周主要钢材品类价格走势：\n\n")

	trends, ok := report["trends"]
	if ok {
		trendList, ok2 := trends.([]interface{})
		if ok2 {
			for _, t := range trendList {
				trend, ok3 := t.(map[string]interface{})
				if !ok3 {
					continue
				}
				cat, _ := trend["category"].(string)
				startP, _ := trend["start_price"].(float64)
				endP, _ := trend["end_price"].(float64)
				totalCh, _ := trend["total_change"].(float64)

				dir := "平"
				if totalCh > 0 {
					dir = "上涨"
				} else if totalCh < 0 {
					dir = "下跌"
				}
				summaryText += fmt.Sprintf("- %s：%.2f → %.2f，周内%s ¥%.2f\n", cat, startP, endP, dir, totalCh)

				if totalCh < 0 {
					totalCh = -totalCh
				}
			}
		}
	}

	// Send notification to all users with notifications enabled
	s.broadcastToNotifications(ctx, "report", summaryTitle, summaryText, summaryText)
	log.Println("[SchedulerService] generateWeeklyReport: 完成")
}

// ---------------------------------------------------------------------------
// Helper: broadcastToNotifications sends a notification to all users with
// notifications enabled.
// ---------------------------------------------------------------------------

func (s *SchedulerService) broadcastToNotifications(ctx context.Context, notifType, title, summary, content string) {
	// Get users in batches
	var allUserIDs []uint
	offset := 0
	batchSize := 100
	for {
		users, total, err := s.userRepo.FindAll(ctx, "", "", 0, "", "", batchSize, offset)
		if err != nil {
			log.Printf("[SchedulerService] broadcastToNotifications: 获取用户列表失败: %v", err)
			return
		}
		for _, u := range users {
			allUserIDs = append(allUserIDs, u.ID)
		}
		offset += batchSize
		if int64(offset) >= total {
			break
		}
	}

	log.Printf("[SchedulerService] broadcastToNotifications: 准备发送 %d 条通知", len(allUserIDs))

	notifications := make([]model.Notification, 0, len(allUserIDs))
	for _, uid := range allUserIDs {
		notifications = append(notifications, model.Notification{
			UserID:  uid,
			Type:    notifType,
			Title:   title,
			Summary: summary,
			Content: content,
		})
	}

	if err := s.notifRepo.CreateBatch(ctx, notifications); err != nil {
		log.Printf("[SchedulerService] broadcastToNotifications: 批量创建通知失败: %v", err)
		return
	}

	log.Printf("[SchedulerService] broadcastToNotifications: 成功发送 %d 条通知", len(notifications))
}
