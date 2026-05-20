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

type mockUserService struct {
	getProfileFn    func(ctx context.Context, userID uint) (*model.User, error)
	updateProfileFn func(ctx context.Context, userID uint, nickname, company, region string) (*model.User, error)
	updatePasswordFn func(ctx context.Context, userID uint, oldPassword, newPassword string) error
}

func (m *mockUserService) GetProfile(ctx context.Context, userID uint) (*model.User, error) {
	return m.getProfileFn(ctx, userID)
}

func (m *mockUserService) UpdateProfile(ctx context.Context, userID uint, nickname, company, region string) (*model.User, error) {
	return m.updateProfileFn(ctx, userID, nickname, company, region)
}

func (m *mockUserService) UpdatePassword(ctx context.Context, userID uint, oldPassword, newPassword string) error {
	return m.updatePasswordFn(ctx, userID, oldPassword, newPassword)
}

func setupUserRouter(mock *mockUserService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &UserHandler{userService: mock}
	router := gin.New()

	setUserID := func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	}

	router.GET("/api/v1/users/profile", setUserID, handler.GetProfile)
	router.PUT("/api/v1/users/profile", setUserID, handler.UpdateProfile)
	router.PUT("/api/v1/users/password", setUserID, handler.UpdatePassword)
	return router
}

func TestGetProfile_ValidUser(t *testing.T) {
	mock := &mockUserService{
		getProfileFn: func(ctx context.Context, userID uint) (*model.User, error) {
			return &model.User{
				ID:       1,
				Phone:    "13800138000",
				Nickname: "testuser",
				Company:  "测试公司",
				Role:     "user",
				Region:   "华东",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}, nil
		},
	}
	router := setupUserRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/users/profile", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			ID       uint   `json:"id"`
			Phone    string `json:"phone"`
			Nickname string `json:"nickname"`
			Company  string `json:"company"`
			Role     string `json:"role"`
			Region   string `json:"region"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Nickname != "testuser" {
		t.Errorf("expected nickname 'testuser', got '%s'", resp.Data.Nickname)
	}
}

func TestUpdateProfile_ValidData(t *testing.T) {
	mock := &mockUserService{
		updateProfileFn: func(ctx context.Context, userID uint, nickname, company, region string) (*model.User, error) {
			return &model.User{
				ID:       userID,
				Phone:    "13800138000",
				Nickname: nickname,
				Company:  company,
				Role:     "user",
				Region:   region,
			}, nil
		},
	}
	router := setupUserRouter(mock)

	body := `{"nickname": "newname", "company": "新公司", "region": "华南"}`
	req, _ := http.NewRequest("PUT", "/api/v1/users/profile", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			Nickname string `json:"nickname"`
			Company  string `json:"company"`
			Region   string `json:"region"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Nickname != "newname" {
		t.Errorf("expected nickname 'newname', got '%s'", resp.Data.Nickname)
	}
}

func TestUpdatePassword_Valid(t *testing.T) {
	mock := &mockUserService{
		updatePasswordFn: func(ctx context.Context, userID uint, oldPassword, newPassword string) error {
			return nil
		},
	}
	router := setupUserRouter(mock)

	body := `{"old_password": "oldpass123", "new_password": "newpass456"}`
	req, _ := http.NewRequest("PUT", "/api/v1/users/password", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestUpdatePassword_InvalidNewPasswordFormat(t *testing.T) {
	mock := &mockUserService{
		updatePasswordFn: func(ctx context.Context, userID uint, oldPassword, newPassword string) error {
			return stderrors.New("should not be called")
		},
	}
	router := setupUserRouter(mock)

	body := `{"old_password": "oldpass123", "new_password": "12345"}`
	req, _ := http.NewRequest("PUT", "/api/v1/users/password", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d, got %d", errors.CodeParamError, resp.Code)
	}
}
