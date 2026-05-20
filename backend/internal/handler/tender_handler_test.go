package handler

import (
	"context"
	"encoding/json"
	stderrors "errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

type mockTenderService struct {
	getTenderListFn   func(ctx context.Context, region, category, status string, limit, offset int) ([]model.Tender, error)
	getTenderDetailFn func(ctx context.Context, id uint) (*model.Tender, error)
	addFavoriteFn     func(ctx context.Context, userID, tenderID uint) error
	removeFavoriteFn  func(ctx context.Context, userID, tenderID uint) error
	getRecommendFn    func(ctx context.Context, userID uint) ([]model.Tender, error)
	getCalendarFn     func(ctx context.Context) (map[string]interface{}, error)
}

func (m *mockTenderService) GetTenderList(ctx context.Context, region, category, status string, limit, offset int) ([]model.Tender, error) {
	return m.getTenderListFn(ctx, region, category, status, limit, offset)
}

func (m *mockTenderService) GetTenderDetail(ctx context.Context, id uint) (*model.Tender, error) {
	return m.getTenderDetailFn(ctx, id)
}

func (m *mockTenderService) AddFavorite(ctx context.Context, userID, tenderID uint) error {
	return m.addFavoriteFn(ctx, userID, tenderID)
}

func (m *mockTenderService) RemoveFavorite(ctx context.Context, userID, tenderID uint) error {
	return m.removeFavoriteFn(ctx, userID, tenderID)
}

func (m *mockTenderService) GetRecommend(ctx context.Context, userID uint) ([]model.Tender, error) {
	return m.getRecommendFn(ctx, userID)
}

func (m *mockTenderService) GetCalendar(ctx context.Context) (map[string]interface{}, error) {
	return m.getCalendarFn(ctx)
}

func setupTenderRouter(mock *mockTenderService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &TenderHandler{tenderService: mock}
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	router.GET("/api/v1/tenders", handler.GetTenderList)
	router.GET("/api/v1/tenders/:id", handler.GetTenderDetail)
	router.POST("/api/v1/tenders/favorites", handler.AddFavorite)
	router.DELETE("/api/v1/tenders/favorites/:id", handler.RemoveFavorite)
	router.GET("/api/v1/tenders/recommend", handler.GetRecommend)
	router.GET("/api/v1/calendar", handler.GetCalendar)
	return router
}

func TestGetTenderList_Success(t *testing.T) {
	mock := &mockTenderService{
		getTenderListFn: func(ctx context.Context, region, category, status string, limit, offset int) ([]model.Tender, error) {
			return []model.Tender{
				{ID: 1, Title: "招标项目A", Region: "华东", Category: "螺纹钢", Status: "active"},
				{ID: 2, Title: "招标项目B", Region: "华南", Category: "热卷", Status: "active"},
			}, nil
		},
	}
	router := setupTenderRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/tenders", nil)
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

func TestGetTenderList_Error(t *testing.T) {
	mock := &mockTenderService{
		getTenderListFn: func(ctx context.Context, region, category, status string, limit, offset int) ([]model.Tender, error) {
			return nil, stderrors.New("database error")
		},
	}
	router := setupTenderRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/tenders", nil)
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

func TestGetTenderDetail_Success(t *testing.T) {
	mock := &mockTenderService{
		getTenderDetailFn: func(ctx context.Context, id uint) (*model.Tender, error) {
			return &model.Tender{
				ID:       1,
				Title:    "招标项目A",
				Region:   "华东",
				Category: "螺纹钢",
				Status:   "active",
				Deadline: time.Now().AddDate(0, 0, 15),
				Budget:   1000000,
			}, nil
		},
	}
	router := setupTenderRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/tenders/1", nil)
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

func TestGetTenderDetail_InvalidID(t *testing.T) {
	mock := &mockTenderService{
		getTenderDetailFn: func(ctx context.Context, id uint) (*model.Tender, error) {
			return nil, nil
		},
	}
	router := setupTenderRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/tenders/abc", nil)
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

func TestAddFavorite_Success(t *testing.T) {
	mock := &mockTenderService{
		addFavoriteFn: func(ctx context.Context, userID, tenderID uint) error {
			return nil
		},
	}
	router := setupTenderRouter(mock)

	body := `{"tender_id": 1}`
	req, _ := http.NewRequest("POST", "/api/v1/tenders/favorites", strings.NewReader(body))
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

func TestRemoveFavorite_Success(t *testing.T) {
	mock := &mockTenderService{
		removeFavoriteFn: func(ctx context.Context, userID, tenderID uint) error {
			return nil
		},
	}
	router := setupTenderRouter(mock)

	req, _ := http.NewRequest("DELETE", "/api/v1/tenders/favorites/1", nil)
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

func TestGetRecommend_Success(t *testing.T) {
	mock := &mockTenderService{
		getRecommendFn: func(ctx context.Context, userID uint) ([]model.Tender, error) {
			return []model.Tender{
				{ID: 1, Title: "推荐招标A", Region: "华东", Category: "螺纹钢", Status: "active"},
				{ID: 2, Title: "推荐招标B", Region: "华南", Category: "热卷", Status: "active"},
			}, nil
		},
	}
	router := setupTenderRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/tenders/recommend", nil)
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

func TestGetCalendar_Success(t *testing.T) {
	mock := &mockTenderService{
		getCalendarFn: func(ctx context.Context) (map[string]interface{}, error) {
			return map[string]interface{}{
				"dates": []interface{}{},
				"total": 0,
			}, nil
		},
	}
	router := setupTenderRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/calendar", nil)
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
