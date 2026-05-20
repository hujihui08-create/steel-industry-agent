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
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

type mockCategoryService struct {
	listCategoriesFn       func(ctx context.Context, typeFilter, statusFilter string) ([]model.Category, error)
	createCategoryFn       func(ctx context.Context, req service.CreateCategoryRequest) (*model.Category, error)
	updateCategoryFn       func(ctx context.Context, id uint, req service.UpdateCategoryRequest) (*model.Category, error)
	deleteCategoryFn       func(ctx context.Context, id uint) error
	toggleCategoryFn       func(ctx context.Context, id uint) (*model.Category, error)
	getEnabledCategoriesFn func(ctx context.Context) (*service.PublicCategoriesResponse, error)
}

func (m *mockCategoryService) ListCategories(ctx context.Context, typeFilter, statusFilter string) ([]model.Category, error) {
	return m.listCategoriesFn(ctx, typeFilter, statusFilter)
}
func (m *mockCategoryService) CreateCategory(ctx context.Context, req service.CreateCategoryRequest) (*model.Category, error) {
	return m.createCategoryFn(ctx, req)
}
func (m *mockCategoryService) UpdateCategory(ctx context.Context, id uint, req service.UpdateCategoryRequest) (*model.Category, error) {
	return m.updateCategoryFn(ctx, id, req)
}
func (m *mockCategoryService) DeleteCategory(ctx context.Context, id uint) error {
	return m.deleteCategoryFn(ctx, id)
}
func (m *mockCategoryService) ToggleCategory(ctx context.Context, id uint) (*model.Category, error) {
	return m.toggleCategoryFn(ctx, id)
}
func (m *mockCategoryService) GetEnabledCategories(ctx context.Context) (*service.PublicCategoriesResponse, error) {
	return m.getEnabledCategoriesFn(ctx)
}

func setupCategoryRouter(mock *mockCategoryService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &CategoryHandler{categoryService: mock}
	router := gin.New()
	router.GET("/admin/categories", handler.ListCategories)
	router.POST("/admin/categories", handler.CreateCategory)
	router.PUT("/admin/categories/:id", handler.UpdateCategory)
	router.DELETE("/admin/categories/:id", handler.DeleteCategory)
	router.PATCH("/admin/categories/:id/toggle", handler.ToggleCategory)
	router.GET("/categories", handler.GetPublicCategories)
	return router
}

func TestCategoryHandler_ListCategories_Success(t *testing.T) {
	mock := &mockCategoryService{
		listCategoriesFn: func(ctx context.Context, typeFilter, statusFilter string) ([]model.Category, error) {
			return []model.Category{
				{ID: 1, Name: "螺纹钢", Type: "spot", Status: "enabled", SortOrder: 1},
				{ID: 2, Name: "热卷", Type: "spot", Status: "enabled", SortOrder: 2},
			}, nil
		},
	}
	router := setupCategoryRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/categories", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int              `json:"code"`
		Message string           `json:"message"`
		Data    []model.Category `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 categories, got %d", len(resp.Data))
	}
	if resp.Data[0].Name != "螺纹钢" {
		t.Errorf("expected name '螺纹钢', got '%s'", resp.Data[0].Name)
	}
}

func TestCategoryHandler_ListCategories_Filter(t *testing.T) {
	mock := &mockCategoryService{
		listCategoriesFn: func(ctx context.Context, typeFilter, statusFilter string) ([]model.Category, error) {
			return []model.Category{
				{ID: 1, Name: "螺纹钢", Type: typeFilter, Status: statusFilter, SortOrder: 1},
			}, nil
		},
	}
	router := setupCategoryRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/categories?type=spot&status=enabled", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int              `json:"code"`
		Message string           `json:"message"`
		Data    []model.Category `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data[0].Type != "spot" {
		t.Errorf("expected type 'spot', got '%s'", resp.Data[0].Type)
	}
}

func TestCategoryHandler_ListCategories_Error(t *testing.T) {
	mock := &mockCategoryService{
		listCategoriesFn: func(ctx context.Context, typeFilter, statusFilter string) ([]model.Category, error) {
			return nil, stderrors.New("db error")
		},
	}
	router := setupCategoryRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/categories", nil)
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

func TestCategoryHandler_CreateCategory_Success(t *testing.T) {
	mock := &mockCategoryService{
		createCategoryFn: func(ctx context.Context, req service.CreateCategoryRequest) (*model.Category, error) {
			return &model.Category{
				ID:   1,
				Name: req.Name, Type: req.Type, Status: "enabled", SortOrder: req.SortOrder,
			}, nil
		},
	}
	router := setupCategoryRouter(mock)

	body := `{"name": "镀锌板", "type": "spot", "sort_order": 5}`
	req, _ := http.NewRequest("POST", "/admin/categories", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int            `json:"code"`
		Message string         `json:"message"`
		Data    model.Category `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Name != "镀锌板" {
		t.Errorf("expected name '镀锌板', got '%s'", resp.Data.Name)
	}
}

func TestCategoryHandler_CreateCategory_InvalidJSON(t *testing.T) {
	mock := &mockCategoryService{}
	router := setupCategoryRouter(mock)

	req, _ := http.NewRequest("POST", "/admin/categories", strings.NewReader(`{invalid`))
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

func TestCategoryHandler_CreateCategory_Duplicate(t *testing.T) {
	mock := &mockCategoryService{
		createCategoryFn: func(ctx context.Context, req service.CreateCategoryRequest) (*model.Category, error) {
			return nil, stderrors.New("品种名称已存在")
		},
	}
	router := setupCategoryRouter(mock)

	body := `{"name": "螺纹钢", "type": "spot", "sort_order": 1}`
	req, _ := http.NewRequest("POST", "/admin/categories", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeConflict {
		t.Errorf("expected code %d, got %d", errors.CodeConflict, resp.Code)
	}
}

func TestCategoryHandler_UpdateCategory_Success(t *testing.T) {
	mock := &mockCategoryService{
		updateCategoryFn: func(ctx context.Context, id uint, req service.UpdateCategoryRequest) (*model.Category, error) {
			return &model.Category{
				ID: id, Name: req.Name, Type: "spot", Status: "enabled", SortOrder: req.SortOrder,
			}, nil
		},
	}
	router := setupCategoryRouter(mock)

	body := `{"name": "螺纹钢(更新)", "type": "spot", "status": "enabled", "sort_order": 10}`
	req, _ := http.NewRequest("PUT", "/admin/categories/1", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int            `json:"code"`
		Message string         `json:"message"`
		Data    model.Category `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestCategoryHandler_UpdateCategory_InvalidID(t *testing.T) {
	mock := &mockCategoryService{}
	router := setupCategoryRouter(mock)

	body := `{"name": "测试"}`
	req, _ := http.NewRequest("PUT", "/admin/categories/abc", strings.NewReader(body))
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

func TestCategoryHandler_UpdateCategory_NotFound(t *testing.T) {
	mock := &mockCategoryService{
		updateCategoryFn: func(ctx context.Context, id uint, req service.UpdateCategoryRequest) (*model.Category, error) {
			return nil, stderrors.New("品种不存在")
		},
	}
	router := setupCategoryRouter(mock)

	body := `{"name": "不存在"}`
	req, _ := http.NewRequest("PUT", "/admin/categories/999", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeNotFound {
		t.Errorf("expected code %d, got %d", errors.CodeNotFound, resp.Code)
	}
}

func TestCategoryHandler_DeleteCategory_Success(t *testing.T) {
	mock := &mockCategoryService{
		deleteCategoryFn: func(ctx context.Context, id uint) error {
			return nil
		},
	}
	router := setupCategoryRouter(mock)

	req, _ := http.NewRequest("DELETE", "/admin/categories/1", nil)
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

func TestCategoryHandler_DeleteCategory_InvalidID(t *testing.T) {
	mock := &mockCategoryService{}
	router := setupCategoryRouter(mock)

	req, _ := http.NewRequest("DELETE", "/admin/categories/abc", nil)
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

func TestCategoryHandler_DeleteCategory_WithPrices(t *testing.T) {
	mock := &mockCategoryService{
		deleteCategoryFn: func(ctx context.Context, id uint) error {
			return stderrors.New("该品种下存在价格数据，无法删除，请先禁用")
		},
	}
	router := setupCategoryRouter(mock)

	req, _ := http.NewRequest("DELETE", "/admin/categories/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeBusinessError {
		t.Errorf("expected code %d, got %d", errors.CodeBusinessError, resp.Code)
	}
}

func TestCategoryHandler_ToggleCategory_Success(t *testing.T) {
	mock := &mockCategoryService{
		toggleCategoryFn: func(ctx context.Context, id uint) (*model.Category, error) {
			return &model.Category{ID: 1, Name: "螺纹钢", Type: "spot", Status: "disabled", SortOrder: 1}, nil
		},
	}
	router := setupCategoryRouter(mock)

	req, _ := http.NewRequest("PATCH", "/admin/categories/1/toggle", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int            `json:"code"`
		Message string         `json:"message"`
		Data    model.Category `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Status != "disabled" {
		t.Errorf("expected status 'disabled', got '%s'", resp.Data.Status)
	}
}

func TestCategoryHandler_ToggleCategory_InvalidID(t *testing.T) {
	mock := &mockCategoryService{}
	router := setupCategoryRouter(mock)

	req, _ := http.NewRequest("PATCH", "/admin/categories/abc/toggle", nil)
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

func TestCategoryHandler_GetPublicCategories_Success(t *testing.T) {
	mock := &mockCategoryService{
		getEnabledCategoriesFn: func(ctx context.Context) (*service.PublicCategoriesResponse, error) {
			return &service.PublicCategoriesResponse{
				Spot: []model.Category{
					{ID: 1, Name: "螺纹钢", Type: "spot", Status: "enabled", SortOrder: 1},
					{ID: 2, Name: "热卷", Type: "spot", Status: "enabled", SortOrder: 2},
				},
				Futures: []model.Category{
					{ID: 3, Name: "螺纹钢期货", Type: "futures", Status: "enabled", SortOrder: 3},
				},
			}, nil
		},
	}
	router := setupCategoryRouter(mock)

	req, _ := http.NewRequest("GET", "/categories", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int                               `json:"code"`
		Message string                             `json:"message"`
		Data    service.PublicCategoriesResponse   `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if len(resp.Data.Spot) != 2 {
		t.Errorf("expected 2 spot categories, got %d", len(resp.Data.Spot))
	}
	if len(resp.Data.Futures) != 1 {
		t.Errorf("expected 1 futures category, got %d", len(resp.Data.Futures))
	}
	if resp.Data.Futures[0].Name != "螺纹钢期货" {
		t.Errorf("expected '螺纹钢期货', got '%s'", resp.Data.Futures[0].Name)
	}
}

func TestCategoryHandler_GetPublicCategories_Error(t *testing.T) {
	mock := &mockCategoryService{
		getEnabledCategoriesFn: func(ctx context.Context) (*service.PublicCategoriesResponse, error) {
			return nil, stderrors.New("db error")
		},
	}
	router := setupCategoryRouter(mock)

	req, _ := http.NewRequest("GET", "/categories", nil)
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
