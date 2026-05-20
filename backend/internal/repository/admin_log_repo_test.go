package repository

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupAdminLogTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.AdminLog{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestAdminLogRepo_Create(t *testing.T) {
	db := setupAdminLogTestDB(t)
	repo := NewAdminLogRepository(db)
	ctx := context.Background()

	log := &model.AdminLog{
		AdminID:    1,
		Action:     "login",
		TargetType: "auth",
		TargetID:   0,
		Detail:     "",
		IPAddress:  "127.0.0.1",
	}
	err := repo.Create(ctx, log)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if log.ID == 0 {
		t.Errorf("expected ID to be assigned after Create, got 0")
	}
}

func TestAdminLogRepo_FindByAdminID(t *testing.T) {
	db := setupAdminLogTestDB(t)
	repo := NewAdminLogRepository(db)
	ctx := context.Background()

	// Insert 3 logs for admin 1
	for i := 0; i < 3; i++ {
		log := &model.AdminLog{
			AdminID:    1,
			Action:     "update_config",
			TargetType: "agent_config",
			TargetID:   uint(i + 1),
			Detail:     "",
			IPAddress:  "192.168.1.1",
		}
		if err := repo.Create(ctx, log); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}

	// Insert 1 log for admin 2 (should NOT appear in admin 1 results)
	otherLog := &model.AdminLog{
		AdminID:    2,
		Action:     "delete_user",
		TargetType: "user",
		TargetID:   5,
		Detail:     "",
		IPAddress:  "10.0.0.1",
	}
	if err := repo.Create(ctx, otherLog); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	logs, err := repo.FindByAdminID(ctx, 1, 10)
	if err != nil {
		t.Fatalf("FindByAdminID failed: %v", err)
	}
	if len(logs) != 3 {
		t.Errorf("expected 3 logs for admin 1, got %d", len(logs))
	}
	for _, l := range logs {
		if l.AdminID != 1 {
			t.Errorf("expected AdminID=1, got %d", l.AdminID)
		}
	}
}

func TestAdminLogRepo_FindRecent(t *testing.T) {
	db := setupAdminLogTestDB(t)
	repo := NewAdminLogRepository(db)
	ctx := context.Background()

	// Insert 5 logs for different admins
	for i := 0; i < 5; i++ {
		log := &model.AdminLog{
			AdminID:    uint(i%3 + 1),
			Action:     "some_action",
			TargetType: "some_type",
			TargetID:   uint(i),
			Detail:     "",
			IPAddress:  "10.0.0.1",
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

	// Verify descending order by created_at
	for i := 1; i < len(logs); i++ {
		if logs[i-1].CreatedAt.Before(logs[i].CreatedAt) {
			t.Errorf("expected descending order by created_at, got out of order at index %d", i)
		}
	}
}
