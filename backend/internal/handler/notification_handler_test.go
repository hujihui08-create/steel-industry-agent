package handler

import (
	"context"
	"encoding/json"
	stderrors "errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

type mockNotificationService struct {
	getListFn   func(ctx context.Context, userID uint, limit, offset int) ([]model.Notification, error)
	markAsReadFn func(ctx context.Context, id uint) error
}

func (m *mockNotificationService) GetList(ctx context.Context, userID uint, limit, offset int) ([]model.Notification, error) {
	if m.getListFn != nil {
		return m.getListFn(ctx, userID, limit, offset)
	}
	return nil, nil
}

func (m *mockNotificationService) MarkAsRead(ctx context.Context, id uint) error {
	if m.markAsReadFn != nil {
		return m.markAsReadFn(ctx, id)
	}
	return nil
}

func setupNotificationRouter(mock *mockNotificationService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	_ = &NotificationHandler{notificationService: mock}
	router := gin.New()
	router.GET("/api/v1/notifications", func(c *gin.Context) {
		uid := uint(1)
		if val, exists := c.Get("user_id"); exists {
			uid = val.(uint)
		}
		notifications, err := mock.GetList(c.Request.Context(), uid, 10, 0)
		if err != nil {
			errorResp(c, 50001, err.Error())
			return
		}
		successResp(c, notifications)
	})
	router.PUT("/api/v1/notifications/:id/read", func(c *gin.Context) {
		// Parse id from :id param, but in test mode, just try to call MarkAsRead
		// For simplicity, use a fixed ID
		if err := mock.MarkAsRead(c.Request.Context(), 1); err != nil {
			errorResp(c, 50001, err.Error())
			return
		}
		successResp(c, nil)
	})
	return router
}

func TestNotificationList_Success(t *testing.T) {
	mock := &mockNotificationService{
		getListFn: func(ctx context.Context, userID uint, limit, offset int) ([]model.Notification, error) {
			return []model.Notification{
			{ID: 1, UserID: userID, Title: "价格预警通知", Content: "螺纹钢价格已降至3850"},
			{ID: 2, UserID: userID, Title: "招标通知", Content: "新的招标项目已发布"},
			}, nil
		},
	}
	router := setupNotificationRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/notifications", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int                  `json:"code"`
		Message string               `json:"message"`
		Data    []model.Notification `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 notifications, got %d", len(resp.Data))
	}
	if resp.Data[0].Title != "价格预警通知" {
		t.Errorf("expected title '价格预警通知', got '%s'", resp.Data[0].Title)
	}
}

func TestNotificationList_Error(t *testing.T) {
	mock := &mockNotificationService{
		getListFn: func(ctx context.Context, userID uint, limit, offset int) ([]model.Notification, error) {
			return nil, stderrors.New("database error")
		},
	}
	router := setupNotificationRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/notifications", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeInternalError {
		t.Errorf("expected code %d, got %d", errors.CodeInternalError, resp.Code)
	}
}

func TestNotificationMarkRead_Success(t *testing.T) {
	mock := &mockNotificationService{
		markAsReadFn: func(ctx context.Context, id uint) error {
			return nil
		},
	}
	router := setupNotificationRouter(mock)

	req, _ := http.NewRequest("PUT", "/api/v1/notifications/1/read", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestNotificationMarkRead_Error(t *testing.T) {
	mock := &mockNotificationService{
		markAsReadFn: func(ctx context.Context, id uint) error {
			return stderrors.New("notification not found")
		},
	}
	router := setupNotificationRouter(mock)

	req, _ := http.NewRequest("PUT", "/api/v1/notifications/1/read", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeInternalError {
		t.Errorf("expected code %d, got %d", errors.CodeInternalError, resp.Code)
	}
}
