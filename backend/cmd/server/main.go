package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"steel-agent-backend/internal/config"
	"steel-agent-backend/internal/handler"
	"steel-agent-backend/internal/repository"
	"steel-agent-backend/internal/router"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/ai"

	"github.com/gin-gonic/gin"
)

const version = "1.0.0"

func main() {
	config.Load()
	cfg := config.AppConfig

	if cfg.APPEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	db := config.InitDB()
	redisClient := config.InitRedis()

	// --- Repositories ---
	userRepo := repository.NewUserRepository(db)
	adminRepo := repository.NewAdminRepository(db)
	adminLogRepo := repository.NewAdminLogRepository(db)
	adminNotifRepo := repository.NewAdminNotificationRepository(db)
	adminSettingsRepo := repository.NewAdminSettingsRepository(db)
	agentConfigRepo := repository.NewAgentConfigRepository(db)
	apiCallLogRepo := repository.NewApiCallLogRepository(db)
	badCaseRepo := repository.NewBadCaseRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	chatRepo := repository.NewChatRepository(db)
	crawlerLogRepo := repository.NewCrawlerLogRepository(db)
	crawlerSourceRepo := repository.NewCrawlerSourceRepository(db)
	intentRepo := repository.NewIntentRepository(db)
	entityConfigRepo := repository.NewEntityConfigRepository(db)
	knowledgeRepo := repository.NewKnowledgeRepository(db)
	loginLogRepo := repository.NewLoginLogRepository(db)
	menuRepo := repository.NewMenuRepository(db)
	mobileRoleRepo := repository.NewMobileRoleRepository(db)
	newsRepo := repository.NewNewsRepository(db)
	notificationRepo := repository.NewNotificationRepository(db)
	priceAlertRepo := repository.NewPriceAlertRepository(db)
	quotationRepo := repository.NewQuotationRepository(db)
	scheduledTaskRepo := repository.NewScheduledTaskRepository(db)
	settingsRepo := repository.NewSettingsRepository(db)
	steelPriceRepo := repository.NewSteelPriceRepository(db)
	taskExecLogRepo := repository.NewTaskExecutionLogRepository(db)
	tenderRepo := repository.NewTenderRepository(db)
	tokenUsageRepo := repository.NewTokenUsageRepository(db)
	userFavoriteRepo := repository.NewUserFavoriteRepository(db)
	certificationRepo := repository.NewUserCertificationRepository(db)
	feedbackRepo := repository.NewUserFeedbackRepository(db)

	// --- AI Adapter ---
	llmAdapter := ai.NewAdapter()
	primary, fallbacks := ai.ModelConfigFromEnv()
	llmAdapter.ConfigureModels(primary, fallbacks)
	if cfg.EmbeddingAPIKey != "" {
		llmAdapter.SetEmbeddingConfig(&ai.ModelConfig{
			Name:    "embedding",
			APIKey:  cfg.EmbeddingAPIKey,
			BaseURL: cfg.EmbeddingBaseURL,
			Model:   "text-embedding-3-small",
		})
	}

	// --- Core Services ---
	cacheService := service.NewCacheService(db, redisClient)
	cleanupService := service.NewCleanupService(db)
	backupService := service.NewBackupService("/app/backups", adminSettingsRepo)

	// --- Business Services ---
	authService := service.NewAuthService(userRepo, redisClient, adminSettingsRepo)
	userService := service.NewUserService(userRepo)
	loginLogService := service.NewLoginLogService(loginLogRepo)
	priceService := service.NewPriceService(steelPriceRepo, newsRepo, cacheService)
	quotationService := service.NewQuotationService(quotationRepo, steelPriceRepo)
	knowledgeService := service.NewKnowledgeService(knowledgeRepo, llmAdapter, db)
	tenderService := service.NewTenderService(tenderRepo, userFavoriteRepo)
	alertService := service.NewAlertService(priceAlertRepo)
	notificationService := service.NewNotificationService(notificationRepo)
	settingsService := service.NewSettingsService(settingsRepo)
	adminService := service.NewAdminService(adminRepo, userRepo)
	adminLogService := service.NewAdminLogService(adminLogRepo)
	adminNotifService := service.NewAdminNotificationService(adminNotifRepo)
	adminSettingsService := service.NewAdminSettingsService(adminSettingsRepo)
	crawlerService := service.NewCrawlerService(db, crawlerSourceRepo, crawlerLogRepo, steelPriceRepo, newsRepo, tenderRepo, categoryRepo, cacheService)
	agentConfigService := service.NewAgentConfigService(agentConfigRepo, categoryRepo)
	categoryService := service.NewCategoryService(categoryRepo, steelPriceRepo)
	intentService := service.NewIntentService(intentRepo)
	entityConfigService := service.NewEntityConfigService(entityConfigRepo)
	tokenUsageService := service.NewTokenUsageService(tokenUsageRepo)
	menuService := service.NewMenuService(menuRepo)
	mobileRoleService := service.NewMobileRoleService(mobileRoleRepo, userRepo)
	apiCallLogService := service.NewApiCallLogService(apiCallLogRepo, tokenUsageRepo)
	scheduledTaskService := service.NewScheduledTaskService(scheduledTaskRepo, taskExecLogRepo, cleanupService, backupService, crawlerService)
	certificationService := service.NewCertificationService(certificationRepo, userRepo)
	feedbackService := service.NewFeedbackService(feedbackRepo)

	badCaseService := service.NewBadCaseService(badCaseRepo, nil)
	chatService := service.NewChatService(chatRepo, llmAdapter, agentConfigService, steelPriceRepo, quotationRepo, knowledgeRepo, knowledgeService, tenderRepo, priceAlertRepo, newsRepo, categoryRepo, badCaseService, intentRepo, tokenUsageRepo, entityConfigService)
	badCaseService.SetChatService(chatService)

	debugService := service.NewDebugService(chatService, intentRepo, agentConfigService, chatRepo, categoryRepo, entityConfigService, redisClient)

	// --- Handlers ---
	healthHandler := handler.NewHealthHandler(db, redisClient, version)
	authHandler := handler.NewAuthHandler(authService, loginLogService)
	userHandler := handler.NewUserHandler(userService)
	priceHandler := handler.NewPriceHandler(priceService)
	quotationHandler := handler.NewQuotationHandler(quotationService)
	knowledgeHandler := handler.NewKnowledgeHandler(knowledgeService)
	tenderHandler := handler.NewTenderHandler(tenderService)
	alertHandler := handler.NewAlertHandler(alertService)
	chatHandler := handler.NewChatHandler(chatService)
	adminHandler := handler.NewAdminHandler(adminService, menuService, loginLogService)
	notificationHandler := handler.NewNotificationHandler(notificationService)
	settingsHandler := handler.NewSettingsHandler(settingsService)
	adminKnowledgeHandler := handler.NewAdminKnowledgeHandler(knowledgeService)
	crawlerHandler := handler.NewCrawlerHandler(crawlerService, crawlerSourceRepo, crawlerLogRepo)
	agentConfigHandler := handler.NewAgentConfigHandler(agentConfigService)
	categoryHandler := handler.NewCategoryHandler(categoryService)
	adminNotifHandler := handler.NewAdminNotificationHandler(adminNotifService)
	debugHandler := handler.NewDebugHandler(debugService)
	intentHandler := handler.NewIntentHandler(intentService)
	entityConfigHandler := handler.NewEntityConfigHandler(entityConfigService)
	badCaseHandler := handler.NewBadCaseHandler(badCaseService)
	backupHandler := handler.NewBackupHandler(backupService)
	adminLogHandler := handler.NewAdminLogHandler(adminLogService)
	tokenUsageHandler := handler.NewTokenUsageHandler(tokenUsageService)
	mobileRoleHandler := handler.NewMobileRoleHandler(mobileRoleService)
	scheduledTaskHandler := handler.NewScheduledTaskHandler(scheduledTaskService)
	apiStatsHandler := handler.NewApiStatsHandler(apiCallLogService)
	loginLogHandler := handler.NewLoginLogHandler(loginLogService)
	menuHandler := handler.NewMenuHandler(menuService)
	adminSettingsHandler := handler.NewAdminSettingsHandler(adminSettingsService)
	certificationHandler := handler.NewCertificationHandler(certificationService)
	adminCertificationHandler := handler.NewAdminCertificationHandler(certificationService)
	feedbackHandler := handler.NewFeedbackHandler(feedbackService)

	// --- Router ---
	r := gin.New()
	r.Static("/uploads", "./uploads")
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
		intentHandler,
		badCaseHandler,
		backupHandler,
		adminLogHandler,
		tokenUsageHandler,
		mobileRoleHandler,
		scheduledTaskHandler,
		apiStatsHandler,
		loginLogHandler,
		menuHandler,
		adminSettingsHandler,
		certificationHandler,
		adminCertificationHandler,
		feedbackHandler,
		entityConfigHandler,
		adminRepo,
		adminLogRepo,
		apiCallLogRepo,
	)

	// --- Register scheduled tasks ---
	if err := scheduledTaskService.RegisterTasks(); err != nil {
		log.Printf("WARNING: Failed to register scheduled tasks: %v", err)
	}

	// --- HTTP Server ---
	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	go func() {
		log.Printf("Server starting on :%s (env=%s)", port, cfg.APPEnv)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// --- Graceful Shutdown ---
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server stopped")
}
