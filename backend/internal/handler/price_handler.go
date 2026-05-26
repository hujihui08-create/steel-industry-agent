package handler

import (
	"context"
	"strconv"
	"strings"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type priceService interface {
	GetLatestPrice(ctx context.Context, category string) (*model.SteelPrice, error)
	GetPriceTrend(ctx context.Context, category string, days int) ([]model.SteelPrice, error)
	GetPriceList(ctx context.Context, category, region string, limit, offset int) ([]model.SteelPrice, error)
	GetPriceListWithCount(ctx context.Context, category, spec, region string, limit, offset int) ([]model.SteelPrice, int64, error)
	ComparePrices(ctx context.Context, categories []string) (map[string]*model.SteelPrice, error)
	CreatePrice(ctx context.Context, price *model.SteelPrice) error
	UpdatePrice(ctx context.Context, price *model.SteelPrice) error
	DeletePrice(ctx context.Context, id uint) error
	BatchImportPrices(ctx context.Context, prices []*model.SteelPrice) error
	GetNewsList(ctx context.Context, limit, offset int) ([]model.News, error)
	GetNewsDetail(ctx context.Context, id uint) (*model.News, error)
	GetDailyReport(ctx context.Context) (map[string]interface{}, error)
	GetWeeklyReport(ctx context.Context) (map[string]interface{}, error)
}

// PriceHandler handles steel price-related HTTP requests.
type PriceHandler struct {
	priceService priceService
}

// NewPriceHandler creates a new PriceHandler with the given price service.
func NewPriceHandler(priceService *service.PriceService) *PriceHandler {
	return &PriceHandler{priceService: priceService}
}

// GetLatestPrice returns the most recent price for the given category.
func (h *PriceHandler) GetLatestPrice(c *gin.Context) {
	category := c.Query("category")
	if category == "" {
		response.Error(c, errors.CodeParamError, "参数错误：缺少category")
		return
	}

	price, err := h.priceService.GetLatestPrice(c.Request.Context(), category)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, price)
}

// GetPriceTrend returns historical price data for the specified number of days.
func (h *PriceHandler) GetPriceTrend(c *gin.Context) {
	category := c.Query("category")
	daysStr := c.DefaultQuery("days", "30")

	days, err := strconv.Atoi(daysStr)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：days格式不正确")
		return
	}

	prices, err := h.priceService.GetPriceTrend(c.Request.Context(), category, days)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, prices)
}

// GetPriceList returns a paginated list of steel prices with optional filters.
func (h *PriceHandler) GetPriceList(c *gin.Context) {
	category := c.Query("category")
	spec := c.Query("spec")
	region := c.Query("region")
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	prices, total, err := h.priceService.GetPriceListWithCount(c.Request.Context(), category, spec, region, limit, offset)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, gin.H{
		"items":  prices,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// ComparePrices compares latest prices across multiple categories.
func (h *PriceHandler) ComparePrices(c *gin.Context) {
	categoriesStr := c.Query("categories")
	if categoriesStr == "" {
		response.Error(c, errors.CodeParamError, "参数错误：缺少categories")
		return
	}

	categories := strings.Split(categoriesStr, ",")

	result, err := h.priceService.ComparePrices(c.Request.Context(), categories)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, result)
}

// GetNewsList returns a paginated list of steel industry news.
func (h *PriceHandler) GetNewsList(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	news, err := h.priceService.GetNewsList(c.Request.Context(), limit, offset)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, news)
}

// GetNewsDetail returns detailed information for a specific news article.
func (h *PriceHandler) GetNewsDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	news, err := h.priceService.GetNewsDetail(c.Request.Context(), uint(id))
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, news)
}

// GetDailyReport returns the daily steel price summary report.
func (h *PriceHandler) GetDailyReport(c *gin.Context) {
	report, err := h.priceService.GetDailyReport(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, report)
}

// GetWeeklyReport returns the weekly steel price trend report.
func (h *PriceHandler) GetWeeklyReport(c *gin.Context) {
	report, err := h.priceService.GetWeeklyReport(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, report)
}

// CreatePrice handles POST /admin/prices — creates a new steel price record.
func (h *PriceHandler) CreatePrice(c *gin.Context) {
	var price model.SteelPrice
	if err := c.ShouldBindJSON(&price); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：请求体格式不正确")
		return
	}

	// Validate required fields
	if price.Category == "" {
		response.Error(c, errors.CodeParamError, "参数错误：category 不能为空")
		return
	}
	if price.Price == 0 {
		response.Error(c, errors.CodeParamError, "参数错误：price 不能为空或0")
		return
	}
	if price.Region == "" {
		response.Error(c, errors.CodeParamError, "参数错误：region 不能为空")
		return
	}
	if price.PriceDate.IsZero() {
		response.Error(c, errors.CodeParamError, "参数错误：price_date 不能为空")
		return
	}

	if err := h.priceService.CreatePrice(c.Request.Context(), &price); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, price)
}

// UpdatePrice handles PUT /admin/prices/:id — updates an existing steel price record.
func (h *PriceHandler) UpdatePrice(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	var price model.SteelPrice
	if err := c.ShouldBindJSON(&price); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：请求体格式不正确")
		return
	}

	price.ID = uint(id)

	if err := h.priceService.UpdatePrice(c.Request.Context(), &price); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, price)
}

// DeletePrice handles DELETE /admin/prices/:id — deletes a steel price record.
func (h *PriceHandler) DeletePrice(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	if err := h.priceService.DeletePrice(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

// BatchImportPrices handles POST /admin/prices/batch-import — bulk imports steel price records.
func (h *PriceHandler) BatchImportPrices(c *gin.Context) {
	var prices []*model.SteelPrice
	if err := c.ShouldBindJSON(&prices); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：请求体格式不正确，期望数组")
		return
	}

	if len(prices) == 0 {
		response.Error(c, errors.CodeParamError, "参数错误：导入数据不能为空")
		return
	}

	if err := h.priceService.BatchImportPrices(c.Request.Context(), prices); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, gin.H{"imported": len(prices)})
}
