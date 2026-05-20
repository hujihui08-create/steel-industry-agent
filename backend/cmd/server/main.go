package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
	"time"

	"steel-agent-backend/internal/config"
	"steel-agent-backend/internal/handler"
	"steel-agent-backend/internal/repository"
	"steel-agent-backend/internal/router"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/ai"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func main() {
	config.Load()

	redisClient := config.InitRedis()

	db := config.InitDB()
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get database instance: %v", err)
	}
	defer sqlDB.Close()

	if err := runMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	userRepo := repository.NewUserRepository(db)
	steelPriceRepo := repository.NewSteelPriceRepository(db)
	quotationRepo := repository.NewQuotationRepository(db)
	tenderRepo := repository.NewTenderRepository(db)
	knowledgeRepo := repository.NewKnowledgeRepository(db)
	alertRepo := repository.NewPriceAlertRepository(db)
	newsRepo := repository.NewNewsRepository(db)
	notificationRepo := repository.NewNotificationRepository(db)
	settingsRepo := repository.NewSettingsRepository(db)
	userFavoriteRepo := repository.NewUserFavoriteRepository(db)
	chatRepo := repository.NewChatRepository(db)
	intentRepo := repository.NewIntentRepository(db)
	adminRepo := repository.NewAdminRepository(db)
	crawlerSourceRepo := repository.NewCrawlerSourceRepository(db)
	crawlerLogRepo := repository.NewCrawlerLogRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)

	cacheService := service.NewCacheService(db, redisClient)

	authService := service.NewAuthService(userRepo, redisClient)
	userService := service.NewUserService(userRepo)
	priceService := service.NewPriceService(steelPriceRepo, newsRepo, cacheService)
	quotationService := service.NewQuotationService(quotationRepo, steelPriceRepo)

	aiClient := ai.NewAdapter()

	knowledgeService := service.NewKnowledgeService(knowledgeRepo, aiClient, db)
	tenderService := service.NewTenderService(tenderRepo, userFavoriteRepo)
	alertService := service.NewAlertService(alertRepo)
	notificationService := service.NewNotificationService(notificationRepo)
	settingsService := service.NewSettingsService(settingsRepo)

	chatService := service.NewChatService(
		chatRepo,
		aiClient,
		steelPriceRepo,
		quotationRepo,
		knowledgeRepo,
		knowledgeService,
		tenderRepo,
		alertRepo,
		newsRepo,
		categoryRepo,
	)

	adminService := service.NewAdminService(adminRepo)

	agentConfigRepo := repository.NewAgentConfigRepository(db)
	agentConfigService := service.NewAgentConfigService(agentConfigRepo, categoryRepo)

	initModelConfigs(aiClient, agentConfigService)
	initEmbeddingConfig(aiClient, knowledgeService)

	adminLogRepo := repository.NewAdminLogRepository(db)
	adminNotifRepo := repository.NewAdminNotificationRepository(db)
	adminNotifService := service.NewAdminNotificationService(adminNotifRepo)
	adminNotifHandler := handler.NewAdminNotificationHandler(adminNotifService)

	crawlerService := service.NewCrawlerService(
		db,
		crawlerSourceRepo,
		crawlerLogRepo,
		steelPriceRepo,
		newsRepo,
		tenderRepo,
		categoryRepo,
		cacheService,
	)
	cleanupService := service.NewCleanupService(db)
	// 启动后台清理调度器
	go func() {
		cleanupService.StartScheduler(make(chan struct{}))
	}()

	// 启动数据库每日备份调度器
	backupDir := getEnvOrDefault("BACKUP_DIR", "./backups")
	backupService := service.NewBackupService(backupDir)
	go func() {
		backupService.StartScheduler(make(chan struct{}))
	}()

	// 版本号从环境变量读取，默认 "1.0.0"
	version := getEnvOrDefault("APP_VERSION", "1.0.0")
	healthHandler := handler.NewHealthHandler(db, redisClient, version)

	authHandler := handler.NewAuthHandler(authService)
	userHandler := handler.NewUserHandler(userService)
	priceHandler := handler.NewPriceHandler(priceService)
	quotationHandler := handler.NewQuotationHandler(quotationService)
	knowledgeHandler := handler.NewKnowledgeHandler(knowledgeService)
	tenderHandler := handler.NewTenderHandler(tenderService)
	alertHandler := handler.NewAlertHandler(alertService)
	chatHandler := handler.NewChatHandler(chatService)
	adminHandler := handler.NewAdminHandler(adminService)
	agentConfigHandler := handler.NewAgentConfigHandler(agentConfigService)
	notificationHandler := handler.NewNotificationHandler(notificationService)
	settingsHandler := handler.NewSettingsHandler(settingsService)
	adminKnowledgeHandler := handler.NewAdminKnowledgeHandler(knowledgeService)
	crawlerHandler := handler.NewCrawlerHandler(crawlerService, crawlerSourceRepo, crawlerLogRepo)

	debugService := service.NewDebugService(chatService, intentRepo, agentConfigService, chatRepo, redisClient)
	debugHandler := handler.NewDebugHandler(debugService)

	categoryService := service.NewCategoryService(categoryRepo, steelPriceRepo)
	categoryHandler := handler.NewCategoryHandler(categoryService)

	r := gin.Default()

	router.Setup(
		r,
		healthHandler,
		authHandler,
		userHandler,
		priceHandler,
		quotationHandler,
		knowledgeHandler,
		tenderHandler,
		alertHandler,
		chatHandler,
		adminHandler,
		notificationHandler,
		settingsHandler,
		adminKnowledgeHandler,
		crawlerHandler,
		agentConfigHandler,
		categoryHandler,
		adminNotifHandler,
		debugHandler,
		adminRepo,
		adminLogRepo,
	)

	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	// 启动服务器（非阻塞）
	go func() {
		log.Println("Server starting on :8080")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// 等待中断信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// 30s 超时优雅关闭
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	// 关闭 Redis
	if redisClient != nil {
		redisClient.Close()
	}

	// 关闭数据库
	sqlDB.Close()

	log.Println("Server exited")
}

func runMigrations(db *gorm.DB) error {
	migrationsDir := "migrations"
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	var upFiles []string
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".up.sql") {
			upFiles = append(upFiles, e.Name())
		}
	}
	sort.Strings(upFiles)

	for _, name := range upFiles {
		path := filepath.Join(migrationsDir, name)
		sql, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read %s: %w", name, err)
		}
		if err := db.Exec(string(sql)).Error; err != nil {
			return fmt.Errorf("execute %s: %w", name, err)
		}
		log.Printf("Migration applied: %s", name)
	}
	return nil
}

// getEnvOrDefault returns the value of the environment variable named by key,
// or fallback if the variable is not set or empty.
func getEnvOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// initModelConfigs loads AI model configurations from the agent config database
// and applies them to the LLM adapter. Falls back to environment variables if
// no agent config exists.
func initModelConfigs(adapter *ai.LLMAdapter, cfgSvc *service.AgentConfigService) {
	ctx := context.Background()
	cfg, err := cfgSvc.GetAgentConfig(ctx)
	if err != nil || len(cfg.Models) == 0 {
		primary, fallbacks := ai.ModelConfigFromEnv()
		adapter.ConfigureModels(primary, fallbacks)
		return
	}

	// Configure primary model.
	primaryMC := resolveModelConfig(cfg.PrimaryModel, cfg.Models)

	// Collect fallback model configs.
	var fallbackMCs []ai.ModelConfig
	if cfg.BackupModel != "" {
		for _, m := range cfg.Models {
			if m.ID == cfg.BackupModel {
				fallbackMCs = append(fallbackMCs, ai.ModelConfig{
					Name:    m.ID,
					APIKey:  resolveAPIKey(m.APIKey),
					BaseURL: m.BaseURL,
					Model:   m.Name,
				})
				break
			}
		}
	}

	adapter.ConfigureModels(primaryMC, fallbackMCs)
}

// resolveModelConfig finds the primary model config by ID, falling back to the
// first entry or environment variables.
func resolveModelConfig(modelID string, models []service.ModelConfigDO) ai.ModelConfig {
	for _, m := range models {
		if m.ID == modelID {
			return ai.ModelConfig{
				Name:    m.ID,
				APIKey:  resolveAPIKey(m.APIKey),
				BaseURL: m.BaseURL,
				Model:   m.Name,
			}
		}
	}
	if len(models) > 0 {
		m := models[0]
		return ai.ModelConfig{
			Name:    m.ID,
			APIKey:  resolveAPIKey(m.APIKey),
			BaseURL: m.BaseURL,
			Model:   m.Name,
		}
	}
	primary, _ := ai.ModelConfigFromEnv()
	return primary
}

// resolveAPIKey returns the provided key if non-empty, otherwise falls back to
// the OPENAI_API_KEY environment variable.
func resolveAPIKey(key string) string {
	if key != "" {
		return key
	}
	return os.Getenv("OPENAI_API_KEY")
}

// initEmbeddingConfig sets up the embedding model configuration on the adapter.
// Priority: RAG config DB > env vars > fallback to primary LLM model config.
func initEmbeddingConfig(adapter *ai.LLMAdapter, knowledgeSvc *service.KnowledgeService) {
	ctx := context.Background()

	ragCfg := knowledgeSvc.GetRAGConfig(ctx)
	if ragCfg != nil && ragCfg.EmbeddingAPIKey != "" {
		baseURL := ragCfg.EmbeddingBaseURL
		if baseURL == "" {
			baseURL = "https://api.openai.com/v1"
		}
		adapter.SetEmbeddingConfig(&ai.ModelConfig{
			Name:    ragCfg.EmbeddingModel,
			APIKey:  ragCfg.EmbeddingAPIKey,
			BaseURL: baseURL,
		})
		return
	}

	envCfg := config.AppConfig
	if envCfg.EmbeddingAPIKey == "" {
		return
	}

	baseURL := envCfg.EmbeddingBaseURL
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}

	adapter.SetEmbeddingConfig(&ai.ModelConfig{
		Name:    "embedding",
		APIKey:  envCfg.EmbeddingAPIKey,
		BaseURL: baseURL,
	})
}
