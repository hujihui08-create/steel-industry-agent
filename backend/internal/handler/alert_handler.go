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

type alertService interface {
	CreateAlert(ctx context.Context, alert *model.PriceAlert) error
	GetAlertList(ctx context.Context, userID uint) ([]model.PriceAlert, error)
	UpdateAlert(ctx context.Context, alert *model.PriceAlert) error
	DeleteAlert(ctx context.Context, id uint) error
}

// AlertHandler handles price alert-related HTTP requests.
type AlertHandler struct {
	alertService alertService
}

// NewAlertHandler creates a new AlertHandler with the given alert service.
func NewAlertHandler(alertService *service.AlertService) *AlertHandler {
	return &AlertHandler{alertService: alertService}
}

// CreateAlert creates a new price alert for the authenticated user.
func (h *AlertHandler) CreateAlert(c *gin.Context) {
	var alert model.PriceAlert
	if err := c.ShouldBindJSON(&alert); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	userIDVal, _ := c.Get("user_id")
	alert.UserID = userIDVal.(uint)

	if err := h.alertService.CreateAlert(c.Request.Context(), &alert); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, alert)
}

// GetAlertList returns the authenticated user's price alerts.
func (h *AlertHandler) GetAlertList(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	alerts, err := h.alertService.GetAlertList(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, alerts)
}

// UpdateAlert updates an existing price alert.
func (h *AlertHandler) UpdateAlert(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	var alert model.PriceAlert
	if err := c.ShouldBindJSON(&alert); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	alert.ID = uint(id)

	if err := h.alertService.UpdateAlert(c.Request.Context(), &alert); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, alert)
}

// DeleteAlert deletes a price alert by its ID.
func (h *AlertHandler) DeleteAlert(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	if err := h.alertService.DeleteAlert(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}
