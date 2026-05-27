package service

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/lib/pq"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

// setupDebugTestDB creates an in-memory SQLite database and migrates all needed tables.
func setupDebugTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect in-memory database: %v", err)
	}
	if err := db.AutoMigrate(&model.Intent{}, &model.Category{}, &model.EntityConfig{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

// seedIntents inserts test intent records and returns the repo.
func seedIntents(t *testing.T, db *gorm.DB, intents []model.Intent) *repository.IntentRepository {
	t.Helper()
	repo := repository.NewIntentRepository(db)
	for i := range intents {
		if err := repo.Create(context.Background(), &intents[i]); err != nil {
			t.Fatalf("Create intent failed: %v", err)
		}
	}
	return repo
}

// seedCategories inserts test category records and returns the repo.
func seedCategories(t *testing.T, db *gorm.DB, categories []model.Category) *repository.CategoryRepository {
	t.Helper()
	repo := repository.NewCategoryRepository(db)
	for i := range categories {
		if err := repo.Create(context.Background(), &categories[i]); err != nil {
			t.Fatalf("Create category failed: %v", err)
		}
	}
	return repo
}

// seedEntityConfigs inserts test entity config records and returns the service.
func seedEntityConfigs(t *testing.T, db *gorm.DB, configs []model.EntityConfig) *EntityConfigService {
	t.Helper()
	repo := repository.NewEntityConfigRepository(db)
	for i := range configs {
		if err := repo.Create(context.Background(), &configs[i]); err != nil {
			t.Fatalf("Create entity config failed: %v", err)
		}
	}
	return NewEntityConfigService(repo)
}

// ---------------------------------------------------------------------------
// TestIntent - keyword matching
// ---------------------------------------------------------------------------

func TestDebugService_TestIntent_MatchPriceQuery(t *testing.T) {
	db := setupDebugTestDB(t)

	intentRepo := seedIntents(t, db, []model.Intent{
		{IntentCode: "price_query", IntentName: "价格查询", Keywords: pq.StringArray{"价格", "多少钱"}, Priority: 10, IsActive: true},
		{IntentCode: "tender", IntentName: "招标查询", Keywords: pq.StringArray{"招标", "采购"}, Priority: 5, IsActive: true},
	})
	categoryRepo := seedCategories(t, db, []model.Category{
		{Name: "螺纹钢", Type: "spot", Status: "enabled"},
	})
	entityConfigService := seedEntityConfigs(t, db, []model.EntityConfig{
		{EntityType: "region", EntityValue: "上海"},
	})

	ds := &DebugService{
		intentRepo:         intentRepo,
		categoryRepo:       categoryRepo,
		entityConfigService: entityConfigService,
	}

	result, err := ds.TestIntent(context.Background(), "上海螺纹钢多少钱一吨")
	if err != nil {
		t.Fatalf("TestIntent failed: %v", err)
	}
	if result.Intent.Code != "price_query" {
		t.Errorf("expected intent_code 'price_query', got '%s'", result.Intent.Code)
	}
	if result.Intent.Name != "价格查询" {
		t.Errorf("expected intent_name '价格查询', got '%s'", result.Intent.Name)
	}
	if result.Intent.Confidence <= 0 {
		t.Errorf("expected confidence > 0, got %f", result.Intent.Confidence)
	}
	if result.MatchMethod != "keyword" {
		t.Errorf("expected match_method 'keyword', got '%s'", result.MatchMethod)
	}
	// "价格" and "多少钱" both match, so at least 1 keyword
	if len(result.MatchedKeywords) == 0 {
		t.Errorf("expected at least 1 matched keyword, got none")
	}
}

func TestDebugService_TestIntent_NoMatch(t *testing.T) {
	db := setupDebugTestDB(t)

	intentRepo := seedIntents(t, db, []model.Intent{
		{IntentCode: "price_query", IntentName: "价格查询", Keywords: pq.StringArray{"价格", "多少钱"}, Priority: 10, IsActive: true},
	})
	categoryRepo := seedCategories(t, db, nil)
	entityConfigService := seedEntityConfigs(t, db, nil)

	ds := &DebugService{
		intentRepo:         intentRepo,
		categoryRepo:       categoryRepo,
		entityConfigService: entityConfigService,
	}

	result, err := ds.TestIntent(context.Background(), "今天天气怎么样")
	if err != nil {
		t.Fatalf("TestIntent failed: %v", err)
	}
	if result.Intent.Code != "unknown" {
		t.Errorf("expected 'unknown' intent_code, got '%s'", result.Intent.Code)
	}
	if result.Intent.Name != "未识别意图" {
		t.Errorf("expected intent_name '未识别意图', got '%s'", result.Intent.Name)
	}
	if result.Intent.Confidence != 0 {
		t.Errorf("expected confidence 0, got %f", result.Intent.Confidence)
	}
}

func TestDebugService_TestIntent_HigherPriorityWins(t *testing.T) {
	db := setupDebugTestDB(t)

	// Both match "价格" keyword, but price_query has higher priority.
	// Since matching is based on keyword score (count of matched keywords),
	// not priority, both will have score=1. The first one with highest score wins.
	// Let me check the algorithm: it iterates in order, and "if score > bestScore" (strict greater).
	// The intents are returned by FindAll ordered by "priority DESC, id ASC".
	intentRepo := seedIntents(t, db, []model.Intent{
		{IntentCode: "price_query", IntentName: "价格查询", Keywords: pq.StringArray{"价格", "多少钱"}, Priority: 10, IsActive: true},
		{IntentCode: "trend", IntentName: "走势查询", Keywords: pq.StringArray{"价格", "走势"}, Priority: 3, IsActive: true},
	})
	categoryRepo := seedCategories(t, db, nil)
	entityConfigService := seedEntityConfigs(t, db, nil)

	ds := &DebugService{
		intentRepo:         intentRepo,
		categoryRepo:       categoryRepo,
		entityConfigService: entityConfigService,
	}

	// "价格" matches both, score=1 for both. First one (price_query, higher priority in sort)
	// wins because we use strict greater comparison.
	result, err := ds.TestIntent(context.Background(), "价格")
	if err != nil {
		t.Fatalf("TestIntent failed: %v", err)
	}
	if result.Intent.Code != "price_query" {
		t.Errorf("expected 'price_query' (first in priority order), got '%s'", result.Intent.Code)
	}
}

func TestDebugService_TestIntent_BetterScoreWins(t *testing.T) {
	db := setupDebugTestDB(t)

	intentRepo := seedIntents(t, db, []model.Intent{
		{IntentCode: "price_query", IntentName: "价格查询", Keywords: pq.StringArray{"价格"}, Priority: 3, IsActive: true},
		{IntentCode: "tender", IntentName: "招标查询", Keywords: pq.StringArray{"招标", "采购", "价格"}, Priority: 10, IsActive: true},
	})
	categoryRepo := seedCategories(t, db, nil)
	entityConfigService := seedEntityConfigs(t, db, nil)

	ds := &DebugService{
		intentRepo:         intentRepo,
		categoryRepo:       categoryRepo,
		entityConfigService: entityConfigService,
	}

	// "价格" and "采购" are in the text, matching 1 keyword from price_query (score=1)
	// and 2 keywords from tender (score=2: "价格" + "采购"). tender should win.
	result, err := ds.TestIntent(context.Background(), "查询采购价格")
	if err != nil {
		t.Fatalf("TestIntent failed: %v", err)
	}
	if result.Intent.Code != "tender" {
		t.Errorf("expected 'tender' (more keyword matches), got '%s'", result.Intent.Code)
	}
}

func TestDebugService_TestIntent_InactiveIntent(t *testing.T) {
	db := setupDebugTestDB(t)

	intentRepo := seedIntents(t, db, []model.Intent{
		{IntentCode: "price_query", IntentName: "价格查询", Keywords: pq.StringArray{"价格"}, Priority: 10, IsActive: true},
		{IntentCode: "tender", IntentName: "招标查询", Keywords: pq.StringArray{"价格"}, Priority: 5, IsActive: true},
	})
	// GORM skips zero-value fields (false) on Create when model has gorm:"default:true".
	// Use explicit Update to set IsActive=false for price_query.
	if err := db.Model(&model.Intent{}).Where("intent_code = ?", "price_query").Update("is_active", false).Error; err != nil {
		t.Fatalf("Update is_active failed: %v", err)
	}

	categoryRepo := seedCategories(t, db, nil)
	entityConfigService := seedEntityConfigs(t, db, nil)

	ds := &DebugService{
		intentRepo:         intentRepo,
		categoryRepo:       categoryRepo,
		entityConfigService: entityConfigService,
	}

	// price_query is inactive, so tender should be selected even though price_query has higher priority
	result, err := ds.TestIntent(context.Background(), "价格")
	if err != nil {
		t.Fatalf("TestIntent failed: %v", err)
	}
	if result.Intent.Code != "tender" {
		t.Errorf("expected 'tender' (only active matching intent), got '%s'", result.Intent.Code)
	}
}

func TestDebugService_TestIntent_ConfidenceCalculation(t *testing.T) {
	db := setupDebugTestDB(t)

	intentRepo := seedIntents(t, db, []model.Intent{
		{IntentCode: "price_query", IntentName: "价格查询", Keywords: pq.StringArray{"价格", "多少钱", "报价", "行情"}, Priority: 10, IsActive: true},
	})
	categoryRepo := seedCategories(t, db, nil)
	entityConfigService := seedEntityConfigs(t, db, nil)

	ds := &DebugService{
		intentRepo:         intentRepo,
		categoryRepo:       categoryRepo,
		entityConfigService: entityConfigService,
	}

	// Match 2 out of 4 keywords: confidence = 2/(4+1) = 2/5 = 0.4
	result, err := ds.TestIntent(context.Background(), "价格多少钱")
	if err != nil {
		t.Fatalf("TestIntent failed: %v", err)
	}
	expectedConf := 2.0 / 5.0 // 2 matches / (4 keywords + 1)
	if result.Intent.Confidence != expectedConf {
		t.Errorf("expected confidence %f, got %f", expectedConf, result.Intent.Confidence)
	}
}

// ---------------------------------------------------------------------------
// extractEntities - entity extraction
// ---------------------------------------------------------------------------

func TestDebugService_extractEntities_RegionFromDB(t *testing.T) {
	db := setupDebugTestDB(t)

	categoryRepo := seedCategories(t, db, []model.Category{
		// Create child categories so FindEnabledNames returns them
		{Name: "长材", Type: "spot", Status: "enabled"},
	})
	// Add children under "长材"
	parentCat := model.Category{Name: "长材", Type: "spot", Status: "enabled"}
	db.First(&parentCat, "name = ?", "长材")
	children := []model.Category{
		{Name: "螺纹钢", Type: "spot", Status: "enabled", ParentID: &parentCat.ID},
		{Name: "线材", Type: "spot", Status: "enabled", ParentID: &parentCat.ID},
	}
	for i := range children {
		if err := categoryRepo.Create(context.Background(), &children[i]); err != nil {
			t.Fatalf("Create child category failed: %v", err)
		}
	}

	entityConfigService := seedEntityConfigs(t, db, []model.EntityConfig{
		{EntityType: "region", EntityValue: "上海"},
		{EntityType: "region", EntityValue: "北京"},
		{EntityType: "region", EntityValue: "广州"},
	})

	ds := &DebugService{
		categoryRepo:       categoryRepo,
		entityConfigService: entityConfigService,
	}

	entities := ds.extractEntities(context.Background(), "上海螺纹钢多少钱")

	hasRegion := false
	hasCategory := false
	for _, e := range entities {
		if e.Key == "region" && e.Value == "上海" {
			hasRegion = true
		}
		if e.Key == "category" && e.Value == "螺纹钢" {
			hasCategory = true
		}
	}
	if !hasRegion {
		t.Errorf("expected region entity '上海', but not found in %+v", entities)
	}
	if !hasCategory {
		t.Errorf("expected category entity '螺纹钢', but not found in %+v", entities)
	}
}

func TestDebugService_extractEntities_RegionFallback(t *testing.T) {
	db := setupDebugTestDB(t)

	categoryRepo := seedCategories(t, db, nil)
	// No entity configs seeded, so GetRegions returns error/empty, triggering fallback
	entityConfigService := seedEntityConfigs(t, db, nil)

	ds := &DebugService{
		categoryRepo:       categoryRepo,
		entityConfigService: entityConfigService,
	}

	// The fallback region list includes "北京"
	entities := ds.extractEntities(context.Background(), "北京冷轧价格")

	hasRegion := false
	for _, e := range entities {
		if e.Key == "region" && e.Value == "北京" {
			hasRegion = true
		}
	}
	if !hasRegion {
		t.Errorf("expected region entity '北京' from fallback list, but not found in %+v", entities)
	}
}

func TestDebugService_extractEntities_NoRegionInText(t *testing.T) {
	db := setupDebugTestDB(t)

	categoryRepo := seedCategories(t, db, nil)
	entityConfigService := seedEntityConfigs(t, db, []model.EntityConfig{
		{EntityType: "region", EntityValue: "上海"},
		{EntityType: "region", EntityValue: "北京"},
	})

	ds := &DebugService{
		categoryRepo:       categoryRepo,
		entityConfigService: entityConfigService,
	}

	// Text does not contain any region name
	entities := ds.extractEntities(context.Background(), "热卷多少钱")

	for _, e := range entities {
		if e.Key == "region" {
			t.Errorf("unexpected region entity '%s' when no region in text", e.Value)
		}
	}
}

// ---------------------------------------------------------------------------
// TestIntent integration with entity extraction
// ---------------------------------------------------------------------------

func TestDebugService_TestIntent_EntitiesIncluded(t *testing.T) {
	db := setupDebugTestDB(t)

	intentRepo := seedIntents(t, db, []model.Intent{
		{IntentCode: "price_query", IntentName: "价格查询", Keywords: pq.StringArray{"价格"}, Priority: 10, IsActive: true},
	})
	categoryRepo := seedCategories(t, db, nil)
	entityConfigService := seedEntityConfigs(t, db, []model.EntityConfig{
		{EntityType: "region", EntityValue: "广州"},
	})

	ds := &DebugService{
		intentRepo:         intentRepo,
		categoryRepo:       categoryRepo,
		entityConfigService: entityConfigService,
	}

	result, err := ds.TestIntent(context.Background(), "广州螺纹钢价格")
	if err != nil {
		t.Fatalf("TestIntent failed: %v", err)
	}
	if result.Intent.Code != "price_query" {
		t.Fatalf("expected 'price_query', got '%s'", result.Intent.Code)
	}
	if len(result.Entities) == 0 {
		t.Errorf("expected entities in result, got none")
	}
	// "广州" is a region from DB configs
	hasRegion := false
	for _, e := range result.Entities {
		if e.Key == "region" && e.Value == "广州" {
			hasRegion = true
		}
	}
	if !hasRegion {
		t.Errorf("expected '广州' region entity in result, got %+v", result.Entities)
	}
}
