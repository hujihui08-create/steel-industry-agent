package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"steel-agent-backend/internal/config"
	"steel-agent-backend/internal/repository"
	"steel-agent-backend/internal/service"
)

func main() {
	config.Load()

	db := config.InitDB()
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get database instance: %v", err)
	}
	defer sqlDB.Close()

	sourceRepo := repository.NewCrawlerSourceRepository(db)
	logRepo := repository.NewCrawlerLogRepository(db)
	priceRepo := repository.NewSteelPriceRepository(db)
	newsRepo := repository.NewNewsRepository(db)
	tenderRepo := repository.NewTenderRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)

	redisClient := config.InitRedis()
	cacheService := service.NewCacheService(db, redisClient)

	crawlerService := service.NewCrawlerService(
		db,
		sourceRepo,
		logRepo,
		priceRepo,
		newsRepo,
		tenderRepo,
		categoryRepo,
		cacheService,
	)

	cleanupService := service.NewCleanupService(db)

	crawlerService.StartScheduler()
	cleanupService.StartScheduler(make(chan struct{}))

	log.Println("Crawler service started with scheduler")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Crawler service shutting down...")
	crawlerService.Stop()
}
