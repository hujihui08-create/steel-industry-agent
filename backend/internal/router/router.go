package router

import (
	"steel-agent-backend/internal/config"
	"steel-agent-backend/internal/handler"
	"steel-agent-backend/internal/middleware"
	"steel-agent-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func Setup(
	r *gin.Engine,
	healthHandler *handler.HealthHandler,
	authHandler *handler.AuthHandler,
	userHandler *handler.UserHandler,
	priceHandler *handler.PriceHandler,
	quotationHandler *handler.QuotationHandler,
	knowledgeHandler *handler.KnowledgeHandler,
	tenderHandler *handler.TenderHandler,
	alertHandler *handler.AlertHandler,
	chatHandler *handler.ChatHandler,
	adminHandler *handler.AdminHandler,
	notificationHandler *handler.NotificationHandler,
	settingsHandler *handler.SettingsHandler,
	adminKnowledgeHandler *handler.AdminKnowledgeHandler,
	crawlerHandler *handler.CrawlerHandler,
	agentConfigHandler *handler.AgentConfigHandler,
	categoryHandler *handler.CategoryHandler,
	adminNotifHandler *handler.AdminNotificationHandler,
	debugHandler *handler.DebugHandler,
	intentHandler *handler.IntentHandler,
	badCaseHandler *handler.BadCaseHandler,
	backupHandler *handler.BackupHandler,
	adminLogHandler *handler.AdminLogHandler,
	tokenUsageHandler *handler.TokenUsageHandler,
	mobileRoleHandler *handler.MobileRoleHandler,
	scheduledTaskHandler *handler.ScheduledTaskHandler,
	apiStatsHandler *handler.ApiStatsHandler,
	loginLogHandler *handler.LoginLogHandler,
	menuHandler *handler.MenuHandler,
	adminRepo *repository.AdminRepository,
	adminLogRepo *repository.AdminLogRepository,
	apiCallLogRepo *repository.ApiCallLogRepository,
) {
	// Health check routes — registered before any middleware so that
	// orchestrators can probe liveness/readiness without interference.
	r.GET("/live", healthHandler.Liveness)
	r.GET("/ready", healthHandler.Readiness)
	r.GET("/health", healthHandler.Health)

	r.GET("/api/v1/categories", categoryHandler.GetPublicCategories)

	r.Use(middleware.CORS())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger())
	r.Use(middleware.RateLimit(100, 200))

	api := r.Group("/api/v1")
	api.Use(middleware.ApiCallLog(apiCallLogRepo))

	auth := api.Group("/auth")
	{
		auth.POST("/sms-code", authHandler.GetSMSCode)
		auth.POST("/login", authHandler.Login)
		auth.POST("/login-password", authHandler.LoginPassword)
		auth.POST("/register", authHandler.Register)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/logout", authHandler.Logout)
	}

	adminAuth := api.Group("/admin/auth")
	{
		adminAuth.POST("/login", adminHandler.Login)
		adminAuth.POST("/logout", adminHandler.Logout)
	}

	api.Use(middleware.Auth())

	users := api.Group("/users")
	{
		users.GET("/profile", userHandler.GetProfile)
		users.PUT("/profile", userHandler.UpdateProfile)
		users.PUT("/password", userHandler.UpdatePassword)
		users.GET("/token-usage", tokenUsageHandler.GetDailyUsage)
	}

	prices := api.Group("/prices")
	{
		prices.GET("", priceHandler.GetPriceList)
		prices.GET("/latest", priceHandler.GetLatestPrice)
		prices.GET("/trend", priceHandler.GetPriceTrend)
		prices.GET("/compare", priceHandler.ComparePrices)
	}

	quotations := api.Group("/quotations")
	{
		quotations.POST("/calculate", quotationHandler.CalculateQuotation)
		quotations.POST("", quotationHandler.CreateQuotation)
		quotations.GET("", quotationHandler.GetQuotationList)
		quotations.GET("/:id", quotationHandler.GetQuotationDetail)
		quotations.PUT("/:id", quotationHandler.UpdateQuotation)
		quotations.DELETE("/:id", quotationHandler.DeleteQuotation)
		quotations.GET("/:id/pdf", quotationHandler.ExportPDF)
	}

	knowledge := api.Group("/knowledge")
	{
		knowledge.GET("/search", knowledgeHandler.SearchKnowledge)
	}

	standards := api.Group("/standards")
	{
		standards.GET("", knowledgeHandler.GetStandardList)
		standards.GET("/:id", knowledgeHandler.GetStandardDetail)
	}

	grades := api.Group("/grades")
	{
		grades.GET("/compare", knowledgeHandler.CompareGrades)
	}

	terms := api.Group("/terms")
	{
		terms.GET("", knowledgeHandler.GetTermList)
		terms.GET("/:id", knowledgeHandler.GetTermDetail)
	}

	tools := api.Group("/tools")
	{
		tools.POST("/weight", knowledgeHandler.CalculateWeight)
		tools.POST("/convert", knowledgeHandler.ConvertUnit)
	}

	tenders := api.Group("/tenders")
	{
		tenders.GET("", tenderHandler.GetTenderList)
		tenders.GET("/favorites", tenderHandler.GetFavorites)
		tenders.GET("/:id", tenderHandler.GetTenderDetail)
		tenders.POST("/favorites", tenderHandler.AddFavorite)
		tenders.DELETE("/favorites/:id", tenderHandler.RemoveFavorite)
		tenders.POST("/:id/favorite", tenderHandler.AddFavoriteByID)
		tenders.DELETE("/:id/favorite", tenderHandler.RemoveFavoriteByID)
		tenders.GET("/recommend", tenderHandler.GetRecommend)
	}

	alerts := api.Group("/alerts")
	{
		alerts.POST("", alertHandler.CreateAlert)
		alerts.GET("", alertHandler.GetAlertList)
		alerts.PUT("/:id", alertHandler.UpdateAlert)
		alerts.DELETE("/:id", alertHandler.DeleteAlert)
	}

	chat := api.Group("/chat")
	{
		chat.POST("/completions", chatHandler.ChatCompletions)
		chat.GET("/sessions", chatHandler.GetChatSessions)
		chat.POST("/stop", chatHandler.StopGeneration)
		chat.POST("/continue", chatHandler.ContinueGeneration)
		chat.POST("/feedback", chatHandler.SubmitFeedback)
		chat.DELETE("/sessions/:id", chatHandler.DeleteSession)
		chat.GET("/sessions/:id/messages", chatHandler.GetSessionMessages)
	}

	notifications := api.Group("/notifications")
	{
		notifications.GET("", notificationHandler.GetNotifications)
		notifications.PUT("/:id/read", notificationHandler.MarkAsRead)
	}

	settings := api.Group("/settings")
	{
		settings.GET("", settingsHandler.GetSettings)
		settings.PUT("", settingsHandler.UpdateSettings)
	}

	api.GET("/news", priceHandler.GetNewsList)
	api.GET("/news/:id", priceHandler.GetNewsDetail)

	api.GET("/reports/daily", priceHandler.GetDailyReport)
	api.GET("/reports/weekly", priceHandler.GetWeeklyReport)

	api.GET("/calendar", tenderHandler.GetCalendar)

	adminDashboard := api.Group("/admin")
	adminDashboard.Use(middleware.RequireRole(adminRepo, "super_admin", "operator", "data_admin", "viewer"))
	{
		adminDashboard.GET("/dashboard", adminHandler.Dashboard)
		adminDashboard.GET("/dashboard/trend", adminHandler.DashboardTrend)
	}

	adminProtectedAuth := api.Group("/admin/auth")
	{
		adminProtectedAuth.GET("/info", adminHandler.GetInfo)
		adminProtectedAuth.PUT("/password", adminHandler.UpdatePassword)
		adminProtectedAuth.PUT("/profile", adminHandler.UpdateProfile)
	}

	adminUsers := api.Group("/admin/users")
	adminUsers.Use(middleware.RequireRole(adminRepo, "super_admin", "operator"))
	adminUsers.Use(middleware.AdminLog(adminLogRepo))
	{
		adminUsers.GET("", adminHandler.ListAdmins)
		adminUsers.POST("", adminHandler.CreateAdmin)
		adminUsers.PUT("/:id", adminHandler.UpdateAdmin)
		adminUsers.DELETE("/:id", adminHandler.DeleteAdmin)
	}

	adminNotifs := api.Group("/admin/notifications")
	{
		adminNotifs.GET("", adminNotifHandler.ListNotifications)
		adminNotifs.GET("/unread-count", adminNotifHandler.CountUnread)
		adminNotifs.PUT("/:id/read", adminNotifHandler.MarkAsRead)
		adminNotifs.PUT("/read-all", adminNotifHandler.MarkAllAsRead)
	}

	adminKnowledge := api.Group("/admin/knowledge")
	adminKnowledge.Use(middleware.RequireRole(adminRepo, "super_admin", "operator", "data_admin"))
	{
		adminKnowledge.GET("", adminKnowledgeHandler.ListKnowledge)
		adminKnowledge.POST("", adminKnowledgeHandler.CreateKnowledge)
		adminKnowledge.GET("/stats", adminKnowledgeHandler.GetStats)
		adminKnowledge.GET("/:id", adminKnowledgeHandler.GetKnowledgeDetail)
		adminKnowledge.PUT("/:id", adminKnowledgeHandler.UpdateKnowledge)
		adminKnowledge.DELETE("/:id", adminKnowledgeHandler.DeleteKnowledge)
		adminKnowledge.POST("/:id/vectorize", adminKnowledgeHandler.TriggerVectorization)
		adminKnowledge.POST("/batch-import", adminKnowledgeHandler.BatchImport)
	}

	adminRAG := api.Group("/admin/rag")
	adminRAG.Use(middleware.RequireRole(adminRepo, "super_admin", "operator", "data_admin"))
	{
		adminRAG.POST("/test-search", adminKnowledgeHandler.TestSearch)
		adminRAG.GET("/search-history", adminKnowledgeHandler.GetSearchHistory)
		adminRAG.GET("/config", adminKnowledgeHandler.GetRAGConfig)
		adminRAG.PUT("/config", adminKnowledgeHandler.UpdateRAGConfig)
	}

	adminCrawler := api.Group("/admin/crawler")
	adminCrawler.Use(middleware.RequireRole(adminRepo, "super_admin", "operator", "data_admin"))
	{
		adminCrawler.GET("/sources", crawlerHandler.ListSources)
		adminCrawler.POST("/sources", crawlerHandler.CreateSource)
		adminCrawler.PUT("/sources/:id", crawlerHandler.UpdateSource)
		adminCrawler.DELETE("/sources/:id", crawlerHandler.DeleteSource)
		adminCrawler.GET("/logs", crawlerHandler.ListLogs)
		adminCrawler.POST("/trigger/:source_id", crawlerHandler.TriggerCrawl)
		adminCrawler.GET("/status", crawlerHandler.GetCrawlStatus)
	}

	adminPrices := api.Group("/admin/prices")
	adminPrices.Use(middleware.RequireRole(adminRepo, "super_admin", "operator", "data_admin"))
	{
		adminPrices.GET("", priceHandler.GetPriceList)
	}

	adminNews := api.Group("/admin/news")
	adminNews.Use(middleware.RequireRole(adminRepo, "super_admin", "operator", "data_admin"))
	{
		adminNews.GET("", priceHandler.GetNewsList)
	}

	adminTenders := api.Group("/admin/tenders")
	adminTenders.Use(middleware.RequireRole(adminRepo, "super_admin", "operator", "data_admin"))
	{
		adminTenders.GET("", tenderHandler.GetTenderList)
	}

	adminIntents := api.Group("/admin/intents")
	adminIntents.Use(middleware.RequireRole(adminRepo, "super_admin", "operator"))
	{
		adminIntents.GET("", intentHandler.List)
		adminIntents.POST("", intentHandler.Create)
		adminIntents.PUT("/:id", intentHandler.Update)
		adminIntents.DELETE("/:id", intentHandler.Delete)
		adminIntents.GET("/stats", intentHandler.Stats)
	}

	adminBadCases := api.Group("/admin/bad-cases")
	adminBadCases.Use(middleware.RequireRole(adminRepo, "super_admin", "operator"))
	{
		adminBadCases.GET("", badCaseHandler.List)
		adminBadCases.POST("", badCaseHandler.Create)
		adminBadCases.GET("/statistics", badCaseHandler.Statistics)
		adminBadCases.GET("/export", badCaseHandler.Export)
		adminBadCases.POST("/import", badCaseHandler.Import)
		adminBadCases.GET("/:id", badCaseHandler.GetByID)
		adminBadCases.PUT("/:id", badCaseHandler.Update)
		adminBadCases.DELETE("/:id", badCaseHandler.Delete)
		adminBadCases.POST("/:id/verify", badCaseHandler.Verify)
	}

	adminBackup := api.Group("/admin/backup")
	adminBackup.Use(middleware.RequireRole(adminRepo, "super_admin", "operator"))
	{
		adminBackup.GET("/overview", backupHandler.Overview)
		adminBackup.GET("/records", backupHandler.Records)
		adminBackup.POST("/trigger", backupHandler.Trigger)
		adminBackup.POST("/restore/:backupId", backupHandler.Restore)
		adminBackup.GET("/download/:backupId", backupHandler.Download)
		adminBackup.GET("/settings", backupHandler.GetSettings)
		adminBackup.PUT("/settings", backupHandler.UpdateSettings)
	}

	adminMobileUsers := api.Group("/admin/mobile-users")
	adminMobileUsers.Use(middleware.RequireRole(adminRepo, "super_admin", "operator"))
	{
		adminMobileUsers.GET("", adminHandler.ListMobileUsers)
		adminMobileUsers.GET("/retention", mobileRoleHandler.GetRetentionStats)
		adminMobileUsers.GET("/:id", adminHandler.GetMobileUserDetail)
		adminMobileUsers.PUT("/:id/disable", adminHandler.DisableMobileUser)
		adminMobileUsers.PUT("/:id/enable", adminHandler.EnableMobileUser)
		adminMobileUsers.GET("/export", adminHandler.ExportMobileUsers)
	}

	adminMobileRoles := api.Group("/admin/mobile-roles")
	adminMobileRoles.Use(middleware.RequireRole(adminRepo, "super_admin", "operator"))
	{
		adminMobileRoles.GET("", mobileRoleHandler.ListRoles)
		adminMobileRoles.POST("", mobileRoleHandler.CreateRole)
		adminMobileRoles.PUT("/:id", mobileRoleHandler.UpdateRole)
		adminMobileRoles.DELETE("/:id", mobileRoleHandler.DeleteRole)
		adminMobileRoles.GET("/permissions", mobileRoleHandler.GetPermissions)
		adminMobileRoles.PUT("/permissions", mobileRoleHandler.SavePermissions)
	}

	adminLogs := api.Group("/admin/logs")
	adminLogs.Use(middleware.RequireRole(adminRepo, "super_admin", "operator"))
	{
		adminLogs.GET("", adminLogHandler.List)
		adminLogs.GET("/:id", adminLogHandler.GetByID)
		adminLogs.GET("/export", adminLogHandler.Export)
	}

	adminScheduledTasks := api.Group("/admin/scheduled-tasks")
	adminScheduledTasks.Use(middleware.RequireRole(adminRepo, "super_admin", "operator"))
	{
		adminScheduledTasks.GET("", scheduledTaskHandler.List)
		adminScheduledTasks.POST("/trigger", scheduledTaskHandler.Trigger)
		adminScheduledTasks.GET("/logs", scheduledTaskHandler.Logs)
		adminScheduledTasks.POST("/toggle", scheduledTaskHandler.Toggle)
	}

	adminApiStats := api.Group("/admin/api-stats")
	adminApiStats.Use(middleware.RequireRole(adminRepo, "super_admin", "operator"))
	{
		adminApiStats.GET("/overview", apiStatsHandler.Overview)
		adminApiStats.GET("/endpoints", apiStatsHandler.EndpointStats)
		adminApiStats.GET("/models", apiStatsHandler.ModelStats)
		adminApiStats.GET("/users", apiStatsHandler.UserStats)
		adminApiStats.GET("/trend", apiStatsHandler.Trend)
	}

	adminLoginLogs := api.Group("/admin/login-logs")
	adminLoginLogs.Use(middleware.RequireRole(adminRepo, "super_admin", "operator"))
	{
		adminLoginLogs.GET("", loginLogHandler.List)
		adminLoginLogs.GET("/stats", loginLogHandler.Stats)
	}

	adminMenus := api.Group("/admin/menus")
	adminMenus.Use(middleware.RequireRole(adminRepo, "super_admin"))
	{
		adminMenus.GET("/tree", menuHandler.GetMenuTree)
		adminMenus.POST("", menuHandler.Create)
		adminMenus.PUT("/:id", menuHandler.Update)
		adminMenus.DELETE("/:id", menuHandler.Delete)
	}

	adminSettings := api.Group("/admin/settings")
	adminSettings.Use(middleware.RequireRole(adminRepo, "super_admin", "operator"))
	{
		adminSettings.GET("", backupHandler.GetSettings)
		adminSettings.PUT("", backupHandler.UpdateSettings)
		adminSettings.POST("/upload-logo", backupHandler.UpdateSettings)
		adminSettings.POST("/test-email", backupHandler.UpdateSettings)
	}

	adminCategories := api.Group("/admin/categories")
	adminCategories.Use(middleware.RequireRole(adminRepo, "super_admin", "operator", "data_admin"))
	{
		adminCategories.GET("", categoryHandler.ListCategories)
		adminCategories.POST("", categoryHandler.CreateCategory)
		adminCategories.PUT("/:id", categoryHandler.UpdateCategory)
		adminCategories.DELETE("/:id", categoryHandler.DeleteCategory)
		adminCategories.PATCH("/:id/toggle", categoryHandler.ToggleCategory)
	}

	adminAgentConfig := api.Group("/admin/agent-config")
	adminAgentConfig.Use(middleware.RequireRole(adminRepo, "super_admin", "operator"))
	{
		adminAgentConfig.GET("", agentConfigHandler.GetConfig)
		adminAgentConfig.PUT("", agentConfigHandler.SaveConfig)
		adminAgentConfig.GET("/prompt-versions", agentConfigHandler.GetPromptVersions)
		adminAgentConfig.PUT("/prompt-versions", agentConfigHandler.SavePromptVersions)
		adminAgentConfig.POST("/test-connection", agentConfigHandler.TestConnection)
	}

	adminDebug := api.Group("/admin/debug")
	adminDebug.Use(middleware.RequireRole(adminRepo, "super_admin", "operator"))
	{
		adminDebug.POST("/chat/stream", debugHandler.StreamChat)
		adminDebug.POST("/chat/load-session", debugHandler.LoadSession)
		adminDebug.GET("/chat/sessions", debugHandler.GetSessions)
		adminDebug.POST("/intent", debugHandler.TestIntent)
		adminDebug.POST("/tool/execute", debugHandler.ExecuteTool)
		adminDebug.GET("/tool/schemas", debugHandler.GetToolSchemas)
		adminDebug.GET("/tool/health", debugHandler.CheckToolHealth)
	}

	// Debug mock/write endpoints are only available in non-production environments.
	if config.AppConfig.APPEnv != "production" {
		adminDebugWritable := api.Group("/admin/debug")
		adminDebugWritable.Use(middleware.RequireRole(adminRepo, "super_admin", "operator"))
		{
			adminDebugWritable.GET("/tool/mock", debugHandler.GetMockConfigs)
			adminDebugWritable.POST("/tool/mock", debugHandler.SaveMockConfig)
			adminDebugWritable.DELETE("/tool/mock", debugHandler.DeleteMockConfig)
			adminDebugWritable.POST("/prompt/preview", debugHandler.PreviewPrompt)
		}
	}
}
