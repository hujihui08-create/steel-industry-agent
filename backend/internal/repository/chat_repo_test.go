package repository

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupChatTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.ChatSession{}, &model.ChatMessage{}, &model.AIFeedback{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestChatRepo_CreateSession(t *testing.T) {
	db := setupChatTestDB(t)
	repo := NewChatRepository(db)
	ctx := context.Background()

	session := &model.ChatSession{
		UserID: 1,
		Title:  "螺纹钢价格查询",
		Model:  "gpt-4o-mini",
	}
	if err := repo.CreateSession(ctx, session); err != nil {
		t.Fatalf("CreateSession failed: %v", err)
	}
	if session.ID == 0 {
		t.Error("expected ID to be assigned after CreateSession")
	}
	if session.UserID != 1 {
		t.Errorf("expected UserID 1, got %d", session.UserID)
	}
}

func TestChatRepo_AddMessage(t *testing.T) {
	db := setupChatTestDB(t)
	repo := NewChatRepository(db)
	ctx := context.Background()

	// Create a session first
	session := &model.ChatSession{UserID: 1, Title: "测试会话"}
	if err := repo.CreateSession(ctx, session); err != nil {
		t.Fatalf("CreateSession failed: %v", err)
	}

	msg := &model.ChatMessage{
		SessionID: session.ID,
		Role:      "user",
		Content:   "查询螺纹钢价格",
	}
	if err := repo.CreateMessage(ctx, msg); err != nil {
		t.Fatalf("CreateMessage failed: %v", err)
	}
	if msg.ID == 0 {
		t.Error("expected ID to be assigned after CreateMessage")
	}
	if msg.SessionID != session.ID {
		t.Errorf("expected SessionID %d, got %d", session.ID, msg.SessionID)
	}
}

func TestChatRepo_FindSessionByID(t *testing.T) {
	db := setupChatTestDB(t)
	repo := NewChatRepository(db)
	ctx := context.Background()

	session := &model.ChatSession{UserID: 1, Title: "测试会话"}
	if err := repo.CreateSession(ctx, session); err != nil {
		t.Fatalf("CreateSession failed: %v", err)
	}

	found, err := repo.FindSessionByID(ctx, session.ID)
	if err != nil {
		t.Fatalf("FindSessionByID failed: %v", err)
	}
	if found.ID != session.ID {
		t.Errorf("expected ID %d, got %d", session.ID, found.ID)
	}
	if found.Title != "测试会话" {
		t.Errorf("expected Title '测试会话', got '%s'", found.Title)
	}

	_, err = repo.FindSessionByID(ctx, 999)
	if err == nil {
		t.Error("expected error for non-existent session")
	}
}

func TestChatRepo_FindRecentMessages(t *testing.T) {
	db := setupChatTestDB(t)
	repo := NewChatRepository(db)
	ctx := context.Background()

	session := &model.ChatSession{UserID: 1, Title: "测试会话"}
	if err := repo.CreateSession(ctx, session); err != nil {
		t.Fatalf("CreateSession failed: %v", err)
	}

	// Add 8 messages
	for i := 0; i < 8; i++ {
		role := "user"
		if i%2 == 1 {
			role = "assistant"
		}
		msg := &model.ChatMessage{
			SessionID: session.ID,
			Role:      role,
			Content:   "message content",
		}
		if err := repo.CreateMessage(ctx, msg); err != nil {
			t.Fatalf("CreateMessage %d failed: %v", i, err)
		}
	}

	// Retrieve with limit 5
	msgs, err := repo.FindMessagesBySessionIDWithLimit(ctx, session.ID, 5)
	if err != nil {
		t.Fatalf("FindMessagesBySessionIDWithLimit failed: %v", err)
	}
	// With limit 5 and ASC order, should get 5 messages ordered oldest first
	if len(msgs) != 5 {
		t.Errorf("expected 5 messages with limit, got %d", len(msgs))
	}

	// Verify all messages belong to the session
	for _, m := range msgs {
		if m.SessionID != session.ID {
			t.Errorf("expected SessionID %d, got %d", session.ID, m.SessionID)
		}
	}

	// Verify ASC order
	for i := 1; i < len(msgs); i++ {
		if msgs[i].CreatedAt.Before(msgs[i-1].CreatedAt) {
			t.Errorf("messages not in ASC order at index %d", i)
		}
	}
}
