package repository

import (
	"context"
	"testing"

	"github.com/lib/pq"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupIntentTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.Intent{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestIntentRepo_FindAll(t *testing.T) {
	db := setupIntentTestDB(t)
	repo := NewIntentRepository(db)
	ctx := context.Background()

	// Insert 3 intents with different priorities
	intents := []*model.Intent{
		{
			IntentCode: "price_query", IntentName: "价格查询",
			Keywords: pq.StringArray{"价格", "报价"}, ReplyTemplate: "正在查询价格...",
			Priority: 10, IsActive: true, ToolName: "query_steel_price",
		},
		{
			IntentCode: "tender_search", IntentName: "招标搜索",
			Keywords: pq.StringArray{"招标", "采购"}, ReplyTemplate: "正在搜索招标...",
			Priority: 5, IsActive: true, ToolName: "query_tender",
		},
		{
			IntentCode: "knowledge_search", IntentName: "知识搜索",
			Keywords: pq.StringArray{"标准", "规格"}, ReplyTemplate: "正在搜索知识库...",
			Priority: 1, IsActive: false, ToolName: "",
		},
	}

	for _, intent := range intents {
		if err := repo.Create(ctx, intent); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}

	result, err := repo.FindAll(ctx)
	if err != nil {
		t.Fatalf("FindAll failed: %v", err)
	}
	if len(result) != 3 {
		t.Errorf("expected 3 intents, got %d", len(result))
	}
	// Verify descending priority order
	if len(result) >= 2 && result[0].Priority < result[1].Priority {
		t.Errorf("expected descending priority order, got %d before %d", result[0].Priority, result[1].Priority)
	}
}

func TestIntentRepo_FindByCode(t *testing.T) {
	db := setupIntentTestDB(t)
	repo := NewIntentRepository(db)
	ctx := context.Background()

	intent := &model.Intent{
		IntentCode: "test_intent", IntentName: "测试意图",
		Keywords: pq.StringArray{"测试", "test"}, ReplyTemplate: "测试回复模板",
		Priority: 3, IsActive: true, ToolName: "query_steel_price",
	}
	if err := repo.Create(ctx, intent); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	found, err := repo.FindByCode(ctx, "test_intent")
	if err != nil {
		t.Fatalf("FindByCode failed: %v", err)
	}
	if found.IntentCode != "test_intent" {
		t.Errorf("expected intent_code 'test_intent', got '%s'", found.IntentCode)
	}
	if found.IntentName != "测试意图" {
		t.Errorf("expected intent_name '测试意图', got '%s'", found.IntentName)
	}

	// Find non-existent code
	_, err = repo.FindByCode(ctx, "non_existent")
	if err == nil {
		t.Errorf("expected error for non-existent code, got nil")
	}
}

func TestIntentRepo_Create(t *testing.T) {
	db := setupIntentTestDB(t)
	repo := NewIntentRepository(db)
	ctx := context.Background()

	intent := &model.Intent{
		IntentCode: "create_intent", IntentName: "创建测试",
		Keywords: pq.StringArray{"创建"}, ReplyTemplate: "创建回复",
		Priority: 0, IsActive: true, ToolName: "convert_unit",
	}
	err := repo.Create(ctx, intent)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if intent.ID == 0 {
		t.Errorf("expected ID to be assigned after Create, got 0")
	}
}

func TestIntentRepo_Update(t *testing.T) {
	db := setupIntentTestDB(t)
	repo := NewIntentRepository(db)
	ctx := context.Background()

	intent := &model.Intent{
		IntentCode: "update_intent", IntentName: "原始名称",
		Keywords: pq.StringArray{"原始"}, ReplyTemplate: "原始模板",
		Priority: 1, IsActive: true, ToolName: "",
	}
	if err := repo.Create(ctx, intent); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Update fields
	intent.IntentName = "更新后名称"
	intent.Keywords = pq.StringArray{"更新", "修改"}
	intent.Priority = 5
	if err := repo.Update(ctx, intent); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	// Verify update persisted
	found, err := repo.FindByCode(ctx, "update_intent")
	if err != nil {
		t.Fatalf("FindByCode after update failed: %v", err)
	}
	if found.IntentName != "更新后名称" {
		t.Errorf("expected intent_name '更新后名称', got '%s'", found.IntentName)
	}
	if found.Priority != 5 {
		t.Errorf("expected priority 5, got %d", found.Priority)
	}
}

func TestIntentRepo_Delete(t *testing.T) {
	db := setupIntentTestDB(t)
	repo := NewIntentRepository(db)
	ctx := context.Background()

	intent := &model.Intent{
		IntentCode: "delete_intent", IntentName: "待删除",
		Keywords: pq.StringArray{"删除"}, ReplyTemplate: "删除模板",
		Priority: 2, IsActive: true, ToolName: "",
	}
	if err := repo.Create(ctx, intent); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Delete it
	if err := repo.Delete(ctx, intent.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	// Verify it's gone
	_, err := repo.FindByCode(ctx, "delete_intent")
	if err == nil {
		t.Errorf("expected error after delete, got nil -- record still exists")
	}
}

func TestIntentRepo_FindByToolName_Found(t *testing.T) {
	db := setupIntentTestDB(t)
	repo := NewIntentRepository(db)
	ctx := context.Background()

	intent := &model.Intent{
		IntentCode: "price_query", IntentName: "价格查询",
		Keywords: pq.StringArray{"价格", "报价"},
		ToolName: "query_steel_price",
		Priority: 10, IsActive: true,
	}
	if err := repo.Create(ctx, intent); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	found, err := repo.FindByToolName(ctx, "query_steel_price")
	if err != nil {
		t.Fatalf("FindByToolName failed: %v", err)
	}
	if found.IntentCode != "price_query" {
		t.Errorf("expected intent_code 'price_query', got '%s'", found.IntentCode)
	}
}

func TestIntentRepo_FindByToolName_Inactive(t *testing.T) {
	db := setupIntentTestDB(t)
	repo := NewIntentRepository(db)
	ctx := context.Background()

	intent := &model.Intent{
		IntentCode: "old_intent", IntentName: "已禁用意图",
		Keywords: pq.StringArray{"old"},
		ToolName: "some_old_tool",
		Priority: 1, IsActive: false,
	}
	if err := repo.Create(ctx, intent); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	_, err := repo.FindByToolName(ctx, "some_old_tool")
	if err == nil {
		t.Errorf("expected error for inactive intent, got nil")
	}
}

func TestIntentRepo_FindByToolName_NotFound(t *testing.T) {
	db := setupIntentTestDB(t)
	repo := NewIntentRepository(db)
	ctx := context.Background()

	_, err := repo.FindByToolName(ctx, "nonexistent_tool")
	if err == nil {
		t.Errorf("expected error for nonexistent tool_name, got nil")
	}
}
