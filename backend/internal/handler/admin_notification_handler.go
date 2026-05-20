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

type adminNotificationService interface {
	ListByAdmin(ctx context.Context, adminID uint, page, pageSize int) ([]model.AdminNotification, int64, error)
	MarkAsRead(ctx context.Context, id uint) error
	MarkAllAsRead(ctx context.Context, adminID uint) error
	CountUnread(ctx context.Context, adminID uint) (int64, error)
}

type AdminNotificationHandler struct {
	adminNotifService adminNotificationService
}

func NewAdminNotificationHandler(adminNotifService *service.AdminNotificationService) *AdminNotificationHandler {
	return &AdminNotificationHandler{adminNotifService: adminNotifService}
}

func (h *AdminNotificationHandler) ListNotifications(c *gin.Context) {
	adminIDVal, exists := c.Get("user_id")
	if !exists {
		response.Error(c, errors.CodeAuthFailed, "未登录或令牌已过期")
		return
	}

	adminID, ok := adminIDVal.(uint)
	if !ok {
		response.Error(c, errors.CodeAuthFailed, "令牌格式错误")
		return
	}

	page := 1
	pageSize := 20
	if p := c.Query("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	if ps := c.Query("page_size"); ps != "" {
		if v, err := strconv.Atoi(ps); err == nil && v > 0 {
			pageSize = v
		}
	}

	list, total, err := h.adminNotifService.ListByAdmin(c.Request.Context(), adminID, page, pageSize)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, gin.H{
		"list":      list,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *AdminNotificationHandler) MarkAsRead(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	if err := h.adminNotifService.MarkAsRead(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

func (h *AdminNotificationHandler) MarkAllAsRead(c *gin.Context) {
	adminIDVal, exists := c.Get("user_id")
	if !exists {
		response.Error(c, errors.CodeAuthFailed, "未登录或令牌已过期")
		return
	}

	adminID, ok := adminIDVal.(uint)
	if !ok {
		response.Error(c, errors.CodeAuthFailed, "令牌格式错误")
		return
	}

	if err := h.adminNotifService.MarkAllAsRead(c.Request.Context(), adminID); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

func (h *AdminNotificationHandler) CountUnread(c *gin.Context) {
	adminIDVal, exists := c.Get("user_id")
	if !exists {
		response.Error(c, errors.CodeAuthFailed, "未登录或令牌已过期")
		return
	}

	adminID, ok := adminIDVal.(uint)
	if !ok {
		response.Error(c, errors.CodeAuthFailed, "令牌格式错误")
		return
	}

	count, err := h.adminNotifService.CountUnread(c.Request.Context(), adminID)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, gin.H{"count": count})
}
