package repository

import (
	"context"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupNewsTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.News{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestNewsRepo_Create(t *testing.T) {
	db := setupNewsTestDB(t)
	repo := NewNewsRepository(db)
	ctx := context.Background()

	news := &model.News{
		Title:       "螺纹钢价格今日上涨",
		Summary:     "受原材料价格上涨影响，螺纹钢价格今日普遍上涨50元/吨",
		Source:      "我的钢铁网",
		Category:    "价格行情",
		PublishedAt: time.Now(),
	}
	if err := repo.Create(ctx, news); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if news.ID == 0 {
		t.Error("expected ID to be assigned after Create")
	}
	if news.Title != "螺纹钢价格今日上涨" {
		t.Errorf("expected title '螺纹钢价格今日上涨', got '%s'", news.Title)
	}
}

func TestNewsRepo_FindRecent(t *testing.T) {
	db := setupNewsTestDB(t)
	repo := NewNewsRepository(db)
	ctx := context.Background()

	now := time.Now()

	// Create 5 news articles with different times
	for i := 0; i < 5; i++ {
		news := &model.News{
			Title:       "新闻标题",
			Summary:     "新闻摘要",
			Source:      "来源",
			Category:    "价格行情",
			PublishedAt: now.Add(-time.Duration(4-i) * time.Hour),
		}
		if err := repo.Create(ctx, news); err != nil {
			t.Fatalf("Create news %d failed: %v", i, err)
		}
	}

	// FindAll with limit 3 should return most recent 3
	results, err := repo.FindAll(ctx, 3, 0)
	if err != nil {
		t.Fatalf("FindAll failed: %v", err)
	}
	if len(results) != 3 {
		t.Errorf("expected 3 news articles, got %d", len(results))
	}

	// Verify DESC order by published_at
	for i := 1; i < len(results); i++ {
		if results[i].PublishedAt.After(results[i-1].PublishedAt) {
			t.Errorf("expected DESC order by published_at, got out of order at index %d", i)
		}
	}

	// FindAll with limit 10 should return all 5
	results, err = repo.FindAll(ctx, 10, 0)
	if err != nil {
		t.Fatalf("FindAll failed: %v", err)
	}
	if len(results) != 5 {
		t.Errorf("expected 5 news articles, got %d", len(results))
	}
}
