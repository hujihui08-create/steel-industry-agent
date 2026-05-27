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

type mockLoginLogService struct {
	listFn  func(ctx context.Context, userType string, page, pageSize int) ([]model.LoginLog, int64, error)
	statsFn func(ctx context.Context) (todayTotal, todaySuccess, todayFailure int64, err error)
}

func (m *mockLoginLogService) List(ctx context.Context, userType string, page, pageSize int) ([]model.LoginLog, int64, error) {
	if m.listFn != nil {
		return m.listFn(ctx, userType, page, pageSize)
	}
	return nil, 0, nil
}

func (m *mockLoginLogService) Stats(ctx context.Context) (todayTotal, todaySuccess, todayFailure int64, err error) {
	if m.statsFn != nil {
		return m.statsFn(ctx)
	}
	return 0, 0, 0, nil
}

func setupLoginLogRouter(mock *mockLoginLogService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &LoginLogHandler{loginLogService: mock}
	router := gin.New()
	router.GET("/admin/login-logs", handler.List)
	router.GET("/admin/login-logs/stats", handler.Stats)
	return router
}

func TestLoginLogList_Success(t *testing.T) {
	mock := &mockLoginLogService{
		listFn: func(ctx context.Context, userType string, page, pageSize int) ([]model.LoginLog, int64, error) {
			return []model.LoginLog{
			{
				ID:        1,
				UserType:  "mobile",
				LoginType: "success",
				IPAddress: "127.0.0.1",
			},
			{
				ID:        2,
				UserType:  "mobile",
				LoginType: "failure",
				IPAddress: "127.0.0.2",
			},
			}, 2, nil
		},
	}
	router := setupLoginLogRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/login-logs", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			List     interface{} `json:"list"`
			Total    int64       `json:"total"`
			Page     int         `json:"page"`
			PageSize int         `json:"page_size"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Total != 2 {
		t.Errorf("expected total 2, got %d", resp.Data.Total)
	}
}

func TestLoginLogList_Error(t *testing.T) {
	mock := &mockLoginLogService{
		listFn: func(ctx context.Context, userType string, page, pageSize int) ([]model.LoginLog, int64, error) {
			return nil, 0, stderrors.New("database error")
		},
	}
	router := setupLoginLogRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/login-logs", nil)
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

func TestLoginLogStats_Success(t *testing.T) {
	mock := &mockLoginLogService{
		statsFn: func(ctx context.Context) (todayTotal, todaySuccess, todayFailure int64, err error) {
			return 50, 45, 5, nil
		},
	}
	router := setupLoginLogRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/login-logs/stats", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			TodayTotal   int64 `json:"today_total"`
			TodaySuccess int64 `json:"today_success"`
			TodayFailure int64 `json:"today_failure"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.TodayTotal != 50 {
		t.Errorf("expected today_total 50, got %d", resp.Data.TodayTotal)
	}
	if resp.Data.TodaySuccess != 45 {
		t.Errorf("expected today_success 45, got %d", resp.Data.TodaySuccess)
	}
	if resp.Data.TodayFailure != 5 {
		t.Errorf("expected today_failure 5, got %d", resp.Data.TodayFailure)
	}
}

func TestLoginLogStats_Error(t *testing.T) {
	mock := &mockLoginLogService{
		statsFn: func(ctx context.Context) (todayTotal, todaySuccess, todayFailure int64, err error) {
			return 0, 0, 0, stderrors.New("database error")
		},
	}
	router := setupLoginLogRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/login-logs/stats", nil)
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
