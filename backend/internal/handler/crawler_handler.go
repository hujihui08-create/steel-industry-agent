package handler

import (
	"context"
	"strconv"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

// crawlerServiceInterface defines the methods CrawlerHandler needs from CrawlerService.
// This interface enables mock-based unit testing without requiring a real CrawlerService.
type crawlerServiceInterface interface {
	TriggerCrawl(sourceID uint) error
	GetCrawlStatus() (map[uint]service.CrawlStatus, error)
}

// crawlerSourceRepoInterface defines the methods CrawlerHandler needs from CrawlerSourceRepository.
type crawlerSourceRepoInterface interface {
	FindAll() ([]model.CrawlerSource, error)
	FindByID(id uint) (*model.CrawlerSource, error)
	Create(source *model.CrawlerSource) error
	Update(source *model.CrawlerSource) error
}

// crawlerLogRepoInterface defines the methods CrawlerHandler needs from CrawlerLogRepository.
type crawlerLogRepoInterface interface {
	FindBySourceID(ctx context.Context, sourceID uint, limit int) ([]model.CrawlerLog, error)
	FindRecent(ctx context.Context, limit int) ([]model.CrawlerLog, error)
}

// CrawlerHandler handles admin crawler management HTTP requests.
type CrawlerHandler struct {
	crawlerService crawlerServiceInterface
	sourceRepo     crawlerSourceRepoInterface
	logRepo        crawlerLogRepoInterface
}

// NewCrawlerHandler creates a new CrawlerHandler with the given dependencies.
// Concrete types (*service.CrawlerService, *repository.CrawlerSourceRepository,
// *repository.CrawlerLogRepository) automatically satisfy the internal interfaces.
func NewCrawlerHandler(
	crawlerService *service.CrawlerService,
	sourceRepo *repository.CrawlerSourceRepository,
	logRepo *repository.CrawlerLogRepository,
) *CrawlerHandler {
	return &CrawlerHandler{
		crawlerService: crawlerService,
		sourceRepo:     sourceRepo,
		logRepo:        logRepo,
	}
}

// ListSources returns all crawler data sources.
func (h *CrawlerHandler) ListSources(c *gin.Context) {
	sources, err := h.sourceRepo.FindAll()
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	if sources == nil {
		sources = []model.CrawlerSource{}
	}
	response.Success(c, sources)
}

// CreateSource creates a new crawler data source.
func (h *CrawlerHandler) CreateSource(c *gin.Context) {
	var source model.CrawlerSource
	if err := c.ShouldBindJSON(&source); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if source.SourceName == "" || source.SourceType == "" || source.SourceURL == "" {
		response.Error(c, errors.CodeParamError, "数据源名称、类型和URL不能为空")
		return
	}

	if err := h.sourceRepo.Create(&source); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, source)
}

// UpdateSource updates an existing crawler data source by ID.
func (h *CrawlerHandler) UpdateSource(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	existing, err := h.sourceRepo.FindByID(uint(id))
	if err != nil {
		response.Error(c, errors.CodeNotFound, "数据源不存在")
		return
	}

	var req struct {
		SourceName    string `json:"source_name"`
		SourceType    string `json:"source_type"`
		SourceURL     string `json:"source_url"`
		CrawlRule     string `json:"crawl_rule"`
		CrawlInterval int    `json:"crawl_interval"`
		IsActive      *bool  `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if req.SourceName != "" {
		existing.SourceName = req.SourceName
	}
	if req.SourceType != "" {
		existing.SourceType = req.SourceType
	}
	if req.SourceURL != "" {
		existing.SourceURL = req.SourceURL
	}
	if req.CrawlRule != "" {
		existing.CrawlRule = req.CrawlRule
	}
	if req.CrawlInterval > 0 {
		existing.CrawlInterval = req.CrawlInterval
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}

	if err := h.sourceRepo.Update(existing); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, existing)
}

// DeleteSource soft-deletes a crawler data source by setting IsActive to false.
func (h *CrawlerHandler) DeleteSource(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	source, err := h.sourceRepo.FindByID(uint(id))
	if err != nil {
		response.Error(c, errors.CodeNotFound, "数据源不存在")
		return
	}

	source.IsActive = false
	if err := h.sourceRepo.Update(source); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

// ListLogs returns crawler execution logs, optionally filtered by source_id.
func (h *CrawlerHandler) ListLogs(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	sourceIDStr := c.Query("source_id")
	if sourceIDStr != "" {
		sourceID, err := strconv.ParseUint(sourceIDStr, 10, 64)
		if err != nil {
			response.Error(c, errors.CodeParamError, "参数错误：source_id格式不正确")
			return
		}

		logs, err := h.logRepo.FindBySourceID(c.Request.Context(), uint(sourceID), limit)
		if err != nil {
			response.Error(c, errors.CodeInternalError, err.Error())
			return
		}
		if logs == nil {
			logs = []model.CrawlerLog{}
		}
		response.Success(c, logs)
		return
	}

	logs, err := h.logRepo.FindRecent(c.Request.Context(), limit)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	if logs == nil {
		logs = []model.CrawlerLog{}
	}

	response.Success(c, logs)
}

// TriggerCrawl starts an asynchronous crawl for the given source ID.
func (h *CrawlerHandler) TriggerCrawl(c *gin.Context) {
	idStr := c.Param("source_id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：source_id格式不正确")
		return
	}

	if err := h.crawlerService.TriggerCrawl(uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

// GetCrawlStatus returns the current crawl status overview for all active sources.
func (h *CrawlerHandler) GetCrawlStatus(c *gin.Context) {
	status, err := h.crawlerService.GetCrawlStatus()
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, status)
}
