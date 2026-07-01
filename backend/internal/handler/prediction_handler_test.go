package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

type mockPredictionService struct {
	predictFn              func(ctx context.Context, category, spec, region string, horizonDays int) (*service.PredictionResult, error)
	getSeasonalTipsFn      func(ctx context.Context, category string) ([]service.SeasonalTip, error)
	getPredictionForTrendFn func(ctx context.Context, category string, horizonDays int) ([]service.PredictionPoint, error)
}

func (m *mockPredictionService) Predict(ctx context.Context, category, spec, region string, horizonDays int) (*service.PredictionResult, error) {
	if m.predictFn != nil {
		return m.predictFn(ctx, category, spec, region, horizonDays)
	}
	return nil, fmt.Errorf("not implemented")
}

func (m *mockPredictionService) GetSeasonalTips(ctx context.Context, category string) ([]service.SeasonalTip, error) {
	if m.getSeasonalTipsFn != nil {
		return m.getSeasonalTipsFn(ctx, category)
	}
	return nil, fmt.Errorf("not implemented")
}

func (m *mockPredictionService) GetPredictionForTrend(ctx context.Context, category string, horizonDays int) ([]service.PredictionPoint, error) {
	if m.getPredictionForTrendFn != nil {
		return m.getPredictionForTrendFn(ctx, category, horizonDays)
	}
	return nil, fmt.Errorf("not implemented")
}

func setupPredictionRouter(mock *mockPredictionService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &PredictionHandler{predictionService: mock}
	router := gin.New()
	router.GET("/api/v1/prices/predict", handler.GetPrediction)
	router.GET("/api/v1/prices/seasonal-tips", handler.GetSeasonalTips)
	return router
}

func TestGetPrediction_Success(t *testing.T) {
	mock := &mockPredictionService{
		predictFn: func(ctx context.Context, category, spec, region string, horizonDays int) (*service.PredictionResult, error) {
			return &service.PredictionResult{
				Category:   "螺纹钢",
				Spec:       "HRB400E 20mm",
				Region:     "上海",
				Trend:      "up",
				ChangePct:  3.5,
				Confidence: 0.75,
				Disclaimer: "基于历史数据推算，仅供参考，不构成投资建议",
				Points: []service.PredictionPoint{
					{Date: "2026-06-25", Price: 3850, Type: "historical"},
					{Date: "2026-07-01", Price: 3900, Type: "predict", Lower: 3850, Upper: 3950},
				},
			}, nil
		},
	}
	router := setupPredictionRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/prices/predict?category=%E8%9E%BA%E7%BA%B9%E9%92%A2&horizon_days=30", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}

	var resp struct {
		Code int                      `json:"code"`
		Data service.PredictionResult `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
	if resp.Data.Category != "螺纹钢" {
		t.Errorf("category = %s, want 螺纹钢", resp.Data.Category)
	}
	if resp.Data.Trend != "up" {
		t.Errorf("trend = %s, want up", resp.Data.Trend)
	}
}

func TestGetPrediction_MissingCategory(t *testing.T) {
	mock := &mockPredictionService{}
	router := setupPredictionRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/prices/predict?horizon_days=30", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeParamError)
	}
}

func TestGetPrediction_InvalidHorizonDays(t *testing.T) {
	mock := &mockPredictionService{}
	router := setupPredictionRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/prices/predict?category=%E8%9E%BA%E7%BA%B9%E9%92%A2&horizon_days=0", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeParamError)
	}
}

func TestGetPrediction_HorizonExceedsMax(t *testing.T) {
	mock := &mockPredictionService{}
	router := setupPredictionRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/prices/predict?category=%E8%9E%BA%E7%BA%B9%E9%92%A2&horizon_days=100", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeParamError)
	}
}

func TestGetPrediction_ServiceError(t *testing.T) {
	mock := &mockPredictionService{
		predictFn: func(ctx context.Context, category, spec, region string, horizonDays int) (*service.PredictionResult, error) {
			return nil, fmt.Errorf("insufficient data: need at least 10 data points, got 3")
		},
	}
	router := setupPredictionRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/prices/predict?category=unknown&horizon_days=7", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeInternalError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeInternalError)
	}
}

func TestGetSeasonalTips_Success(t *testing.T) {
	mock := &mockPredictionService{
		getSeasonalTipsFn: func(ctx context.Context, category string) ([]service.SeasonalTip, error) {
			return []service.SeasonalTip{
				{Month: 3, MonthName: "3月", AvgChange: 4.5, Tip: "3月通常为需求旺季", Years: 2},
				{Month: 8, MonthName: "8月", AvgChange: -3.2, Tip: "8月历史均价环比下跌", Years: 2},
			}, nil
		},
	}
	router := setupPredictionRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/prices/seasonal-tips?category=%E8%9E%BA%E7%BA%B9%E9%92%A2", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}

	var resp struct {
		Code int                 `json:"code"`
		Data []service.SeasonalTip `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
	if len(resp.Data) != 2 {
		t.Errorf("len(tips) = %d, want 2", len(resp.Data))
	}
	if resp.Data[0].Month != 3 {
		t.Errorf("first tip month = %d, want 3", resp.Data[0].Month)
	}
}

func TestGetSeasonalTips_MissingCategory(t *testing.T) {
	mock := &mockPredictionService{}
	router := setupPredictionRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/prices/seasonal-tips", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeParamError)
	}
}

func TestGetSeasonalTips_ServiceError(t *testing.T) {
	mock := &mockPredictionService{
		getSeasonalTipsFn: func(ctx context.Context, category string) ([]service.SeasonalTip, error) {
			return nil, fmt.Errorf("insufficient data for seasonal analysis")
		},
	}
	router := setupPredictionRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/prices/seasonal-tips?category=unknown", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeInternalError {
		t.Errorf("code = %d, want %d", resp.Code, errors.CodeInternalError)
	}
}

func TestGetSeasonalTips_EmptyResult(t *testing.T) {
	mock := &mockPredictionService{
		getSeasonalTipsFn: func(ctx context.Context, category string) ([]service.SeasonalTip, error) {
			return []service.SeasonalTip{}, nil
		},
	}
	router := setupPredictionRouter(mock)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/prices/seasonal-tips?category=%E8%9E%BA%E7%BA%B9%E9%92%A2", nil)
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
}
