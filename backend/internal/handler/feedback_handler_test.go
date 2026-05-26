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

type mockFeedbackHandlerService struct {
	submitFn    func(ctx context.Context, userID uint, feedbackType, content, contact string) (*model.UserFeedback, error)
	listFn      func(ctx context.Context, feedbackType string, limit, offset int) ([]model.UserFeedback, int64, error)
	getDetailFn func(ctx context.Context, id uint) (*model.UserFeedback, error)
}

func (m *mockFeedbackHandlerService) SubmitFeedback(ctx context.Context, userID uint, feedbackType, content, contact string) (*model.UserFeedback, error) {
	return m.submitFn(ctx, userID, feedbackType, content, contact)
}

func (m *mockFeedbackHandlerService) ListFeedbacks(ctx context.Context, feedbackType string, limit, offset int) ([]model.UserFeedback, int64, error) {
	return m.listFn(ctx, feedbackType, limit, offset)
}

func (m *mockFeedbackHandlerService) GetFeedbackDetail(ctx context.Context, id uint) (*model.UserFeedback, error) {
	return m.getDetailFn(ctx, id)
}

func setupFeedbackRouter(mock *mockFeedbackHandlerService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &FeedbackHandler{
		feedbackService:      mock,
		adminFeedbackService: mock,
	}
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	router.POST("/api/v1/feedback", handler.SubmitFeedback)
	router.GET("/api/v1/admin/feedbacks", handler.ListFeedbacks)
	router.GET("/api/v1/admin/feedbacks/:id", handler.GetFeedbackDetail)
	return router
}

func TestSubmitFeedback_Success(t *testing.T) {
	mock := &mockFeedbackHandlerService{
		submitFn: func(ctx context.Context, userID uint, feedbackType, content, contact string) (*model.UserFeedback, error) {
			return &model.UserFeedback{
				ID:        1,
				UserID:    userID,
				Type:      feedbackType,
				Content:   content,
				Contact:   contact,
				Status:    "unread",
				CreatedAt: time.Now(),
			}, nil
		},
	}
	router := setupFeedbackRouter(mock)

	body := `{"type":"bug","content":"页面加载出错","contact":"13800138000"}`
	req, _ := http.NewRequest("POST", "/api/v1/feedback", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int                 `json:"code"`
		Data model.UserFeedback `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Type != "bug" {
		t.Errorf("expected type 'bug', got '%s'", resp.Data.Type)
	}
	if resp.Data.Status != "unread" {
		t.Errorf("expected status 'unread', got '%s'", resp.Data.Status)
	}
}

func TestSubmitFeedback_Suggestion(t *testing.T) {
	mock := &mockFeedbackHandlerService{
		submitFn: func(ctx context.Context, userID uint, feedbackType, content, contact string) (*model.UserFeedback, error) {
			return &model.UserFeedback{
				ID:      2,
				UserID:  userID,
				Type:    feedbackType,
				Content: content,
				Status:  "unread",
			}, nil
		},
	}
	router := setupFeedbackRouter(mock)

	body := `{"type":"suggestion","content":"希望能增加批量导出功能"}`
	req, _ := http.NewRequest("POST", "/api/v1/feedback", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int                 `json:"code"`
		Data model.UserFeedback `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Type != "suggestion" {
		t.Errorf("expected type 'suggestion', got '%s'", resp.Data.Type)
	}
}

func TestSubmitFeedback_MissingFields(t *testing.T) {
	mock := &mockFeedbackHandlerService{
		submitFn: func(ctx context.Context, userID uint, feedbackType, content, contact string) (*model.UserFeedback, error) {
			return nil, nil
		},
	}
	router := setupFeedbackRouter(mock)

	body := `{}`
	req, _ := http.NewRequest("POST", "/api/v1/feedback", strings.NewReader(body))
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

func TestSubmitFeedback_InternalError(t *testing.T) {
	mock := &mockFeedbackHandlerService{
		submitFn: func(ctx context.Context, userID uint, feedbackType, content, contact string) (*model.UserFeedback, error) {
			return nil, stderrors.New("database error")
		},
	}
	router := setupFeedbackRouter(mock)

	body := `{"type":"bug","content":"test content"}`
	req, _ := http.NewRequest("POST", "/api/v1/feedback", strings.NewReader(body))
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

func TestListFeedbacks_Success(t *testing.T) {
	mock := &mockFeedbackHandlerService{
		listFn: func(ctx context.Context, feedbackType string, limit, offset int) ([]model.UserFeedback, int64, error) {
			return []model.UserFeedback{
				{ID: 1, UserID: 1, Type: "bug", Content: "测试问题1", Status: "unread"},
				{ID: 2, UserID: 2, Type: "suggestion", Content: "测试建议2", Status: "unread"},
			}, 2, nil
		},
	}
	router := setupFeedbackRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/feedbacks?limit=20&offset=0", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
		Data struct {
			List  []model.UserFeedback `json:"list"`
			Total int64                `json:"total"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if len(resp.Data.List) != 2 {
		t.Errorf("expected 2 items, got %d", len(resp.Data.List))
	}
	if resp.Data.Total != 2 {
		t.Errorf("expected total 2, got %d", resp.Data.Total)
	}
}

func TestListFeedbacks_WithTypeFilter(t *testing.T) {
	mock := &mockFeedbackHandlerService{
		listFn: func(ctx context.Context, feedbackType string, limit, offset int) ([]model.UserFeedback, int64, error) {
			if feedbackType == "bug" {
				return []model.UserFeedback{
					{ID: 1, UserID: 1, Type: "bug", Content: "bug内容", Status: "unread"},
				}, 1, nil
			}
			return []model.UserFeedback{}, 0, nil
		},
	}
	router := setupFeedbackRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/feedbacks?type=bug", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
		Data struct {
			List  []model.UserFeedback `json:"list"`
			Total int64                `json:"total"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if len(resp.Data.List) != 1 {
		t.Errorf("expected 1 item, got %d", len(resp.Data.List))
	}
	if resp.Data.List[0].Type != "bug" {
		t.Errorf("expected type 'bug', got '%s'", resp.Data.List[0].Type)
	}
}

func TestListFeedbacks_Error(t *testing.T) {
	mock := &mockFeedbackHandlerService{
		listFn: func(ctx context.Context, feedbackType string, limit, offset int) ([]model.UserFeedback, int64, error) {
			return nil, 0, stderrors.New("database error")
		},
	}
	router := setupFeedbackRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/feedbacks", nil)
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

func TestGetFeedbackDetail_Success(t *testing.T) {
	mock := &mockFeedbackHandlerService{
		getDetailFn: func(ctx context.Context, id uint) (*model.UserFeedback, error) {
			return &model.UserFeedback{
				ID:       1,
				UserID:   1,
				Type:     "question",
				Content:  "如何使用报价功能？",
				Contact:  "user@example.com",
				Status:   "unread",
			}, nil
		},
	}
	router := setupFeedbackRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/feedbacks/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int                 `json:"code"`
		Data model.UserFeedback `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Content != "如何使用报价功能？" {
		t.Errorf("expected content, got '%s'", resp.Data.Content)
	}
}

func TestGetFeedbackDetail_InvalidID(t *testing.T) {
	mock := &mockFeedbackHandlerService{
		getDetailFn: func(ctx context.Context, id uint) (*model.UserFeedback, error) {
			return nil, nil
		},
	}
	router := setupFeedbackRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/feedbacks/abc", nil)
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

func TestListFeedbacks_DefaultPagination(t *testing.T) {
	mock := &mockFeedbackHandlerService{
		listFn: func(ctx context.Context, feedbackType string, limit, offset int) ([]model.UserFeedback, int64, error) {
			if limit != 20 {
				t.Errorf("expected default limit 20, got %d", limit)
			}
			if offset != 0 {
				t.Errorf("expected default offset 0, got %d", offset)
			}
			return []model.UserFeedback{}, 0, nil
		},
	}
	router := setupFeedbackRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/feedbacks", nil)
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
