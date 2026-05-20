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

type mockKnowledgeService struct {
	searchKnowledgeFn  func(ctx context.Context, keyword string, limit, offset int) ([]model.Knowledge, error)
	getStandardListFn  func(ctx context.Context, limit, offset int) ([]model.Knowledge, error)
	getTermListFn      func(ctx context.Context, limit, offset int) ([]model.Knowledge, error)
	getStandardDetailFn func(ctx context.Context, id uint) (*model.Knowledge, error)
	compareGradesFn    func(ctx context.Context, grade1, grade2 string) ([]model.Knowledge, error)
	getTermDetailFn    func(ctx context.Context, id uint) (*model.Knowledge, error)
	convertUnitFn      func(ctx context.Context, value float64, from, to string) (float64, error)
	calculateWeightFn  func(ctx context.Context, category, spec string, quantity float64) (float64, error)
}

func (m *mockKnowledgeService) SearchKnowledge(ctx context.Context, keyword string, limit, offset int) ([]model.Knowledge, error) {
	return m.searchKnowledgeFn(ctx, keyword, limit, offset)
}

func (m *mockKnowledgeService) GetStandardList(ctx context.Context, limit, offset int) ([]model.Knowledge, error) {
	return m.getStandardListFn(ctx, limit, offset)
}

func (m *mockKnowledgeService) GetTermList(ctx context.Context, limit, offset int) ([]model.Knowledge, error) {
	return m.getTermListFn(ctx, limit, offset)
}

func (m *mockKnowledgeService) GetStandardDetail(ctx context.Context, id uint) (*model.Knowledge, error) {
	return m.getStandardDetailFn(ctx, id)
}

func (m *mockKnowledgeService) CompareGrades(ctx context.Context, grade1, grade2 string) ([]model.Knowledge, error) {
	return m.compareGradesFn(ctx, grade1, grade2)
}

func (m *mockKnowledgeService) GetTermDetail(ctx context.Context, id uint) (*model.Knowledge, error) {
	return m.getTermDetailFn(ctx, id)
}

func (m *mockKnowledgeService) ConvertUnit(ctx context.Context, value float64, from, to string) (float64, error) {
	return m.convertUnitFn(ctx, value, from, to)
}

func (m *mockKnowledgeService) CalculateWeight(ctx context.Context, category, spec string, quantity float64) (float64, error) {
	return m.calculateWeightFn(ctx, category, spec, quantity)
}

func setupKnowledgeRouter(mock *mockKnowledgeService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &KnowledgeHandler{knowledgeService: mock}
	router := gin.New()
	router.GET("/api/v1/knowledge/search", handler.SearchKnowledge)
	router.GET("/api/v1/standards", handler.GetStandardList)
	router.GET("/api/v1/standards/:id", handler.GetStandardDetail)
	router.GET("/api/v1/grades/compare", handler.CompareGrades)
	router.GET("/api/v1/terms", handler.GetTermList)
	router.GET("/api/v1/terms/:id", handler.GetTermDetail)
	router.POST("/api/v1/tools/convert", handler.ConvertUnit)
	router.POST("/api/v1/tools/weight", handler.CalculateWeight)
	return router
}

func TestSearchKnowledge_Success(t *testing.T) {
	mock := &mockKnowledgeService{
		searchKnowledgeFn: func(ctx context.Context, keyword string, limit, offset int) ([]model.Knowledge, error) {
			return []model.Knowledge{
				{ID: 1, Title: "螺纹钢国标", Type: "standard", Category: "螺纹钢"},
				{ID: 2, Title: "热轧卷板标准", Type: "standard", Category: "热卷"},
			}, nil
		},
	}
	router := setupKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/knowledge/search?keyword=螺纹钢", nil)
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

func TestSearchKnowledge_Error(t *testing.T) {
	mock := &mockKnowledgeService{
		searchKnowledgeFn: func(ctx context.Context, keyword string, limit, offset int) ([]model.Knowledge, error) {
			return nil, stderrors.New("search failed")
		},
	}
	router := setupKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/knowledge/search?keyword=xxx", nil)
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

func TestGetStandardList_Success(t *testing.T) {
	mock := &mockKnowledgeService{
		getStandardListFn: func(ctx context.Context, limit, offset int) ([]model.Knowledge, error) {
			return []model.Knowledge{
				{ID: 1, Title: "GB/T 1499.2-2018", Type: "standard"},
			}, nil
		},
	}
	router := setupKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/standards", nil)
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

func TestGetStandardDetail_Success(t *testing.T) {
	mock := &mockKnowledgeService{
		getStandardDetailFn: func(ctx context.Context, id uint) (*model.Knowledge, error) {
			return &model.Knowledge{
				ID:         1,
				Title:      "GB/T 1499.2-2018",
				Type:       "standard",
				Content:    "钢筋混凝土用钢 第2部分：热轧带肋钢筋",
				StandardNo: "GB/T 1499.2-2018",
			}, nil
		},
	}
	router := setupKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/standards/1", nil)
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

func TestGetStandardDetail_InvalidID(t *testing.T) {
	mock := &mockKnowledgeService{
		getStandardDetailFn: func(ctx context.Context, id uint) (*model.Knowledge, error) {
			return nil, nil
		},
	}
	router := setupKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/standards/abc", nil)
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

func TestCompareGrades_Success(t *testing.T) {
	mock := &mockKnowledgeService{
		compareGradesFn: func(ctx context.Context, grade1, grade2 string) ([]model.Knowledge, error) {
			return []model.Knowledge{
				{ID: 1, Title: "HRB400", Type: "grade"},
				{ID: 2, Title: "HRB500", Type: "grade"},
			}, nil
		},
	}
	router := setupKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/grades/compare?grade1=HRB400&grade2=HRB500", nil)
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

func TestGetTermList_Success(t *testing.T) {
	mock := &mockKnowledgeService{
		getTermListFn: func(ctx context.Context, limit, offset int) ([]model.Knowledge, error) {
			return []model.Knowledge{
				{ID: 1, Title: "屈服强度", Type: "term"},
			}, nil
		},
	}
	router := setupKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/terms", nil)
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

func TestGetTermDetail_Success(t *testing.T) {
	mock := &mockKnowledgeService{
		getTermDetailFn: func(ctx context.Context, id uint) (*model.Knowledge, error) {
			return &model.Knowledge{
				ID:      1,
				Title:   "屈服强度",
				Type:    "term",
				Content: "钢材在屈服阶段所能承受的应力值",
			}, nil
		},
	}
	router := setupKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/terms/1", nil)
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

func TestGetTermDetail_InvalidID(t *testing.T) {
	mock := &mockKnowledgeService{
		getTermDetailFn: func(ctx context.Context, id uint) (*model.Knowledge, error) {
			return nil, nil
		},
	}
	router := setupKnowledgeRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/terms/abc", nil)
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

func TestConvertUnit_Success(t *testing.T) {
	mock := &mockKnowledgeService{
		convertUnitFn: func(ctx context.Context, value float64, from, to string) (float64, error) {
			return 1000.0, nil
		},
	}
	router := setupKnowledgeRouter(mock)

	body := `{"value": 1, "from": "ton", "to": "kg"}`
	req, _ := http.NewRequest("POST", "/api/v1/tools/convert", strings.NewReader(body))
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

func TestConvertUnit_InvalidBody(t *testing.T) {
	mock := &mockKnowledgeService{
		convertUnitFn: func(ctx context.Context, value float64, from, to string) (float64, error) {
			return 0, nil
		},
	}
	router := setupKnowledgeRouter(mock)

	body := `{}`
	req, _ := http.NewRequest("POST", "/api/v1/tools/convert", strings.NewReader(body))
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

func TestCalculateWeight_Success(t *testing.T) {
	mock := &mockKnowledgeService{
		calculateWeightFn: func(ctx context.Context, category, spec string, quantity float64) (float64, error) {
			return 1550.0, nil
		},
	}
	router := setupKnowledgeRouter(mock)

	body := `{"category": "螺纹钢", "spec": "20mm", "quantity": 10}`
	req, _ := http.NewRequest("POST", "/api/v1/tools/weight", strings.NewReader(body))
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

func TestCalculateWeight_InvalidBody(t *testing.T) {
	mock := &mockKnowledgeService{
		calculateWeightFn: func(ctx context.Context, category, spec string, quantity float64) (float64, error) {
			return 0, nil
		},
	}
	router := setupKnowledgeRouter(mock)

	body := `{}`
	req, _ := http.NewRequest("POST", "/api/v1/tools/weight", strings.NewReader(body))
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
