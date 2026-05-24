package handler

import (
	"context"
	"strconv"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type tenderService interface {
	GetTenderList(ctx context.Context, region, category, status string, limit, offset int) ([]model.Tender, error)
	GetTenderDetail(ctx context.Context, id uint) (*model.Tender, error)
	AddFavorite(ctx context.Context, userID, tenderID uint) error
	RemoveFavorite(ctx context.Context, userID, tenderID uint) error
	GetFavorites(ctx context.Context, userID uint) ([]model.Tender, error)
	GetRecommend(ctx context.Context, userID uint) ([]model.Tender, error)
	GetCalendar(ctx context.Context) (map[string]interface{}, error)
}

// TenderHandler handles tender-related HTTP requests.
type TenderHandler struct {
	tenderService tenderService
}

// NewTenderHandler creates a new TenderHandler with the given tender service.
func NewTenderHandler(tenderService *service.TenderService) *TenderHandler {
	return &TenderHandler{tenderService: tenderService}
}

// GetTenderList returns a paginated list of tenders with optional filters.
func (h *TenderHandler) GetTenderList(c *gin.Context) {
	region := c.Query("region")
	category := c.Query("category")
	status := c.Query("status")
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	tenders, err := h.tenderService.GetTenderList(c.Request.Context(), region, category, status, limit, offset)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, tenders)
}

// GetTenderDetail returns detailed information for a specific tender.
func (h *TenderHandler) GetTenderDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	tender, err := h.tenderService.GetTenderDetail(c.Request.Context(), uint(id))
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, tender)
}

// AddFavorite adds a tender to the user's favorites.
func (h *TenderHandler) AddFavorite(c *gin.Context) {
	var req struct {
		TenderID uint `json:"tender_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	if err := h.tenderService.AddFavorite(c.Request.Context(), userID, req.TenderID); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

// RemoveFavorite removes a tender from the user's favorites.
func (h *TenderHandler) RemoveFavorite(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	if err := h.tenderService.RemoveFavorite(c.Request.Context(), userID, uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

// AddFavoriteByID adds a tender to the user's favorites using tender ID from URL path.
func (h *TenderHandler) AddFavoriteByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	if err := h.tenderService.AddFavorite(c.Request.Context(), userID, uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

// RemoveFavoriteByID removes a tender from the user's favorites using tender ID from URL path.
func (h *TenderHandler) RemoveFavoriteByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	if err := h.tenderService.RemoveFavorite(c.Request.Context(), userID, uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

// GetFavorites returns the current user's favorited tenders.
func (h *TenderHandler) GetFavorites(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	tenders, err := h.tenderService.GetFavorites(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, tenders)
}

// GetRecommend returns personalized tender recommendations based on the user's favorites.
func (h *TenderHandler) GetRecommend(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	tenders, err := h.tenderService.GetRecommend(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, tenders)
}

// GetCalendar returns tenders with deadlines within the next 30 days.
func (h *TenderHandler) GetCalendar(c *gin.Context) {
	calendar, err := h.tenderService.GetCalendar(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, calendar)
}
