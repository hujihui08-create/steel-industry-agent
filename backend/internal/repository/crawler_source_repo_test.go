package repository

import (
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupCrawlerSourceTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.CrawlerSource{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestCrawlerSourceRepo_FindAll(t *testing.T) {
	db := setupCrawlerSourceTestDB(t)
	repo := NewCrawlerSourceRepository(db)

	// Insert 3 records
	for i := 0; i < 3; i++ {
		src := &model.CrawlerSource{
			SourceName:    "test_source_" + string(rune('A'+i)),
			SourceType:    "price",
			SourceURL:     "https://example.com",
			CrawlRule:     "",
			CrawlInterval: 1800,
			IsActive:      true,
		}
		if err := repo.Create(src); err != nil {
			t.Fatalf("failed to create source: %v", err)
		}
	}

	sources, err := repo.FindAll()
	if err != nil {
		t.Fatalf("FindAll failed: %v", err)
	}
	if len(sources) != 3 {
		t.Errorf("expected 3 sources, got %d", len(sources))
	}
}

func TestCrawlerSourceRepo_FindByID(t *testing.T) {
	db := setupCrawlerSourceTestDB(t)
	repo := NewCrawlerSourceRepository(db)

	src := &model.CrawlerSource{
		SourceName:    "find_by_id_test",
		SourceType:    "price",
		SourceURL:     "https://example.com",
		CrawlRule:     "",
		CrawlInterval: 3600,
		IsActive:      true,
	}
	if err := repo.Create(src); err != nil {
		t.Fatalf("failed to create source: %v", err)
	}

	// FindByID(1) should return the record
	found, err := repo.FindByID(src.ID)
	if err != nil {
		t.Fatalf("FindByID failed: %v", err)
	}
	if found.SourceName != "find_by_id_test" {
		t.Errorf("expected source name 'find_by_id_test', got '%s'", found.SourceName)
	}

	// FindByID(999) should return error
	_, err = repo.FindByID(999)
	if err == nil {
		t.Errorf("expected error for non-existent ID, got nil")
	}
}

func TestCrawlerSourceRepo_FindActive(t *testing.T) {
	db := setupCrawlerSourceTestDB(t)
	repo := NewCrawlerSourceRepository(db)

	// Insert 2 active records
	active1 := &model.CrawlerSource{
		SourceName: "active_1", SourceType: "price", SourceURL: "https://a.com",
		CrawlRule: "", CrawlInterval: 1800, IsActive: true,
	}
	active2 := &model.CrawlerSource{
		SourceName: "active_2", SourceType: "tender", SourceURL: "https://b.com",
		CrawlRule: "", CrawlInterval: 1800, IsActive: true,
	}
	for _, s := range []*model.CrawlerSource{active1, active2} {
		if err := repo.Create(s); err != nil {
			t.Fatalf("failed to create source: %v", err)
		}
	}

	// Insert inactive record (must use Update after Create to work around
	// GORM default:true skipping the explicit false zero value)
	inactive := &model.CrawlerSource{
		SourceName: "inactive_1", SourceType: "news", SourceURL: "https://c.com",
		CrawlRule: "", CrawlInterval: 1800,
	}
	if err := repo.Create(inactive); err != nil {
		t.Fatalf("failed to create source: %v", err)
	}
	if err := db.Model(inactive).Update("is_active", false).Error; err != nil {
		t.Fatalf("failed to update inactive: %v", err)
	}

	active, err := repo.FindActive()
	if err != nil {
		t.Fatalf("FindActive failed: %v", err)
	}
	if len(active) != 2 {
		t.Errorf("expected 2 active sources, got %d", len(active))
	}
	for _, s := range active {
		if !s.IsActive {
			t.Errorf("expected all returned sources to be active, got inactive: %s", s.SourceName)
		}
	}
}

func TestCrawlerSourceRepo_Create(t *testing.T) {
	db := setupCrawlerSourceTestDB(t)
	repo := NewCrawlerSourceRepository(db)

	src := &model.CrawlerSource{
		SourceName:    "create_test",
		SourceType:    "price",
		SourceURL:     "https://example.com",
		CrawlRule:     "",
		CrawlInterval: 1800,
		IsActive:      true,
	}
	err := repo.Create(src)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if src.ID == 0 {
		t.Errorf("expected ID to be assigned after Create, got 0")
	}
}

func TestCrawlerSourceRepo_Update(t *testing.T) {
	db := setupCrawlerSourceTestDB(t)
	repo := NewCrawlerSourceRepository(db)

	src := &model.CrawlerSource{
		SourceName:    "original_name",
		SourceType:    "price",
		SourceURL:     "https://example.com",
		CrawlRule:     "",
		CrawlInterval: 1800,
		IsActive:      true,
	}
	if err := repo.Create(src); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Update the source name
	src.SourceName = "updated_name"
	if err := repo.Update(src); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	// Verify the update persisted
	found, err := repo.FindByID(src.ID)
	if err != nil {
		t.Fatalf("FindByID after update failed: %v", err)
	}
	if found.SourceName != "updated_name" {
		t.Errorf("expected source name 'updated_name', got '%s'", found.SourceName)
	}
}

func TestCrawlerSourceRepo_UpdateLastCrawl(t *testing.T) {
	db := setupCrawlerSourceTestDB(t)
	repo := NewCrawlerSourceRepository(db)

	src := &model.CrawlerSource{
		SourceName:    "last_crawl_test",
		SourceType:    "price",
		SourceURL:     "https://example.com",
		CrawlRule:     "",
		CrawlInterval: 1800,
		IsActive:      true,
	}
	if err := repo.Create(src); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if err := repo.UpdateLastCrawl(src.ID); err != nil {
		t.Fatalf("UpdateLastCrawl failed: %v", err)
	}

	// Verify last_crawl_at was set
	found, err := repo.FindByID(src.ID)
	if err != nil {
		t.Fatalf("FindByID after UpdateLastCrawl failed: %v", err)
	}
	if found.LastCrawlAt == nil {
		t.Errorf("expected last_crawl_at to be set, got nil")
	}
	if time.Since(*found.LastCrawlAt) > 5*time.Second {
		t.Errorf("expected last_crawl_at to be recent, got %v", *found.LastCrawlAt)
	}
}

func TestCrawlerSourceRepo_UpdateLastSuccess(t *testing.T) {
	db := setupCrawlerSourceTestDB(t)
	repo := NewCrawlerSourceRepository(db)

	src := &model.CrawlerSource{
		SourceName:    "last_success_test",
		SourceType:    "price",
		SourceURL:     "https://example.com",
		CrawlRule:     "",
		CrawlInterval: 1800,
		IsActive:      true,
	}
	if err := repo.Create(src); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if err := repo.UpdateLastSuccess(src.ID); err != nil {
		t.Fatalf("UpdateLastSuccess failed: %v", err)
	}

	// Verify last_success_at was set
	found, err := repo.FindByID(src.ID)
	if err != nil {
		t.Fatalf("FindByID after UpdateLastSuccess failed: %v", err)
	}
	if found.LastSuccessAt == nil {
		t.Errorf("expected last_success_at to be set, got nil")
	}
	if time.Since(*found.LastSuccessAt) > 5*time.Second {
		t.Errorf("expected last_success_at to be recent, got %v", *found.LastSuccessAt)
	}
}
