package repository

import (
	"context"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupCrawlerLogTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.CrawlerLog{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestCrawlerLogRepo_Create(t *testing.T) {
	db := setupCrawlerLogTestDB(t)
	repo := NewCrawlerLogRepository(db)
	ctx := context.Background()

	now := time.Now()
	log := &model.CrawlerLog{
		SourceID:     1,
		Status:       "running",
		ItemsCrawled: 0,
		ErrorMessage: "",
		StartedAt:    &now,
	}
	if err := repo.Create(ctx, log); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if log.ID == 0 {
		t.Errorf("expected ID to be assigned after Create, got 0")
	}
}

func TestCrawlerLogRepo_FindBySourceID(t *testing.T) {
	db := setupCrawlerLogTestDB(t)
	repo := NewCrawlerLogRepository(db)
	ctx := context.Background()

	// Insert 3 logs for source 1
	for i := 0; i < 3; i++ {
		now := time.Now().Add(-time.Duration(i) * time.Hour)
		log := &model.CrawlerLog{
			SourceID:     1,
			Status:       "success",
			ItemsCrawled: 100 + i*10,
			StartedAt:    &now,
		}
		if err := repo.Create(ctx, log); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}

	// Insert 1 log for source 2 (should not appear in source 1 results)
	now := time.Now()
	otherLog := &model.CrawlerLog{
		SourceID:     2,
		Status:       "failed",
		ItemsCrawled: 0,
		StartedAt:    &now,
	}
	if err := repo.Create(ctx, otherLog); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	logs, err := repo.FindBySourceID(ctx, 1, 10)
	if err != nil {
		t.Fatalf("FindBySourceID failed: %v", err)
	}
	if len(logs) != 3 {
		t.Errorf("expected 3 logs for source 1, got %d", len(logs))
	}
	for _, l := range logs {
		if l.SourceID != 1 {
			t.Errorf("expected SourceID=1, got %d", l.SourceID)
		}
	}
}

func TestCrawlerLogRepo_FindRecent(t *testing.T) {
	db := setupCrawlerLogTestDB(t)
	repo := NewCrawlerLogRepository(db)
	ctx := context.Background()

	// Insert 5 logs with staggered started_at times
	for i := 0; i < 5; i++ {
		now := time.Now().Add(-time.Duration(i) * time.Hour)
		log := &model.CrawlerLog{
			SourceID:     uint(i + 1),
			Status:       "success",
			ItemsCrawled: i * 50,
			StartedAt:    &now,
		}
		if err := repo.Create(ctx, log); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}

	// Fetch recent 3
	logs, err := repo.FindRecent(ctx, 3)
	if err != nil {
		t.Fatalf("FindRecent failed: %v", err)
	}
	if len(logs) != 3 {
		t.Errorf("expected 3 recent logs, got %d", len(logs))
	}

	// Verify descending order by started_at
	for i := 1; i < len(logs); i++ {
		if logs[i-1].StartedAt != nil && logs[i].StartedAt != nil {
			if logs[i-1].StartedAt.Before(*logs[i].StartedAt) {
				t.Errorf("expected descending order by started_at, got out of order at index %d", i)
			}
		}
	}
}

func TestCrawlerLogRepo_UpdateStatus(t *testing.T) {
	db := setupCrawlerLogTestDB(t)
	repo := NewCrawlerLogRepository(db)
	ctx := context.Background()

	now := time.Now()
	log := &model.CrawlerLog{
		SourceID:     1,
		Status:       "running",
		ItemsCrawled: 0,
		ErrorMessage: "",
		StartedAt:    &now,
	}
	if err := repo.Create(ctx, log); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Update to "success" with items crawled and no error
	if err := repo.UpdateStatus(ctx, log.ID, "success", 250, ""); err != nil {
		t.Fatalf("UpdateStatus failed: %v", err)
	}

	// Verify the update persisted by re-querying
	var updated model.CrawlerLog
	if err := db.Where("id = ?", log.ID).First(&updated).Error; err != nil {
		t.Fatalf("failed to fetch updated log: %v", err)
	}
	if updated.Status != "success" {
		t.Errorf("expected status 'success', got '%s'", updated.Status)
	}
	if updated.ItemsCrawled != 250 {
		t.Errorf("expected items_crawled 250, got %d", updated.ItemsCrawled)
	}
	if updated.FinishedAt == nil {
		t.Errorf("expected finished_at to be set for success status, got nil")
	}
	if time.Since(*updated.FinishedAt) > 5*time.Second {
		t.Errorf("expected finished_at to be recent, got %v", *updated.FinishedAt)
	}
}
