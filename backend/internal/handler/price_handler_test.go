package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

type mockPriceService struct {
	getLatestPriceFn  func(ctx context.Context, category string) (*model.SteelPrice, error)
	getPriceTrendFn   func(ctx context.Context, category string, days int) ([]model.SteelPrice, error)
	getPriceListFn    func(ctx context.Context, category, region string, limit, offset int) ([]model.SteelPrice, error)
	comparePricesFn   func(ctx context.Context, categories []string) (map[string]*model.SteelPrice, error)
	getNewsListFn     func(ctx context.Context, limit, offset int) ([]model.News, error)
	getNewsDetailFn   func(ctx context.Context, id uint) (*model.News, error)
	getDailyReportFn  func(ctx context.Context) (map[string]interface{}, error)
	getWeeklyReportFn func(ctx context.Context) (map[string]interface{}, error)
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
		getPriceListFn: func(ctx context.Context, category, region string, limit, offset int) ([]model.SteelPrice, error) {
			return []model.SteelPrice{
				{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3850, Region: "上海"},
				{Category: "热卷", Spec: "5.5mm", Price: 4200, Region: "上海"},
			}, nil
		},
	}
	router := setupPriceRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/prices?category=%E8%9E%BA%E7%BA%B9%E9%92%A2", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int              `json:"code"`
		Data []model.SteelPrice `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 || len(resp.Data) != 2 {
		t.Errorf("code = %d, len = %d", resp.Code, len(resp.Data))
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
