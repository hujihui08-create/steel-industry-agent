package handler

import (
	"context"
	"encoding/json"
	stderrors "errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

type mockAlertService struct {
	createAlertFn  func(ctx context.Context, alert *model.PriceAlert) error
	getAlertListFn func(ctx context.Context, userID uint) ([]model.PriceAlert, error)
	updateAlertFn  func(ctx context.Context, alert *model.PriceAlert) error
	deleteAlertFn  func(ctx context.Context, id uint) error
}

func (m *mockAlertService) CreateAlert(ctx context.Context, alert *model.PriceAlert) error {
	return m.createAlertFn(ctx, alert)
}

func (m *mockAlertService) GetAlertList(ctx context.Context, userID uint) ([]model.PriceAlert, error) {
	return m.getAlertListFn(ctx, userID)
}

func (m *mockAlertService) UpdateAlert(ctx context.Context, alert *model.PriceAlert) error {
	return m.updateAlertFn(ctx, alert)
}

func (m *mockAlertService) DeleteAlert(ctx context.Context, id uint) error {
	return m.deleteAlertFn(ctx, id)
}

func setupAlertRouter(mock *mockAlertService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &AlertHandler{alertService: mock}
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	router.POST("/api/v1/alerts", handler.CreateAlert)
	router.GET("/api/v1/alerts", handler.GetAlertList)
	router.PUT("/api/v1/alerts/:id", handler.UpdateAlert)
	router.DELETE("/api/v1/alerts/:id", handler.DeleteAlert)
	return router
}

func TestCreateAlert_Success(t *testing.T) {
	mock := &mockAlertService{
		createAlertFn: func(ctx context.Context, alert *model.PriceAlert) error {
			alert.ID = 1
			return nil
		},
	}
	router := setupAlertRouter(mock)

	body := `{"category": "螺纹钢", "spec": "HRB400 20mm", "region": "华东", "target_price": 4250.0, "condition": "below"}`
	req, _ := http.NewRequest("POST", "/api/v1/alerts", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
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

func TestCreateAlert_InvalidBody(t *testing.T) {
	mock := &mockAlertService{
		createAlertFn: func(ctx context.Context, alert *model.PriceAlert) error {
			return nil
		},
	}
	router := setupAlertRouter(mock)

	body := `not-json`
	req, _ := http.NewRequest("POST", "/api/v1/alerts", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d, got %d", errors.CodeParamError, resp.Code)
	}
}

func TestCreateAlert_Error(t *testing.T) {
	mock := &mockAlertService{
		createAlertFn: func(ctx context.Context, alert *model.PriceAlert) error {
			return stderrors.New("database error")
		},
	}
	router := setupAlertRouter(mock)

	body := `{"category": "螺纹钢", "spec": "HRB400 20mm", "region": "华东", "target_price": 4250.0, "condition": "below"}`
	req, _ := http.NewRequest("POST", "/api/v1/alerts", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
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

func TestGetAlertList_Success(t *testing.T) {
	mock := &mockAlertService{
		getAlertListFn: func(ctx context.Context, userID uint) ([]model.PriceAlert, error) {
			return []model.PriceAlert{
				{ID: 1, UserID: 1, Category: "螺纹钢", Spec: "HRB400 20mm", TargetPrice: 4250.0, Condition: "below"},
				{ID: 2, UserID: 1, Category: "热卷", Spec: "Q235B 5.5mm", TargetPrice: 3800.0, Condition: "above"},
			}, nil
		},
	}
	router := setupAlertRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/alerts", nil)
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

func TestGetAlertList_Error(t *testing.T) {
	mock := &mockAlertService{
		getAlertListFn: func(ctx context.Context, userID uint) ([]model.PriceAlert, error) {
			return nil, stderrors.New("database error")
		},
	}
	router := setupAlertRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/alerts", nil)
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

func TestUpdateAlert_Success(t *testing.T) {
	mock := &mockAlertService{
		updateAlertFn: func(ctx context.Context, alert *model.PriceAlert) error {
			return nil
		},
	}
	router := setupAlertRouter(mock)

	body := `{"category": "螺纹钢", "spec": "HRB400 20mm", "target_price": 4200.0, "condition": "below"}`
	req, _ := http.NewRequest("PUT", "/api/v1/alerts/1", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
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

func TestUpdateAlert_InvalidID(t *testing.T) {
	mock := &mockAlertService{
		updateAlertFn: func(ctx context.Context, alert *model.PriceAlert) error {
			return nil
		},
	}
	router := setupAlertRouter(mock)

	body := `{"target_price": 4200.0}`
	req, _ := http.NewRequest("PUT", "/api/v1/alerts/abc", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d, got %d", errors.CodeParamError, resp.Code)
	}
}

func TestDeleteAlert_Success(t *testing.T) {
	mock := &mockAlertService{
		deleteAlertFn: func(ctx context.Context, id uint) error {
			return nil
		},
	}
	router := setupAlertRouter(mock)

	req, _ := http.NewRequest("DELETE", "/api/v1/alerts/1", nil)
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

func TestDeleteAlert_InvalidID(t *testing.T) {
	mock := &mockAlertService{
		deleteAlertFn: func(ctx context.Context, id uint) error {
			return nil
		},
	}
	router := setupAlertRouter(mock)

	req, _ := http.NewRequest("DELETE", "/api/v1/alerts/abc", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d, got %d", errors.CodeParamError, resp.Code)
	}
}

func TestDeleteAlert_Error(t *testing.T) {
	mock := &mockAlertService{
		deleteAlertFn: func(ctx context.Context, id uint) error {
			return stderrors.New("alert not found")
		},
	}
	router := setupAlertRouter(mock)

	req, _ := http.NewRequest("DELETE", "/api/v1/alerts/1", nil)
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
