package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

// ---------------------------------------------------------------------------
// Mock implementations
// ---------------------------------------------------------------------------

type mockCrawlerService struct {
	triggerCrawlFn    func(sourceID uint) error
	getCrawlStatusFn  func() (map[uint]service.CrawlStatus, error)
}

func (m *mockCrawlerService) TriggerCrawl(sourceID uint) error {
	return m.triggerCrawlFn(sourceID)
}

func (m *mockCrawlerService) GetCrawlStatus() (map[uint]service.CrawlStatus, error) {
	return m.getCrawlStatusFn()
}

type mockCrawlerSourceRepo struct {
	findAllFn  func() ([]model.CrawlerSource, error)
	findByIDFn func(id uint) (*model.CrawlerSource, error)
	createFn   func(source *model.CrawlerSource) error
	updateFn   func(source *model.CrawlerSource) error
}

func (m *mockCrawlerSourceRepo) FindAll() ([]model.CrawlerSource, error) {
	return m.findAllFn()
}

func (m *mockCrawlerSourceRepo) FindByID(id uint) (*model.CrawlerSource, error) {
	return m.findByIDFn(id)
}

func (m *mockCrawlerSourceRepo) Create(source *model.CrawlerSource) error {
	return m.createFn(source)
}

func (m *mockCrawlerSourceRepo) Update(source *model.CrawlerSource) error {
	return m.updateFn(source)
}

type mockCrawlerLogRepo struct {
	findBySourceIDFn func(ctx context.Context, sourceID uint, limit int) ([]model.CrawlerLog, error)
	findRecentFn     func(ctx context.Context, limit int) ([]model.CrawlerLog, error)
}

func (m *mockCrawlerLogRepo) FindBySourceID(ctx context.Context, sourceID uint, limit int) ([]model.CrawlerLog, error) {
	return m.findBySourceIDFn(ctx, sourceID, limit)
}

func (m *mockCrawlerLogRepo) FindRecent(ctx context.Context, limit int) ([]model.CrawlerLog, error) {
	return m.findRecentFn(ctx, limit)
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

func setupCrawlerRouter(
	mockSvc *mockCrawlerService,
	mockSrc *mockCrawlerSourceRepo,
	mockLog *mockCrawlerLogRepo,
) *gin.Engine {
	gin.SetMode(gin.TestMode)
	h := &CrawlerHandler{
		crawlerService: mockSvc,
		sourceRepo:     mockSrc,
		logRepo:        mockLog,
	}
	r := gin.New()
	r.GET("/api/v1/admin/crawler/sources", h.ListSources)
	r.POST("/api/v1/admin/crawler/sources", h.CreateSource)
	r.PUT("/api/v1/admin/crawler/sources/:id", h.UpdateSource)
	r.DELETE("/api/v1/admin/crawler/sources/:id", h.DeleteSource)
	r.GET("/api/v1/admin/crawler/logs", h.ListLogs)
	r.POST("/api/v1/admin/crawler/trigger/:source_id", h.TriggerCrawl)
	r.GET("/api/v1/admin/crawler/status", h.GetCrawlStatus)
	return r
}

// ---------------------------------------------------------------------------
// ListSources
// ---------------------------------------------------------------------------

func TestListSources_Empty(t *testing.T) {
	mockSrc := &mockCrawlerSourceRepo{
		findAllFn: func() ([]model.CrawlerSource, error) {
			return nil, nil
		},
	}
	r := setupCrawlerRouter(&mockCrawlerService{}, mockSrc, &mockCrawlerLogRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/admin/crawler/sources", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}

	var resp struct {
		Code int                      `json:"code"`
		Data []model.CrawlerSource    `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
	if resp.Data == nil {
		t.Error("data should be empty array, not nil")
	}
}

func TestListSources_Success(t *testing.T) {
	mockSrc := &mockCrawlerSourceRepo{
		findAllFn: func() ([]model.CrawlerSource, error) {
			return []model.CrawlerSource{
				{ID: 1, SourceName: "我的钢铁网", SourceType: "price", SourceURL: "https://www.mysteel.com"},
				{ID: 2, SourceName: "中国招标网", SourceType: "tender", SourceURL: "https://www.zhaobiao.cn"},
			}, nil
		},
	}
	r := setupCrawlerRouter(&mockCrawlerService{}, mockSrc, &mockCrawlerLogRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/admin/crawler/sources", nil)
	r.ServeHTTP(w, req)

	var resp struct {
		Code int                   `json:"code"`
		Data []model.CrawlerSource `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 || len(resp.Data) != 2 {
		t.Errorf("code = %d, len = %d, want code 200, len 2", resp.Code, len(resp.Data))
	}
}

func TestListSources_DBError(t *testing.T) {
	mockSrc := &mockCrawlerSourceRepo{
		findAllFn: func() ([]model.CrawlerSource, error) {
			return nil, fmt.Errorf("database connection failed")
		},
	}
	r := setupCrawlerRouter(&mockCrawlerService{}, mockSrc, &mockCrawlerLogRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/admin/crawler/sources", nil)
	r.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeInternalError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeInternalError)
	}
}

// ---------------------------------------------------------------------------
// CreateSource
// ---------------------------------------------------------------------------

func TestCreateSource_Success(t *testing.T) {
	mockSrc := &mockCrawlerSourceRepo{
		createFn: func(source *model.CrawlerSource) error {
			source.ID = 1
			return nil
		},
	}
	r := setupCrawlerRouter(&mockCrawlerService{}, mockSrc, &mockCrawlerLogRepo{})
	body := `{"source_name":"我的钢铁网","source_type":"price","source_url":"https://www.mysteel.com"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/admin/crawler/sources", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	var resp struct {
		Code int                   `json:"code"`
		Data model.CrawlerSource   `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
	if resp.Data.ID != 1 {
		t.Errorf("id = %d, want 1", resp.Data.ID)
	}
}

func TestCreateSource_InvalidJSON(t *testing.T) {
	r := setupCrawlerRouter(&mockCrawlerService{}, &mockCrawlerSourceRepo{}, &mockCrawlerLogRepo{})
	body := `{invalid}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/admin/crawler/sources", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeParamError)
	}
}

func TestCreateSource_MissingRequiredFields(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{"missing source_name", `{"source_type":"price","source_url":"https://example.com"}`},
		{"missing source_type", `{"source_name":"test","source_url":"https://example.com"}`},
		{"missing source_url", `{"source_name":"test","source_type":"price"}`},
		{"all empty", `{"source_name":"","source_type":"","source_url":""}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := setupCrawlerRouter(&mockCrawlerService{}, &mockCrawlerSourceRepo{}, &mockCrawlerLogRepo{})
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/api/v1/admin/crawler/sources", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			r.ServeHTTP(w, req)

			var resp struct {
				Code int `json:"code"`
			}
			json.Unmarshal(w.Body.Bytes(), &resp)
			if resp.Code != errors.CodeParamError {
				t.Errorf("%s: code = %d, want %d", tt.name, resp.Code, errors.CodeParamError)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// UpdateSource
// ---------------------------------------------------------------------------

func TestUpdateSource_Success(t *testing.T) {
	existing := &model.CrawlerSource{ID: 1, SourceName: "old", SourceType: "price", SourceURL: "https://old.com"}
	mockSrc := &mockCrawlerSourceRepo{
		findByIDFn: func(id uint) (*model.CrawlerSource, error) {
			if id == 1 {
				return existing, nil
			}
			return nil, fmt.Errorf("not found")
		},
		updateFn: func(source *model.CrawlerSource) error {
			return nil
		},
	}
	r := setupCrawlerRouter(&mockCrawlerService{}, mockSrc, &mockCrawlerLogRepo{})
	body := `{"source_name":"new name"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/api/v1/admin/crawler/sources/1", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	var resp struct {
		Code int                 `json:"code"`
		Data model.CrawlerSource `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
	if resp.Data.SourceName != "new name" {
		t.Errorf("source_name = %s, want 'new name'", resp.Data.SourceName)
	}
}

func TestUpdateSource_NotFound(t *testing.T) {
	mockSrc := &mockCrawlerSourceRepo{
		findByIDFn: func(id uint) (*model.CrawlerSource, error) {
			return nil, fmt.Errorf("not found")
		},
	}
	r := setupCrawlerRouter(&mockCrawlerService{}, mockSrc, &mockCrawlerLogRepo{})
	body := `{"source_name":"new"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/api/v1/admin/crawler/sources/999", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeNotFound {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeNotFound)
	}
}

func TestUpdateSource_InvalidID(t *testing.T) {
	r := setupCrawlerRouter(&mockCrawlerService{}, &mockCrawlerSourceRepo{}, &mockCrawlerLogRepo{})
	body := `{}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/api/v1/admin/crawler/sources/abc", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeParamError)
	}
}

// ---------------------------------------------------------------------------
// DeleteSource
// ---------------------------------------------------------------------------

func TestDeleteSource_Success(t *testing.T) {
	mockSrc := &mockCrawlerSourceRepo{
		findByIDFn: func(id uint) (*model.CrawlerSource, error) {
			return &model.CrawlerSource{ID: id, SourceName: "test", IsActive: true}, nil
		},
		updateFn: func(source *model.CrawlerSource) error {
			return nil
		},
	}
	r := setupCrawlerRouter(&mockCrawlerService{}, mockSrc, &mockCrawlerLogRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/api/v1/admin/crawler/sources/1", nil)
	r.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
}

func TestDeleteSource_NotFound(t *testing.T) {
	mockSrc := &mockCrawlerSourceRepo{
		findByIDFn: func(id uint) (*model.CrawlerSource, error) {
			return nil, fmt.Errorf("not found")
		},
	}
	r := setupCrawlerRouter(&mockCrawlerService{}, mockSrc, &mockCrawlerLogRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/api/v1/admin/crawler/sources/999", nil)
	r.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeNotFound {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeNotFound)
	}
}

func TestDeleteSource_InvalidID(t *testing.T) {
	r := setupCrawlerRouter(&mockCrawlerService{}, &mockCrawlerSourceRepo{}, &mockCrawlerLogRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/api/v1/admin/crawler/sources/abc", nil)
	r.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeParamError)
	}
}

// ---------------------------------------------------------------------------
// ListLogs
// ---------------------------------------------------------------------------

func TestListLogs_Recent(t *testing.T) {
	now := time.Now()
	mockLog := &mockCrawlerLogRepo{
		findRecentFn: func(ctx context.Context, limit int) ([]model.CrawlerLog, error) {
			return []model.CrawlerLog{
				{ID: 1, SourceID: 1, Status: "success", StartedAt: &now},
				{ID: 2, SourceID: 2, Status: "failed", StartedAt: &now},
			}, nil
		},
	}
	r := setupCrawlerRouter(&mockCrawlerService{}, &mockCrawlerSourceRepo{}, mockLog)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/admin/crawler/logs", nil)
	r.ServeHTTP(w, req)

	var resp struct {
		Code int               `json:"code"`
		Data []model.CrawlerLog `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 || len(resp.Data) != 2 {
		t.Errorf("code = %d, len = %d", resp.Code, len(resp.Data))
	}
}

func TestListLogs_BySourceID(t *testing.T) {
	now := time.Now()
	mockLog := &mockCrawlerLogRepo{
		findBySourceIDFn: func(ctx context.Context, sourceID uint, limit int) ([]model.CrawlerLog, error) {
			if sourceID != 1 {
				t.Errorf("unexpected sourceID = %d", sourceID)
			}
			return []model.CrawlerLog{
				{ID: 1, SourceID: 1, Status: "success", StartedAt: &now},
			}, nil
		},
	}
	r := setupCrawlerRouter(&mockCrawlerService{}, &mockCrawlerSourceRepo{}, mockLog)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/admin/crawler/logs?source_id=1", nil)
	r.ServeHTTP(w, req)

	var resp struct {
		Code int               `json:"code"`
		Data []model.CrawlerLog `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 || len(resp.Data) != 1 {
		t.Errorf("code = %d, len = %d", resp.Code, len(resp.Data))
	}
}

func TestListLogs_InvalidSourceID(t *testing.T) {
	r := setupCrawlerRouter(&mockCrawlerService{}, &mockCrawlerSourceRepo{}, &mockCrawlerLogRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/admin/crawler/logs?source_id=abc", nil)
	r.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeParamError)
	}
}

func TestListLogs_Empty(t *testing.T) {
	mockLog := &mockCrawlerLogRepo{
		findRecentFn: func(ctx context.Context, limit int) ([]model.CrawlerLog, error) {
			return nil, nil
		},
	}
	r := setupCrawlerRouter(&mockCrawlerService{}, &mockCrawlerSourceRepo{}, mockLog)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/admin/crawler/logs", nil)
	r.ServeHTTP(w, req)

	var resp struct {
		Code int                `json:"code"`
		Data []model.CrawlerLog `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
	if resp.Data == nil {
		t.Error("data should be empty array, not nil")
	}
}

// ---------------------------------------------------------------------------
// TriggerCrawl
// ---------------------------------------------------------------------------

func TestTriggerCrawl_Success(t *testing.T) {
	mockSvc := &mockCrawlerService{
		triggerCrawlFn: func(sourceID uint) error {
			if sourceID != 1 {
				t.Errorf("unexpected sourceID = %d", sourceID)
			}
			return nil
		},
	}
	r := setupCrawlerRouter(mockSvc, &mockCrawlerSourceRepo{}, &mockCrawlerLogRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/admin/crawler/trigger/1", nil)
	r.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
}

func TestTriggerCrawl_SourceNotFound(t *testing.T) {
	mockSvc := &mockCrawlerService{
		triggerCrawlFn: func(sourceID uint) error {
			return fmt.Errorf("source 999 not found")
		},
	}
	r := setupCrawlerRouter(mockSvc, &mockCrawlerSourceRepo{}, &mockCrawlerLogRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/admin/crawler/trigger/999", nil)
	r.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeInternalError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeInternalError)
	}
}

func TestTriggerCrawl_InvalidSourceID(t *testing.T) {
	r := setupCrawlerRouter(&mockCrawlerService{}, &mockCrawlerSourceRepo{}, &mockCrawlerLogRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/admin/crawler/trigger/abc", nil)
	r.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeParamError)
	}
}

// ---------------------------------------------------------------------------
// GetCrawlStatus
// ---------------------------------------------------------------------------

func TestGetCrawlStatus_Success(t *testing.T) {
	now := time.Now()
	mockSvc := &mockCrawlerService{
		getCrawlStatusFn: func() (map[uint]service.CrawlStatus, error) {
			return map[uint]service.CrawlStatus{
				1: {
					SourceID:   1,
					SourceName: "我的钢铁网",
					SourceType: "price",
					IsActive:   true,
					IsRunning:  false,
					LastCrawlAt: &now,
				},
			}, nil
		},
	}
	r := setupCrawlerRouter(mockSvc, &mockCrawlerSourceRepo{}, &mockCrawlerLogRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/admin/crawler/status", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}

	var resp struct {
		Code int                              `json:"code"`
		Data map[uint]service.CrawlStatus     `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
	if len(resp.Data) != 1 {
		t.Errorf("len = %d, want 1", len(resp.Data))
	}
}

func TestGetCrawlStatus_Empty(t *testing.T) {
	mockSvc := &mockCrawlerService{
		getCrawlStatusFn: func() (map[uint]service.CrawlStatus, error) {
			return map[uint]service.CrawlStatus{}, nil
		},
	}
	r := setupCrawlerRouter(mockSvc, &mockCrawlerSourceRepo{}, &mockCrawlerLogRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/admin/crawler/status", nil)
	r.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
}

func TestGetCrawlStatus_Error(t *testing.T) {
	mockSvc := &mockCrawlerService{
		getCrawlStatusFn: func() (map[uint]service.CrawlStatus, error) {
			return nil, fmt.Errorf("failed to get status")
		},
	}
	r := setupCrawlerRouter(mockSvc, &mockCrawlerSourceRepo{}, &mockCrawlerLogRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/admin/crawler/status", nil)
	r.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeInternalError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeInternalError)
	}
}

// ---------------------------------------------------------------------------
// verify crawlerServiceInterface and CrawlerService compatibility at compile time
// ---------------------------------------------------------------------------

var _ crawlerServiceInterface = (*service.CrawlerService)(nil)

// verify crawlerSourceRepoInterface and CrawlerSourceRepository compatibility at compile time
var _ crawlerSourceRepoInterface = (*repository.CrawlerSourceRepository)(nil)

// verify crawlerLogRepoInterface and CrawlerLogRepository compatibility at compile time
var _ crawlerLogRepoInterface = (*repository.CrawlerLogRepository)(nil)
