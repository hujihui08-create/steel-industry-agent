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
	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

type mockPriceService struct {
	getLatestPriceFn          func(ctx context.Context, category string) (*model.SteelPrice, error)
	getPriceTrendFn           func(ctx context.Context, category string, days int) ([]model.SteelPrice, error)
	getPriceListFn            func(ctx context.Context, category, region string, limit, offset int) ([]model.SteelPrice, error)
	getPriceListWithCountFn   func(ctx context.Context, category, spec, region string, limit, offset int) ([]model.SteelPrice, int64, error)
	comparePricesFn           func(ctx context.Context, categories []string) (map[string]*model.SteelPrice, error)
	createPriceFn             func(ctx context.Context, price *model.SteelPrice) error
	updatePriceFn             func(ctx context.Context, price *model.SteelPrice) error
	deletePriceFn             func(ctx context.Context, id uint) error
	batchImportPricesFn       func(ctx context.Context, prices []*model.SteelPrice) error
	getNewsListFn             func(ctx context.Context, limit, offset int) ([]model.News, error)
	getNewsDetailFn           func(ctx context.Context, id uint) (*model.News, error)
	getDailyReportFn          func(ctx context.Context) (map[string]interface{}, error)
	getWeeklyReportFn         func(ctx context.Context) (map[string]interface{}, error)
}

func (m *mockPriceService) GetLatestPrice(ctx context.Context, category string) (*model.SteelPrice, error) {
	return m.getLatestPriceFn(ctx, category)
}

func (m *mockPriceService) GetPriceTrend(ctx context.Context, category string, days int) ([]model.SteelPrice, error) {
	return m.getPriceTrendFn(ctx, category, days)
}

func (m *mockPriceService) GetPriceList(ctx context.Context, category, region string, limit, offset int) ([]model.SteelPrice, error) {
	return m.getPriceListFn(ctx, category, region, limit, offset)
}

func (m *mockPriceService) ComparePrices(ctx context.Context, categories []string) (map[string]*model.SteelPrice, error) {
	return m.comparePricesFn(ctx, categories)
}

func (m *mockPriceService) GetPriceListWithCount(ctx context.Context, category, spec, region string, limit, offset int) ([]model.SteelPrice, int64, error) {
	if m.getPriceListWithCountFn != nil {
		return m.getPriceListWithCountFn(ctx, category, spec, region, limit, offset)
	}
	prices, err := m.getPriceListFn(ctx, category, region, limit, offset)
	return prices, int64(len(prices)), err
}

func (m *mockPriceService) CreatePrice(ctx context.Context, price *model.SteelPrice) error {
	if m.createPriceFn != nil {
		return m.createPriceFn(ctx, price)
	}
	return nil
}

func (m *mockPriceService) UpdatePrice(ctx context.Context, price *model.SteelPrice) error {
	if m.updatePriceFn != nil {
		return m.updatePriceFn(ctx, price)
	}
	return nil
}

func (m *mockPriceService) DeletePrice(ctx context.Context, id uint) error {
	if m.deletePriceFn != nil {
		return m.deletePriceFn(ctx, id)
	}
	return nil
}

func (m *mockPriceService) BatchImportPrices(ctx context.Context, prices []*model.SteelPrice) error {
	if m.batchImportPricesFn != nil {
		return m.batchImportPricesFn(ctx, prices)
	}
	return nil
}

func (m *mockPriceService) GetNewsList(ctx context.Context, limit, offset int) ([]model.News, error) {
	return m.getNewsListFn(ctx, limit, offset)
}

func (m *mockPriceService) GetNewsDetail(ctx context.Context, id uint) (*model.News, error) {
	return m.getNewsDetailFn(ctx, id)
}

func (m *mockPriceService) GetDailyReport(ctx context.Context) (map[string]interface{}, error) {
	return m.getDailyReportFn(ctx)
}

func (m *mockPriceService) GetWeeklyReport(ctx context.Context) (map[string]interface{}, error) {
	return m.getWeeklyReportFn(ctx)
}

func setupPriceRouter(mock *mockPriceService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &PriceHandler{priceService: mock}
	router := gin.New()
	router.GET("/api/v1/prices/latest", handler.GetLatestPrice)
	router.GET("/api/v1/prices", handler.GetPriceList)
	router.GET("/api/v1/prices/trend", handler.GetPriceTrend)
	router.GET("/api/v1/prices/compare", handler.ComparePrices)
	router.GET("/api/v1/news", handler.GetNewsList)
	router.GET("/api/v1/news/:id", handler.GetNewsDetail)
	router.GET("/api/v1/reports/daily", handler.GetDailyReport)
	router.GET("/api/v1/reports/weekly", handler.GetWeeklyReport)
	router.POST("/admin/prices", handler.CreatePrice)
	router.PUT("/admin/prices/:id", handler.UpdatePrice)
	router.DELETE("/admin/prices/:id", handler.DeletePrice)
	router.POST("/admin/prices/batch-import", handler.BatchImportPrices)
	return router
}

func TestGetLatestPrice_Success(t *testing.T) {
	mock := &mockPriceService{
		getLatestPriceFn: func(ctx context.Context, category string) (*model.SteelPrice, error) {
			return &model.SteelPrice{
				Category: "螺纹钢",
				Spec:     "HRB400E 20mm",
				Price:    3850,
				Region:   "上海",
			}, nil
		},
	}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/prices/latest?category=%E8%9E%BA%E7%BA%B9%E9%92%A2", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}

	var resp struct {
		Code int                   `json:"code"`
		Data *model.SteelPrice     `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
}

func TestGetLatestPrice_Error(t *testing.T) {
	mock := &mockPriceService{
		getLatestPriceFn: func(ctx context.Context, category string) (*model.SteelPrice, error) {
			return nil, fmt.Errorf("price not found")
		},
	}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/prices/latest?category=unknown", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeInternalError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeInternalError)
	}
}

func TestGetPriceList_Success(t *testing.T) {
	mock := &mockPriceService{
		getPriceListWithCountFn: func(ctx context.Context, category, spec, region string, limit, offset int) ([]model.SteelPrice, int64, error) {
			return []model.SteelPrice{
				{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3850, Region: "上海"},
				{Category: "热卷", Spec: "5.5mm", Price: 4200, Region: "上海"},
			}, 2, nil
		},
	}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/prices?category=%E8%9E%BA%E7%BA%B9%E9%92%A2", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int                    `json:"code"`
		Data struct {
			Items  []model.SteelPrice `json:"items"`
			Total  int64              `json:"total"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 || len(resp.Data.Items) != 2 || resp.Data.Total != 2 {
		t.Errorf("code = %d, len = %d, total = %d", resp.Code, len(resp.Data.Items), resp.Data.Total)
	}
}

func TestGetPriceTrend_Success(t *testing.T) {
	now := time.Now()
	mock := &mockPriceService{
		getPriceTrendFn: func(ctx context.Context, category string, days int) ([]model.SteelPrice, error) {
			return []model.SteelPrice{
				{Category: "螺纹钢", Price: 3800, PriceDate: now},
				{Category: "螺纹钢", Price: 3850, PriceDate: now.Add(24 * time.Hour)},
			}, nil
		},
	}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/prices/trend?category=%E8%9E%BA%E7%BA%B9%E9%92%A2&days=7", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
}

func TestCreatePrice_Success(t *testing.T) {
	mock := &mockPriceService{
		createPriceFn: func(ctx context.Context, price *model.SteelPrice) error {
			return nil
		},
	}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/admin/prices", strings.NewReader(`{"category":"螺纹钢","spec":"HRB400E 20mm","price":3850,"region":"上海","price_date":"2026-05-26T00:00:00Z"}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
}

func TestCreatePrice_MissingCategory(t *testing.T) {
	mock := &mockPriceService{}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/admin/prices", strings.NewReader(`{"spec":"HRB400E 20mm","price":3850,"region":"上海","price_date":"2026-05-26T00:00:00Z"}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeParamError)
	}
}

func TestCreatePrice_MissingPrice(t *testing.T) {
	mock := &mockPriceService{}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/admin/prices", strings.NewReader(`{"category":"螺纹钢","spec":"HRB400E 20mm","region":"上海","price_date":"2026-05-26T00:00:00Z"}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeParamError)
	}
}

func TestUpdatePrice_Success(t *testing.T) {
	mock := &mockPriceService{
		updatePriceFn: func(ctx context.Context, price *model.SteelPrice) error {
			return nil
		},
	}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/admin/prices/1", strings.NewReader(`{"category":"螺纹钢","spec":"HRB400E 20mm","price":3900,"region":"上海","price_date":"2026-05-26T00:00:00Z"}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
}

func TestUpdatePrice_InvalidID(t *testing.T) {
	mock := &mockPriceService{}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/admin/prices/abc", strings.NewReader(`{"category":"螺纹钢","price":3900}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeParamError)
	}
}

func TestDeletePrice_Success(t *testing.T) {
	mock := &mockPriceService{
		deletePriceFn: func(ctx context.Context, id uint) error {
			return nil
		},
	}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/admin/prices/1", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
}

func TestBatchImportPrices_Success(t *testing.T) {
	mock := &mockPriceService{
		batchImportPricesFn: func(ctx context.Context, prices []*model.SteelPrice) error {
			return nil
		},
	}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/admin/prices/batch-import", strings.NewReader(`[{"category":"螺纹钢","spec":"HRB400E 20mm","price":3850,"region":"上海","price_date":"2026-05-26T00:00:00Z"},{"category":"热卷","spec":"5.5mm","price":4200,"region":"上海","price_date":"2026-05-26T00:00:00Z"},{"category":"冷轧","spec":"1.0mm","price":5200,"region":"上海","price_date":"2026-05-26T00:00:00Z"}]`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
}

func TestBatchImportPrices_EmptyArray(t *testing.T) {
	mock := &mockPriceService{}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/admin/prices/batch-import", strings.NewReader(`[]`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeParamError)
	}
}

func TestComparePrices_Success(t *testing.T) {
	mock := &mockPriceService{
		comparePricesFn: func(ctx context.Context, categories []string) (map[string]*model.SteelPrice, error) {
			return map[string]*model.SteelPrice{
				"螺纹钢": {Category: "螺纹钢", Price: 3850},
				"热卷":   {Category: "热卷", Price: 4200},
			}, nil
		},
	}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/prices/compare?categories=%E8%9E%BA%E7%BA%B9%E9%92%A2,%E7%83%AD%E5%8D%B7", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
}

func TestGetNewsList_Success(t *testing.T) {
	mock := &mockPriceService{
		getNewsListFn: func(ctx context.Context, limit, offset int) ([]model.News, error) {
			return []model.News{
				{Title: "钢铁行业周报", Source: "中钢协"},
			}, nil
		},
	}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/news", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
}

func TestGetNewsDetail_Success(t *testing.T) {
	mock := &mockPriceService{
		getNewsDetailFn: func(ctx context.Context, id uint) (*model.News, error) {
			return &model.News{Title: "钢铁行业周报", Content: "详细内容..."}, nil
		},
	}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/news/1", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
}

func TestGetNewsDetail_InvalidID(t *testing.T) {
	mock := &mockPriceService{}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/news/abc", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeParamError)
	}
}

func TestGetDailyReport_Success(t *testing.T) {
	mock := &mockPriceService{
		getDailyReportFn: func(ctx context.Context) (map[string]interface{}, error) {
			return map[string]interface{}{"total": 50, "up": 20, "down": 15, "flat": 15}, nil
		},
	}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/reports/daily", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
}

func TestGetWeeklyReport_Success(t *testing.T) {
	mock := &mockPriceService{
		getWeeklyReportFn: func(ctx context.Context) (map[string]interface{}, error) {
			return map[string]interface{}{"categories": []string{"螺纹钢", "热卷"}}, nil
		},
	}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/reports/weekly", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
}
