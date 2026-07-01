package handler

import (
	"context"
	"fmt"
	"io"
	"strconv"
	"sync"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type notificationService interface {
	GetList(ctx context.Context, userID uint, limit, offset int) ([]model.Notification, error)
	MarkAsRead(ctx context.Context, id uint) error
	MarkAllAsRead(ctx context.Context, userID uint) error
	GetUnreadCount(ctx context.Context, userID uint) (int64, error)
}

type settingsService interface {
	GetSettings(ctx context.Context, userID uint) (*model.UserSettings, error)
	UpdateSettings(ctx context.Context, settings *model.UserSettings) error
}

// sseClient represents a connected SSE subscriber.
type sseClient struct {
	userID   uint
	messages chan string
}

// SSENotifier manages SSE subscribers and broadcasts notifications in real time.
type SSENotifier struct {
	mu      sync.RWMutex
	clients map[uint][]*sseClient
}

// NewSSENotifier creates a new SSENotifier.
func NewSSENotifier() *SSENotifier {
	return &SSENotifier{
		clients: make(map[uint][]*sseClient),
	}
}

// Subscribe adds a new SSE subscriber for the given user.
func (n *SSENotifier) Subscribe(userID uint) *sseClient {
	n.mu.Lock()
	defer n.mu.Unlock()

	client := &sseClient{
		userID:   userID,
		messages: make(chan string, 32),
	}
	n.clients[userID] = append(n.clients[userID], client)
	return client
}

// Unsubscribe removes an SSE subscriber.
func (n *SSENotifier) Unsubscribe(client *sseClient) {
	n.mu.Lock()
	defer n.mu.Unlock()

	clients := n.clients[client.userID]
	for i, c := range clients {
		if c == client {
			n.clients[client.userID] = append(clients[:i], clients[i+1:]...)
			close(client.messages)
			return
		}
	}
}

// Broadcast sends a message to all SSE subscribers for the given user.
func (n *SSENotifier) Broadcast(userID uint, message string) {
	n.mu.RLock()
	defer n.mu.RUnlock()

	if clients, ok := n.clients[userID]; ok {
		for _, c := range clients {
			select {
			case c.messages <- message:
			default:
				// drop message if client buffer is full
			}
		}
	}
}

// NotificationHandler handles notification-related HTTP requests.
type NotificationHandler struct {
	notificationService notificationService
	sseNotifier         *SSENotifier
}

// NewNotificationHandler creates a new NotificationHandler.
func NewNotificationHandler(notificationService *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
		sseNotifier:         NewSSENotifier(),
	}
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

// MarkAllAsRead marks all notifications as read for the current user.
func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	if err := h.notificationService.MarkAllAsRead(c.Request.Context(), userID); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

// GetUnreadCount returns the count of unread notifications for the current user.
func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	count, err := h.notificationService.GetUnreadCount(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, map[string]int64{"count": count})
}

// StreamNotifications is an SSE (Server-Sent Events) endpoint that pushes
// real-time notifications to the connected client.
func (h *NotificationHandler) StreamNotifications(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	client := h.sseNotifier.Subscribe(userID)
	defer h.sseNotifier.Unsubscribe(client)

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	c.Stream(func(w io.Writer) bool {
		select {
		case msg, ok := <-client.messages:
			if !ok {
				return false
			}
			fmt.Fprintf(w, "data: %s\n\n", msg)
			return true
		case <-c.Request.Context().Done():
			return false
		case <-time.After(30 * time.Second):
			// Send keepalive comment
			fmt.Fprintf(w, ": keepalive\n\n")
			return true
		}
	})
}

// GetSSENotifier returns the SSE notifier for use by external services (e.g., SchedulerService).
func (h *NotificationHandler) GetSSENotifier() *SSENotifier {
	return h.sseNotifier
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
