package service

import (
	"context"
	"log"
	"time"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// CleanupService handles scheduled data lifecycle cleanup tasks.
type CleanupService struct {
	db *gorm.DB
}

// NewCleanupService creates a new CleanupService instance.
func NewCleanupService(db *gorm.DB) *CleanupService {
	return &CleanupService{db: db}
}

// RunMonthlyCleanup is the unified entry point that executes all cleanup
// methods in sequence. It is intended to be called on a monthly schedule.
func (s *CleanupService) RunMonthlyCleanup(ctx context.Context) {
	log.Println("[Cleanup] 开始月度数据清理...")

	s.CleanupOldPrices(ctx)
	s.CleanupOldNews(ctx)
	s.CleanupOldTenders(ctx)
	s.CleanupOldChatMessages(ctx)

	log.Println("[Cleanup] 月度数据清理完成")
}

// CleanupOldPrices deletes steel price records older than 1 year.
func (s *CleanupService) CleanupOldPrices(ctx context.Context) {
	oneYearAgo := time.Now().AddDate(-1, 0, 0)
	result := s.db.WithContext(ctx).
		Where("price_date < ?", oneYearAgo).
		Delete(&model.SteelPrice{})

	log.Printf("[Cleanup] 价格数据清理完成，删除 %d 条记录", result.RowsAffected)
}

// CleanupOldNews deletes news records older than 6 months.
func (s *CleanupService) CleanupOldNews(ctx context.Context) {
	sixMonthsAgo := time.Now().AddDate(0, -6, 0)
	result := s.db.WithContext(ctx).
		Where("published_at < ?", sixMonthsAgo).
		Delete(&model.News{})

	log.Printf("[Cleanup] 资讯数据清理完成，删除 %d 条记录", result.RowsAffected)
}

// CleanupOldTenders deletes tender records older than 6 months that have
// already been closed.
func (s *CleanupService) CleanupOldTenders(ctx context.Context) {
	sixMonthsAgo := time.Now().AddDate(0, -6, 0)
	result := s.db.WithContext(ctx).
		Where("deadline < ? AND status = ?", sixMonthsAgo, "closed").
		Delete(&model.Tender{})

	log.Printf("[Cleanup] 招标数据清理完成，删除 %d 条记录", result.RowsAffected)
}

// CleanupOldChatMessages deletes chat messages older than 30 days.
func (s *CleanupService) CleanupOldChatMessages(ctx context.Context) {
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	result := s.db.WithContext(ctx).
		Where("created_at < ?", thirtyDaysAgo).
		Delete(&model.ChatMessage{})

	log.Printf("[Cleanup] 对话消息清理完成，删除 %d 条记录", result.RowsAffected)
}

// StartScheduler launches a background goroutine that triggers
// RunMonthlyCleanup on the 1st day of every month at 02:00 AM.
// The caller can stop the scheduler by closing the stopChan.
func (s *CleanupService) StartScheduler(stopChan <-chan struct{}) {
	go func() {
		for {
			now := time.Now()
			// Calculate the next occurrence: 1st day of next month at 02:00
			next := time.Date(now.Year(), now.Month()+1, 1, 2, 0, 0, 0, now.Location())
			duration := next.Sub(now)

			select {
			case <-time.After(duration):
				s.RunMonthlyCleanup(context.Background())
			case <-stopChan:
				log.Println("[Cleanup] 定时清理任务已停止")
				return
			}
		}
	}()
}
