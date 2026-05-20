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

type notificationService interface {
	GetList(ctx context.Context, userID uint, limit, offset int) ([]model.Notification, error)
	MarkAsRead(ctx context.Context, id uint) error
}

type settingsService interface {
	GetSettings(ctx context.Context, userID uint) (*model.UserSettings, error)
	UpdateSettings(ctx context.Context, settings *model.UserSettings) error
}

// NotificationHandler handles notification-related HTTP requests.
type NotificationHandler struct {
	notificationService notificationService
}

// NewNotificationHandler creates a new NotificationHandler.
func NewNotificationHandler(notificationService *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{notificationService: notificationService}
}

// GetNotifications returns the user's notification list.
func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	notifications, err := h.notificationService.GetList(c.Request.Context(), userID, limit, offset)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, notifications)
}

// MarkAsRead marks a notification as read.
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	if err := h.notificationService.MarkAsRead(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

// SettingsHandler handles user settings HTTP requests.
type SettingsHandler struct {
	settingsService settingsService
}

// NewSettingsHandler creates a new SettingsHandler.
func NewSettingsHandler(settingsService *service.SettingsService) *SettingsHandler {
	return &SettingsHandler{settingsService: settingsService}
}

// GetSettings returns the user's settings.
func (h *SettingsHandler) GetSettings(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	settings, err := h.settingsService.GetSettings(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, settings)
}

// UpdateSettings updates the user's settings.
func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	var req struct {
		NotificationsEnabled *bool   `json:"notifications_enabled"`
		Theme                *string `json:"theme"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	settings, err := h.settingsService.GetSettings(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	if req.NotificationsEnabled != nil {
		settings.NotificationsEnabled = *req.NotificationsEnabled
	}
	if req.Theme != nil {
		settings.Theme = *req.Theme
	}

	if err := h.settingsService.UpdateSettings(c.Request.Context(), settings); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, settings)
}
