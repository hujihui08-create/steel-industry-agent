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

type mockAdminKnowledgeService struct {
	listKnowledgeFn        func(ctx context.Context, knowledgeType, status, category, keyword string, limit, offset int) ([]model.Knowledge, int64, error)
	createKnowledgeFn      func(ctx context.Context, k *model.Knowledge) error
	updateKnowledgeFn      func(ctx context.Context, id uint, k *model.Knowledge) error
	deleteKnowledgeFn      func(ctx context.Context, id uint) error
	getKnowledgeDetailFn   func(ctx context.Context, id uint) (*model.Knowledge, error)
	getStatsFn             func(ctx context.Context) (*model.KnowledgeStats, error)
	triggerVectorizationFn func(ctx context.Context, id uint) error
	batchImportFn          func(ctx context.Context, files []struct {
		FileName string `json:"file_name"`
		Content  string `json:"content"`
	}, autoVectorize bool) ([]uint, error)
	testSearchFn       func(ctx context.Context, req *model.RAGSearchRequest) ([]model.RAGSearchResult, error)
	getSearchHistoryFn func(ctx context.Context, limit, offset int) ([]model.RAGSearchHistory, int64, error)
	getRAGConfigFn     func(ctx context.Context) *model.RAGConfig
	updateRAGConfigFn  func(ctx context.Context, cfg *model.RAGConfig) error
}

func (m *mockAdminKnowledgeService) AdminListKnowledge(ctx context.Context, knowledgeType, status, category, keyword string, limit, offset int) ([]model.Knowledge, int64, error) {
	return m.listKnowledgeFn(ctx, knowledgeType, status, category, keyword, limit, offset)
}

func (m *mockAdminKnowledgeService) AdminCreateKnowledge(ctx context.Context, k *model.Knowledge) error {
	return m.createKnowledgeFn(ctx, k)
}

func (m *mockAdminKnowledgeService) AdminUpdateKnowledge(ctx context.Context, id uint, k *model.Knowledge) error {
	return m.updateKnowledgeFn(ctx, id, k)
}

func (m *mockAdminKnowledgeService) AdminDeleteKnowledge(ctx context.Context, id uint) error {
	return m.deleteKnowledgeFn(ctx, id)
}

func (m *mockAdminKnowledgeService) AdminGetKnowledgeDetail(ctx context.Context, id uint) (*model.Knowledge, error) {
	return m.getKnowledgeDetailFn(ctx, id)
}

func (m *mockAdminKnowledgeService) AdminGetStats(ctx context.Context) (*model.KnowledgeStats, error) {
	return m.getStatsFn(ctx)
}

func (m *mockAdminKnowledgeService) AdminTriggerVectorization(ctx context.Context, id uint) error {
	return m.triggerVectorizationFn(ctx, id)
}

func (m *mockAdminKnowledgeService) AdminBatchImport(ctx context.Context, files []struct {
	FileName string `json:"file_name"`
	Content  string `json:"content"`
}, autoVectorize bool) ([]uint, error) {
	return m.batchImportFn(ctx, files, autoVectorize)
}

func (m *mockAdminKnowledgeService) TestSearch(ctx context.Context, req *model.RAGSearchRequest) ([]model.RAGSearchResult, error) {
	return m.testSearchFn(ctx, req)
}

func (m *mockAdminKnowledgeService) GetSearchHistory(ctx context.Context, limit, offset int) ([]model.RAGSearchHistory, int64, error) {
	return m.getSearchHistoryFn(ctx, limit, offset)
}

func (m *mockAdminKnowledgeService) GetRAGConfig(ctx context.Context) *model.RAGConfig {
	return m.getRAGConfigFn(ctx)
}

func (m *mockAdminKnowledgeService) UpdateRAGConfig(ctx context.Context, cfg *model.RAGConfig) error {
	return m.updateRAGConfigFn(ctx, cfg)
}

func setupAdminKnowledgeRouter(mock *mockAdminKnowledgeService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &AdminKnowledgeHandler{knowledgeService: mock}
	router := gin.New()

	router.GET("/api/v1/admin/knowledge", handler.ListKnowledge)
	router.POST("/api/v1/admin/knowledge", handler.CreateKnowledge)
	router.PUT("/api/v1/admin/knowledge/:id", handler.UpdateKnowledge)
	router.DELETE("/api/v1/admin/knowledge/:id", handler.DeleteKnowledge)
	router.GET("/api/v1/admin/knowledge/:id", handler.GetKnowledgeDetail)
	router.GET("/api/v1/admin/knowledge/stats", handler.GetStats)
	router.POST("/api/v1/admin/knowledge/:id/vectorize", handler.TriggerVectorization)
	router.POST("/api/v1/admin/knowledge/batch-import", handler.BatchImport)
	router.POST("/api/v1/admin/knowledge/test-search", handler.TestSearch)
	router.GET("/api/v1/admin/knowledge/search-history", handler.GetSearchHistory)
	router.GET("/api/v1/admin/knowledge/rag-config", handler.GetRAGConfig)
	router.PUT("/api/v1/admin/knowledge/rag-config", handler.UpdateRAGConfig)

	return router
}

func TestAdminListKnowledge_Success(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		listKnowledgeFn: func(ctx context.Context, knowledgeType, status, category, keyword string, limit, offset int) ([]model.Knowledge, int64, error) {
			return []model.Knowledge{
				{ID: 1, Title: "螺纹钢国标", Type: "standard", Category: "螺纹钢"},
				{ID: 2, Title: "热轧卷板标准", Type: "standard", Category: "热卷"},
			}, 2, nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/knowledge?type=standard&limit=10&offset=0", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			Total int64 `json:"total"`
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

func TestAdminListKnowledge_Empty(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		listKnowledgeFn: func(ctx context.Context, knowledgeType, status, category, keyword string, limit, offset int) ([]model.Knowledge, int64, error) {
			return []model.Knowledge{}, 0, nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/knowledge", nil)
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

func TestAdminListKnowledge_Error(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		listKnowledgeFn: func(ctx context.Context, knowledgeType, status, category, keyword string, limit, offset int) ([]model.Knowledge, int64, error) {
			return nil, 0, stderrors.New("database error")
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/knowledge", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeInternalError {
		t.Errorf("expected code %d, got %d", errors.CodeInternalError, resp.Code)
	}
}

func TestAdminCreateKnowledge_Success(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		createKnowledgeFn: func(ctx context.Context, k *model.Knowledge) error {
			k.ID = 1
			return nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	body := `{"type": "standard", "title": "螺纹钢国标", "category": "螺纹钢", "content": "GB/T 1499.2-2018"}`
	req, _ := http.NewRequest("POST", "/api/v1/admin/knowledge", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
		Data struct {
			ID uint `json:"id"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.ID != 1 {
		t.Errorf("expected id 1, got %d", resp.Data.ID)
	}
}

func TestAdminCreateKnowledge_MissingRequired(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		createKnowledgeFn: func(ctx context.Context, k *model.Knowledge) error {
			return nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	body := `{"title": "No Type"}`
	req, _ := http.NewRequest("POST", "/api/v1/admin/knowledge", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d, got %d", errors.CodeParamError, resp.Code)
	}
}

func TestAdminCreateKnowledge_ServiceError(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		createKnowledgeFn: func(ctx context.Context, k *model.Knowledge) error {
			return stderrors.New("duplicate entry")
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	body := `{"type": "standard", "title": "Duplicate"}`
	req, _ := http.NewRequest("POST", "/api/v1/admin/knowledge", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeInternalError {
		t.Errorf("expected code %d, got %d", errors.CodeInternalError, resp.Code)
	}
}

func TestAdminUpdateKnowledge_Success(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		updateKnowledgeFn: func(ctx context.Context, id uint, k *model.Knowledge) error {
			return nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	body := `{"title": "Updated Title"}`
	req, _ := http.NewRequest("PUT", "/api/v1/admin/knowledge/1", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestAdminUpdateKnowledge_InvalidID(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		updateKnowledgeFn: func(ctx context.Context, id uint, k *model.Knowledge) error {
			return nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	req, _ := http.NewRequest("PUT", "/api/v1/admin/knowledge/abc", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d, got %d", errors.CodeParamError, resp.Code)
	}
}

func TestAdminDeleteKnowledge_Success(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		deleteKnowledgeFn: func(ctx context.Context, id uint) error {
			return nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	req, _ := http.NewRequest("DELETE", "/api/v1/admin/knowledge/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestAdminDeleteKnowledge_InvalidID(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		deleteKnowledgeFn: func(ctx context.Context, id uint) error {
			return nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	req, _ := http.NewRequest("DELETE", "/api/v1/admin/knowledge/abc", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d, got %d", errors.CodeParamError, resp.Code)
	}
}

func TestAdminGetKnowledgeDetail_Success(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		getKnowledgeDetailFn: func(ctx context.Context, id uint) (*model.Knowledge, error) {
			return &model.Knowledge{
				ID:    1,
				Title: "螺纹钢国标",
				Type:  "standard",
			}, nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/knowledge/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestAdminGetKnowledgeDetail_NotFound(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		getKnowledgeDetailFn: func(ctx context.Context, id uint) (*model.Knowledge, error) {
			return nil, stderrors.New("not found")
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/knowledge/999", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeNotFound {
		t.Errorf("expected code %d, got %d", errors.CodeNotFound, resp.Code)
	}
}

func TestAdminGetKnowledgeDetail_InvalidID(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		getKnowledgeDetailFn: func(ctx context.Context, id uint) (*model.Knowledge, error) {
			return nil, nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/knowledge/abc", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d, got %d", errors.CodeParamError, resp.Code)
	}
}

func TestAdminGetStats_Success(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		getStatsFn: func(ctx context.Context) (*model.KnowledgeStats, error) {
			return &model.KnowledgeStats{
				Total:           150,
				Vectorized:      120,
				Pending:         20,
				Failed:          10,
				VectorDimension: 1536,
			}, nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/knowledge/stats", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
		Data struct {
			Total     int64 `json:"total"`
			Vectorized int64 `json:"vectorized"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Total != 150 {
		t.Errorf("expected total 150, got %d", resp.Data.Total)
	}
}

func TestAdminGetStats_Error(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		getStatsFn: func(ctx context.Context) (*model.KnowledgeStats, error) {
			return nil, stderrors.New("database error")
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/knowledge/stats", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeInternalError {
		t.Errorf("expected code %d, got %d", errors.CodeInternalError, resp.Code)
	}
}

func TestAdminTriggerVectorization_Success(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		triggerVectorizationFn: func(ctx context.Context, id uint) error {
			return nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	req, _ := http.NewRequest("POST", "/api/v1/admin/knowledge/1/vectorize", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestAdminTriggerVectorization_InvalidID(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		triggerVectorizationFn: func(ctx context.Context, id uint) error {
			return nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	req, _ := http.NewRequest("POST", "/api/v1/admin/knowledge/abc/vectorize", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d, got %d", errors.CodeParamError, resp.Code)
	}
}

func TestAdminBatchImport_Success(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		batchImportFn: func(ctx context.Context, files []struct {
			FileName string `json:"file_name"`
			Content  string `json:"content"`
		}, autoVectorize bool) ([]uint, error) {
			return []uint{1, 2, 3}, nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	body := `{"files": [{"file_name": "test.md", "content": "test content"}, {"file_name": "test2.md", "content": "test content 2"}], "auto_vectorize": true}`
	req, _ := http.NewRequest("POST", "/api/v1/admin/knowledge/batch-import", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
		Data struct {
			Count int `json:"count"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Count != 3 {
		t.Errorf("expected count 3, got %d", resp.Data.Count)
	}
}

func TestAdminBatchImport_EmptyFiles(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		batchImportFn: func(ctx context.Context, files []struct {
			FileName string `json:"file_name"`
			Content  string `json:"content"`
		}, autoVectorize bool) ([]uint, error) {
			return nil, nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	body := `{"files": []}`
	req, _ := http.NewRequest("POST", "/api/v1/admin/knowledge/batch-import", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d, got %d", errors.CodeParamError, resp.Code)
	}
}

func TestAdminTestSearch_Success(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		testSearchFn: func(ctx context.Context, req *model.RAGSearchRequest) ([]model.RAGSearchResult, error) {
			return []model.RAGSearchResult{
				{Rank: 1, Score: 0.95, DocumentID: 1, DocumentTitle: "螺纹钢国标", ChunkContent: "GB/T 1499.2-2018"},
			}, nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	body := `{"query": "螺纹钢标准", "top_k": 5, "threshold": 0.7}`
	req, _ := http.NewRequest("POST", "/api/v1/admin/knowledge/test-search", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestAdminTestSearch_MissingQuery(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		testSearchFn: func(ctx context.Context, req *model.RAGSearchRequest) ([]model.RAGSearchResult, error) {
			return nil, nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	body := `{"top_k": 5}`
	req, _ := http.NewRequest("POST", "/api/v1/admin/knowledge/test-search", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d, got %d", errors.CodeParamError, resp.Code)
	}
}

func TestAdminGetSearchHistory_Success(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		getSearchHistoryFn: func(ctx context.Context, limit, offset int) ([]model.RAGSearchHistory, int64, error) {
			return []model.RAGSearchHistory{
				{ID: 1, Query: "螺纹钢", ResultCount: 5},
				{ID: 2, Query: "热卷", ResultCount: 3},
			}, 2, nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/knowledge/search-history?limit=10&offset=0", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
		Data struct {
			Total int64 `json:"total"`
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

func TestAdminGetRAGConfig_Success(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		getRAGConfigFn: func(ctx context.Context) *model.RAGConfig {
			return &model.RAGConfig{
				EmbeddingModel:   "text-embedding-3-small",
				ChunkSize:        512,
				DefaultTopK:      5,
				DefaultThreshold: 0.7,
				SearchMode:       "hybrid",
			}
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/knowledge/rag-config", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
		Data struct {
			EmbeddingModel string `json:"embedding_model"`
			ChunkSize      int    `json:"chunk_size"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.EmbeddingModel != "text-embedding-3-small" {
		t.Errorf("expected embedding_model 'text-embedding-3-small', got '%s'", resp.Data.EmbeddingModel)
	}
}

func TestAdminUpdateRAGConfig_Success(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		updateRAGConfigFn: func(ctx context.Context, cfg *model.RAGConfig) error {
			return nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	body := `{"embedding_model": "text-embedding-3-large", "chunk_size": 1024, "default_top_k": 10, "default_threshold": 0.8, "search_mode": "hybrid"}`
	req, _ := http.NewRequest("PUT", "/api/v1/admin/knowledge/rag-config", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestAdminUpdateRAGConfig_InvalidBody(t *testing.T) {
	mock := &mockAdminKnowledgeService{
		updateRAGConfigFn: func(ctx context.Context, cfg *model.RAGConfig) error {
			return nil
		},
	}
	router := setupAdminKnowledgeRouter(mock)

	body := `invalid json`
	req, _ := http.NewRequest("PUT", "/api/v1/admin/knowledge/rag-config", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d, got %d", errors.CodeParamError, resp.Code)
	}
}
