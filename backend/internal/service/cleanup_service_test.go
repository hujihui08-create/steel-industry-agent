package service

import (
	"context"
	"testing"
	"time"

	"steel-agent-backend/internal/model"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupCleanupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	if err := db.AutoMigrate(
		&model.SteelPrice{},
		&model.News{},
		&model.Tender{},
		&model.ChatMessage{},
	); err != nil {
		t.Fatalf("failed to migrate test db: %v", err)
	}
	return db
}

func newTestCleanupService(t *testing.T) *CleanupService {
	t.Helper()
	db := setupCleanupTestDB(t)
	return NewCleanupService(db)
}

// -- CleanupOldPrices tests ---------------------------------------------------

func TestCleanupOldPrices_DeletesOldRecords(t *testing.T) {
	svc := newTestCleanupService(t)
	ctx := context.Background()

	twoYearsAgo := time.Now().AddDate(-2, 0, 0)
	today := time.Now().Truncate(24 * time.Hour)

	// Insert old price record (2 years ago).
	oldPrice := model.SteelPrice{
		Category:  "螺纹钢",
		Spec:      "HRB400E 20mm",
		Price:     3800,
		Change:    10,
		ChangePct: 0.3,
		Region:    "上海",
		Source:    "test",
		PriceDate: twoYearsAgo,
	}
	if err := svc.db.WithContext(ctx).Create(&oldPrice).Error; err != nil {
		t.Fatalf("failed to insert old price: %v", err)
	}

	// Insert current price record.
	newPrice := model.SteelPrice{
		Category:  "螺纹钢",
		Spec:      "HRB400E 20mm",
		Price:     3850,
		Change:    50,
		ChangePct: 1.3,
		Region:    "上海",
		Source:    "test",
		PriceDate: today,
	}
	if err := svc.db.WithContext(ctx).Create(&newPrice).Error; err != nil {
		t.Fatalf("failed to insert new price: %v", err)
	}

	// Execute cleanup.
	svc.CleanupOldPrices(ctx)

	// Verify: old record deleted, new record remains.
	var count int64
	svc.db.WithContext(ctx).Model(&model.SteelPrice{}).Count(&count)
	if count != 1 {
		t.Errorf("expected 1 record after cleanup, got %d", count)
	}

	var remaining model.SteelPrice
	if err := svc.db.WithContext(ctx).First(&remaining).Error; err != nil {
		t.Fatalf("failed to query remaining record: %v", err)
	}
	if remaining.ID != newPrice.ID {
		t.Errorf("expected new price (ID=%d) to remain, got ID=%d", newPrice.ID, remaining.ID)
	}
}

func TestCleanupOldPrices_NoOldRecords(t *testing.T) {
	svc := newTestCleanupService(t)
	ctx := context.Background()

	// Insert only current records.
	today := time.Now().Truncate(24 * time.Hour)
	p1 := model.SteelPrice{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3850, Region: "上海", Source: "test", PriceDate: today}
	p2 := model.SteelPrice{Category: "热卷", Spec: "5.5mm", Price: 4200, Region: "上海", Source: "test", PriceDate: today}

	svc.db.WithContext(ctx).Create(&p1)
	svc.db.WithContext(ctx).Create(&p2)

	svc.CleanupOldPrices(ctx)

	var count int64
	svc.db.WithContext(ctx).Model(&model.SteelPrice{}).Count(&count)
	if count != 2 {
		t.Errorf("expected 2 records, got %d", count)
	}
}

// -- CleanupOldNews tests -----------------------------------------------------

func TestCleanupOldNews_DeletesOldRecords(t *testing.T) {
	svc := newTestCleanupService(t)
	ctx := context.Background()

	// Insert old news (8 months ago).
	oldNews := model.News{
		Title:       "Old News",
		Summary:     "Should be deleted",
		Source:      "test",
		Category:    "市场分析",
		PublishedAt: time.Now().AddDate(0, -8, 0),
	}
	if err := svc.db.WithContext(ctx).Create(&oldNews).Error; err != nil {
		t.Fatalf("failed to insert old news: %v", err)
	}

	// Insert recent news (1 month ago).
	recentNews := model.News{
		Title:       "Recent News",
		Summary:     "Should remain",
		Source:      "test",
		Category:    "市场分析",
		PublishedAt: time.Now().AddDate(0, -1, 0),
	}
	if err := svc.db.WithContext(ctx).Create(&recentNews).Error; err != nil {
		t.Fatalf("failed to insert recent news: %v", err)
	}

	svc.CleanupOldNews(ctx)

	var count int64
	svc.db.WithContext(ctx).Model(&model.News{}).Count(&count)
	if count != 1 {
		t.Errorf("expected 1 record after cleanup, got %d", count)
	}

	var remaining model.News
	svc.db.WithContext(ctx).First(&remaining)
	if remaining.ID != recentNews.ID {
		t.Errorf("expected recent news (ID=%d) to remain, got ID=%d", recentNews.ID, remaining.ID)
	}
}

// -- CleanupOldTenders tests --------------------------------------------------

func TestCleanupOldTenders_DeletesOldClosed(t *testing.T) {
	svc := newTestCleanupService(t)
	ctx := context.Background()

	// Insert old closed tender (deadline 8 months ago, status closed).
	oldClosed := model.Tender{
		Title:    "Old Closed Tender",
		Region:   "上海",
		Category: "螺纹钢",
		Budget:   1000000,
		Deadline: time.Now().AddDate(0, -8, 0),
		Status:   "closed",
	}
	if err := svc.db.WithContext(ctx).Create(&oldClosed).Error; err != nil {
		t.Fatalf("failed to insert old closed tender: %v", err)
	}

	// Insert old open tender (deadline 8 months ago, but still open).
	oldOpen := model.Tender{
		Title:    "Old Open Tender",
		Region:   "北京",
		Category: "热卷",
		Budget:   500000,
		Deadline: time.Now().AddDate(0, -8, 0),
		Status:   "open",
	}
	if err := svc.db.WithContext(ctx).Create(&oldOpen).Error; err != nil {
		t.Fatalf("failed to insert old open tender: %v", err)
	}

	// Insert recent closed tender.
	recentClosed := model.Tender{
		Title:    "Recent Closed Tender",
		Region:   "广州",
		Category: "线材",
		Budget:   300000,
		Deadline: time.Now().AddDate(0, -1, 0),
		Status:   "closed",
	}
	if err := svc.db.WithContext(ctx).Create(&recentClosed).Error; err != nil {
		t.Fatalf("failed to insert recent closed tender: %v", err)
	}

	svc.CleanupOldTenders(ctx)

	var count int64
	svc.db.WithContext(ctx).Model(&model.Tender{}).Count(&count)
	if count != 2 {
		t.Errorf("expected 2 records after cleanup, got %d", count)
	}

	// Verify old closed is deleted.
	var r1 model.Tender
	if err := svc.db.WithContext(ctx).Where("id = ?", oldClosed.ID).First(&r1).Error; err == nil {
		t.Error("old closed tender should have been deleted")
	}

	// Verify old open is still there (not deleted because status is not closed).
	var r2 model.Tender
	if err := svc.db.WithContext(ctx).Where("id = ?", oldOpen.ID).First(&r2).Error; err != nil {
		t.Error("old open tender should remain (status is open)")
	}

	// Verify recent closed is still there (not old enough).
	var r3 model.Tender
	if err := svc.db.WithContext(ctx).Where("id = ?", recentClosed.ID).First(&r3).Error; err != nil {
		t.Error("recent closed tender should remain (deadline within 6 months)")
	}
}

// -- CleanupOldChatMessages tests ---------------------------------------------

func TestCleanupOldChatMessages_DeletesOldRecords(t *testing.T) {
	svc := newTestCleanupService(t)
	ctx := context.Background()

	// Insert old message (60 days ago).
	oldMsg := model.ChatMessage{
		SessionID: 1,
		Role:      "user",
		Content:   "old message",
		CreatedAt: time.Now().AddDate(0, 0, -60),
	}
	if err := svc.db.WithContext(ctx).Create(&oldMsg).Error; err != nil {
		t.Fatalf("failed to insert old message: %v", err)
	}

	// Insert recent message (10 days ago).
	recentMsg := model.ChatMessage{
		SessionID: 1,
		Role:      "assistant",
		Content:   "recent message",
		CreatedAt: time.Now().AddDate(0, 0, -10),
	}
	if err := svc.db.WithContext(ctx).Create(&recentMsg).Error; err != nil {
		t.Fatalf("failed to insert recent message: %v", err)
	}

	svc.CleanupOldChatMessages(ctx)

	var count int64
	svc.db.WithContext(ctx).Model(&model.ChatMessage{}).Count(&count)
	if count != 1 {
		t.Errorf("expected 1 record after cleanup, got %d", count)
	}

	var remaining model.ChatMessage
	svc.db.WithContext(ctx).First(&remaining)
	if remaining.ID != recentMsg.ID {
		t.Errorf("expected recent message (ID=%d) to remain, got ID=%d", recentMsg.ID, remaining.ID)
	}
}

func TestCleanupOldChatMessages_AllRecent(t *testing.T) {
	svc := newTestCleanupService(t)
	ctx := context.Background()

	// Insert only recent messages.
	msg1 := model.ChatMessage{SessionID: 1, Role: "user", Content: "hello", CreatedAt: time.Now()}
	msg2 := model.ChatMessage{SessionID: 1, Role: "assistant", Content: "hi", CreatedAt: time.Now()}

	svc.db.WithContext(ctx).Create(&msg1)
	svc.db.WithContext(ctx).Create(&msg2)

	svc.CleanupOldChatMessages(ctx)

	var count int64
	svc.db.WithContext(ctx).Model(&model.ChatMessage{}).Count(&count)
	if count != 2 {
		t.Errorf("expected 2 records, got %d", count)
	}
}

// -- RunMonthlyCleanup tests --------------------------------------------------

func TestRunMonthlyCleanup_NoPanic(t *testing.T) {
	svc := newTestCleanupService(t)
	ctx := context.Background()

	// Insert data across all tables to verify RunMonthlyCleanup completes
	// without panicking even when there's nothing to delete.
	today := time.Now().Truncate(24 * time.Hour)

	svc.db.WithContext(ctx).Create(&model.SteelPrice{
		Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3850, Region: "上海", Source: "test", PriceDate: today,
	})
	svc.db.WithContext(ctx).Create(&model.News{
		Title: "Recent News", Source: "test", Category: "市场", PublishedAt: time.Now(),
	})
	svc.db.WithContext(ctx).Create(&model.Tender{
		Title: "Recent Tender", Region: "上海", Category: "螺纹钢", Deadline: time.Now().AddDate(0, 1, 0), Status: "open",
	})
	svc.db.WithContext(ctx).Create(&model.ChatMessage{
		SessionID: 1, Role: "user", Content: "hello", CreatedAt: time.Now(),
	})

	// RunMonthlyCleanup should succeed without panic.
	svc.RunMonthlyCleanup(ctx)

	// All recent records should remain.
	var priceCount, newsCount, tenderCount, msgCount int64
	svc.db.WithContext(ctx).Model(&model.SteelPrice{}).Count(&priceCount)
	svc.db.WithContext(ctx).Model(&model.News{}).Count(&newsCount)
	svc.db.WithContext(ctx).Model(&model.Tender{}).Count(&tenderCount)
	svc.db.WithContext(ctx).Model(&model.ChatMessage{}).Count(&msgCount)

	if priceCount != 1 {
		t.Errorf("expected 1 price, got %d", priceCount)
	}
	if newsCount != 1 {
		t.Errorf("expected 1 news, got %d", newsCount)
	}
	if tenderCount != 1 {
		t.Errorf("expected 1 tender, got %d", tenderCount)
	}
	if msgCount != 1 {
		t.Errorf("expected 1 message, got %d", msgCount)
	}
}
