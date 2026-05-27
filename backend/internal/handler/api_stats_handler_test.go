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

type mockApiStatsService struct {
	overviewFn      func(ctx context.Context) (map[string]interface{}, error)
	endpointStatsFn func(ctx context.Context) ([]model.EndpointStat, error)
}

func (m *mockApiStatsService) GetOverview(ctx context.Context) (map[string]interface{}, error) {
	if m.overviewFn != nil {
		return m.overviewFn(ctx)
	}
	return nil, nil
}

func (m *mockApiStatsService) GetEndpointStats(ctx context.Context) ([]model.EndpointStat, error) {
	if m.endpointStatsFn != nil {
		return m.endpointStatsFn(ctx)
	}
	return nil, nil
}

func (m *mockApiStatsService) GetModelStats(ctx context.Context) ([]model.ModelStat, error) {
	return nil, nil
}

func (m *mockApiStatsService) GetUserStats(ctx context.Context) ([]model.UserStat, error) {
	return nil, nil
}

func (m *mockApiStatsService) GetTrend(ctx context.Context, days int) ([]model.TrendPoint, error) {
	return nil, nil
}

func setupApiStatsRouter(mock *mockApiStatsService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/admin/api-stats/overview", func(c *gin.Context) {
		data, err := mock.GetOverview(c.Request.Context())
		if err != nil {
			errorResp(c, 50001, err.Error())
			return
		}
		successResp(c, data)
	})
	router.GET("/admin/api-stats/endpoints", func(c *gin.Context) {
		stats, err := mock.GetEndpointStats(c.Request.Context())
		if err != nil {
			errorResp(c, 50001, err.Error())
			return
		}
		successResp(c, stats)
	})
	return router
}

func errorResp(c *gin.Context, code int, msg string) {
	c.JSON(200, map[string]interface{}{"code": code, "message": msg, "data": nil})
}

func TestApiStatsOverview_Success(t *testing.T) {
	mock := &mockApiStatsService{
		overviewFn: func(ctx context.Context) (map[string]interface{}, error) {
			return map[string]interface{}{
				"today_total":    int64(1000),
				"avg_duration_ms": 45.5,
				"error_rate":     2.3,
			}, nil
		},
	}
	router := setupApiStatsRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/api-stats/overview", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int                    `json:"code"`
		Message string                 `json:"message"`
		Data    map[string]interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data["today_total"] != float64(1000) {
		t.Errorf("expected today_total 1000, got %v", resp.Data["today_total"])
	}
	if resp.Data["avg_duration_ms"] != 45.5 {
		t.Errorf("expected avg_duration_ms 45.5, got %v", resp.Data["avg_duration_ms"])
	}
	if resp.Data["error_rate"] != 2.3 {
		t.Errorf("expected error_rate 2.3, got %v", resp.Data["error_rate"])
	}
}

func TestApiStatsOverview_Error(t *testing.T) {
	mock := &mockApiStatsService{
		overviewFn: func(ctx context.Context) (map[string]interface{}, error) {
			return nil, stderrors.New("database error")
		},
	}
	router := setupApiStatsRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/api-stats/overview", nil)
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

func TestApiStatsEndpointStats_Success(t *testing.T) {
	mock := &mockApiStatsService{
		endpointStatsFn: func(ctx context.Context) ([]model.EndpointStat, error) {
			return []model.EndpointStat{
				{APIPath: "/api/v1/prices/latest", CallCount: 500, AvgDuration: 35.2, ErrorRate: 1.0},
				{APIPath: "/api/v1/chat/completions", CallCount: 300, AvgDuration: 200.5, ErrorRate: 3.5},
			}, nil
		},
	}
	router := setupApiStatsRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/api-stats/endpoints", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int                  `json:"code"`
		Message string               `json:"message"`
		Data    []model.EndpointStat `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 endpoint stats, got %d", len(resp.Data))
	}
	if resp.Data[0].APIPath != "/api/v1/prices/latest" {
		t.Errorf("expected first APIPath '/api/v1/prices/latest', got '%s'", resp.Data[0].APIPath)
	}
	if resp.Data[0].CallCount != 500 {
		t.Errorf("expected CallCount 500, got %d", resp.Data[0].CallCount)
	}
}

func TestApiStatsEndpointStats_Error(t *testing.T) {
	mock := &mockApiStatsService{
		endpointStatsFn: func(ctx context.Context) ([]model.EndpointStat, error) {
			return nil, stderrors.New("database error")
		},
	}
	router := setupApiStatsRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/api-stats/endpoints", nil)
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
