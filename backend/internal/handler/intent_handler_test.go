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

type mockIntentService struct {
	listFn  func(ctx context.Context) ([]model.Intent, error)
	createFn func(ctx context.Context, intent *model.Intent) error
	updateFn func(ctx context.Context, intent *model.Intent) error
	deleteFn func(ctx context.Context, id uint) error
	statsFn func(ctx context.Context) (map[string]interface{}, error)
}

func (m *mockIntentService) List(ctx context.Context) ([]model.Intent, error) {
	if m.listFn != nil {
		return m.listFn(ctx)
	}
	return nil, nil
}

func (m *mockIntentService) Create(ctx context.Context, intent *model.Intent) error {
	if m.createFn != nil {
		return m.createFn(ctx, intent)
	}
	return nil
}

func (m *mockIntentService) Update(ctx context.Context, intent *model.Intent) error {
	if m.updateFn != nil {
		return m.updateFn(ctx, intent)
	}
	return nil
}

func (m *mockIntentService) Delete(ctx context.Context, id uint) error {
	if m.deleteFn != nil {
		return m.deleteFn(ctx, id)
	}
	return nil
}

func (m *mockIntentService) Stats(ctx context.Context) (map[string]interface{}, error) {
	if m.statsFn != nil {
		return m.statsFn(ctx)
	}
	return nil, nil
}

func setupIntentRouter(mock *mockIntentService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &IntentHandler{intentService: mock}
	router := gin.New()
	router.GET("/admin/intents", handler.List)
	router.POST("/admin/intents", handler.Create)
	router.PUT("/admin/intents/:id", handler.Update)
	router.DELETE("/admin/intents/:id", handler.Delete)
	router.GET("/admin/intents/stats", handler.Stats)
	return router
}

func TestIntentList_Success(t *testing.T) {
	mock := &mockIntentService{
		listFn: func(ctx context.Context) ([]model.Intent, error) {
			return []model.Intent{
				{ID: 1, IntentCode: "price_query", IntentName: "价格查询", IsActive: true},
				{ID: 2, IntentCode: "tender_query", IntentName: "招标查询", IsActive: true},
			}, nil
		},
	}
	router := setupIntentRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/intents", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int            `json:"code"`
		Message string         `json:"message"`
		Data    []model.Intent `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 intents, got %d", len(resp.Data))
	}
	if resp.Data[0].IntentCode != "price_query" {
		t.Errorf("expected first intent 'price_query', got '%s'", resp.Data[0].IntentCode)
	}
}

func TestIntentList_Error(t *testing.T) {
	mock := &mockIntentService{
		listFn: func(ctx context.Context) ([]model.Intent, error) {
			return nil, stderrors.New("database error")
		},
	}
	router := setupIntentRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/intents", nil)
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

func TestIntentCreate_Success(t *testing.T) {
	var created *model.Intent
	mock := &mockIntentService{
		createFn: func(ctx context.Context, intent *model.Intent) error {
			intent.ID = 1
			created = intent
			return nil
		},
	}
	router := setupIntentRouter(mock)

	body := `{"intent_code": "price_alert", "intent_name": "价格预警", "keywords": ["预警", "提醒"], "is_active": true}`
	req, _ := http.NewRequest("POST", "/admin/intents", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int          `json:"code"`
		Message string       `json:"message"`
		Data    model.Intent `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.ID != 1 {
		t.Errorf("expected ID 1, got %d", resp.Data.ID)
	}
	if created != nil && created.IntentCode != "price_alert" {
		t.Errorf("expected intent_code 'price_alert', got '%s'", created.IntentCode)
	}
}

func TestIntentCreate_InvalidJSON(t *testing.T) {
	mock := &mockIntentService{}
	router := setupIntentRouter(mock)

	req, _ := http.NewRequest("POST", "/admin/intents", strings.NewReader(`{broken`))
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

func TestIntentCreate_ServiceError(t *testing.T) {
	mock := &mockIntentService{
		createFn: func(ctx context.Context, intent *model.Intent) error {
			return stderrors.New("intent code already exists")
		},
	}
	router := setupIntentRouter(mock)

	body := `{"intent_code": "price_query", "intent_name": "价格查询"}`
	req, _ := http.NewRequest("POST", "/admin/intents", strings.NewReader(body))
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

func TestIntentUpdate_Success(t *testing.T) {
	mock := &mockIntentService{
		updateFn: func(ctx context.Context, intent *model.Intent) error {
			return nil
		},
	}
	router := setupIntentRouter(mock)

	body := `{"intent_code": "price_query", "intent_name": "价格查询(已更新)"}`
	req, _ := http.NewRequest("PUT", "/admin/intents/1", strings.NewReader(body))
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

func TestIntentUpdate_InvalidID(t *testing.T) {
	mock := &mockIntentService{}
	router := setupIntentRouter(mock)

	body := `{"intent_name": "updated"}`
	req, _ := http.NewRequest("PUT", "/admin/intents/abc", strings.NewReader(body))
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

func TestIntentDelete_Success(t *testing.T) {
	mock := &mockIntentService{
		deleteFn: func(ctx context.Context, id uint) error {
			return nil
		},
	}
	router := setupIntentRouter(mock)

	req, _ := http.NewRequest("DELETE", "/admin/intents/1", nil)
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

func TestIntentDelete_InvalidID(t *testing.T) {
	mock := &mockIntentService{}
	router := setupIntentRouter(mock)

	req, _ := http.NewRequest("DELETE", "/admin/intents/abc", nil)
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
