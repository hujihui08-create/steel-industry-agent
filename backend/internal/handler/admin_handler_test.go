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

type mockAdminService struct {
	loginFn            func(ctx context.Context, username, password string) (string, error)
	logoutFn           func(ctx context.Context) error
	getInfoFn          func(ctx context.Context, adminID uint) (*model.Admin, error)
	updatePasswordFn   func(ctx context.Context, adminID uint, oldPassword, newPassword string) error
	dashboardFn        func(ctx context.Context) (map[string]int64, error)
	listAdminsFn       func(ctx context.Context) ([]model.Admin, error)
	createAdminFn      func(ctx context.Context, username, nickname, password, role string) (*model.Admin, error)
	updateAdminFn      func(ctx context.Context, id uint, nickname, role string) error
	deleteAdminFn      func(ctx context.Context, id uint) error
	updateProfileFn    func(ctx context.Context, adminID uint, nickname string) error
	listMobileUsersFn  func(ctx context.Context, keyword string, page, pageSize int) ([]model.User, int64, error)
	getMobileUserDetailFn func(ctx context.Context, id uint) (*model.User, error)
	disableMobileUserFn func(ctx context.Context, id uint) error
	enableMobileUserFn  func(ctx context.Context, id uint) error
}

func (m *mockAdminService) Login(ctx context.Context, username, password string) (string, error) {
	return m.loginFn(ctx, username, password)
}

func (m *mockAdminService) Logout(ctx context.Context) error {
	return m.logoutFn(ctx)
}

func (m *mockAdminService) GetInfo(ctx context.Context, adminID uint) (*model.Admin, error) {
	return m.getInfoFn(ctx, adminID)
}

func (m *mockAdminService) UpdatePassword(ctx context.Context, adminID uint, oldPassword, newPassword string) error {
	return m.updatePasswordFn(ctx, adminID, oldPassword, newPassword)
}

func (m *mockAdminService) Dashboard(ctx context.Context) (map[string]int64, error) {
	return m.dashboardFn(ctx)
}

func (m *mockAdminService) ListAdmins(ctx context.Context) ([]model.Admin, error) {
	return m.listAdminsFn(ctx)
}

func (m *mockAdminService) CreateAdmin(ctx context.Context, username, nickname, password, role string) (*model.Admin, error) {
	return m.createAdminFn(ctx, username, nickname, password, role)
}

func (m *mockAdminService) UpdateAdmin(ctx context.Context, id uint, nickname, role string) error {
	return m.updateAdminFn(ctx, id, nickname, role)
}

func (m *mockAdminService) DeleteAdmin(ctx context.Context, id uint) error {
	return m.deleteAdminFn(ctx, id)
}

func (m *mockAdminService) UpdateProfile(ctx context.Context, adminID uint, nickname string) error {
	return m.updateProfileFn(ctx, adminID, nickname)
}

func (m *mockAdminService) ListMobileUsers(ctx context.Context, keyword string, page, pageSize int) ([]model.User, int64, error) {
	return m.listMobileUsersFn(ctx, keyword, page, pageSize)
}

func (m *mockAdminService) GetMobileUserDetail(ctx context.Context, id uint) (*model.User, error) {
	return m.getMobileUserDetailFn(ctx, id)
}

func (m *mockAdminService) DisableMobileUser(ctx context.Context, id uint) error {
	return m.disableMobileUserFn(ctx, id)
}

func (m *mockAdminService) EnableMobileUser(ctx context.Context, id uint) error {
	return m.enableMobileUserFn(ctx, id)
}

func setupAdminRouter(mock *mockAdminService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &AdminHandler{adminService: mock}
	router := gin.New()

	setUserID := func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	}

	router.POST("/api/v1/admin/auth/login", handler.Login)
	router.POST("/api/v1/admin/auth/logout", handler.Logout)
	router.GET("/api/v1/admin/auth/info", setUserID, handler.GetInfo)
	router.PUT("/api/v1/admin/auth/password", setUserID, handler.UpdatePassword)
	router.GET("/api/v1/admin/dashboard", handler.Dashboard)
	return router
}

func TestAdminLogin_ValidCredentials(t *testing.T) {
	mock := &mockAdminService{
		loginFn: func(ctx context.Context, username, password string) (string, error) {
			return "admin-jwt-token", nil
		},
	}
	router := setupAdminRouter(mock)

	body := `{"username": "admin", "password": "admin123"}`
	req, _ := http.NewRequest("POST", "/api/v1/admin/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Token == "" {
		t.Error("expected non-empty token")
	}
}

func TestAdminLogin_WrongPassword(t *testing.T) {
	mock := &mockAdminService{
		loginFn: func(ctx context.Context, username, password string) (string, error) {
			return "", stderrors.New("用户名或密码错误")
		},
	}
	router := setupAdminRouter(mock)

	body := `{"username": "admin", "password": "wrongpass"}`
	req, _ := http.NewRequest("POST", "/api/v1/admin/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeAuthFailed {
		t.Errorf("expected code %d, got %d", errors.CodeAuthFailed, resp.Code)
	}
}

func TestAdminLogout(t *testing.T) {
	mock := &mockAdminService{
		logoutFn: func(ctx context.Context) error {
			return nil
		},
	}
	router := setupAdminRouter(mock)

	req, _ := http.NewRequest("POST", "/api/v1/admin/auth/logout", nil)
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

func TestAdminGetInfo(t *testing.T) {
	mock := &mockAdminService{
		getInfoFn: func(ctx context.Context, adminID uint) (*model.Admin, error) {
			return &model.Admin{
				ID:       1,
				Username: "admin",
				Nickname: "超级管理员",
				Role:     "admin",
				Status:   1,
			}, nil
		},
	}
	router := setupAdminRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/auth/info", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			ID       uint   `json:"id"`
			Username string `json:"username"`
			Nickname string `json:"nickname"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Username != "admin" {
		t.Errorf("expected username 'admin', got '%s'", resp.Data.Username)
	}
}

func TestAdminUpdatePassword(t *testing.T) {
	mock := &mockAdminService{
		updatePasswordFn: func(ctx context.Context, adminID uint, oldPassword, newPassword string) error {
			return nil
		},
	}
	router := setupAdminRouter(mock)

	body := `{"old_password": "oldadminpass", "new_password": "newadmin456"}`
	req, _ := http.NewRequest("PUT", "/api/v1/admin/auth/password", strings.NewReader(body))
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

func TestAdminDashboard(t *testing.T) {
	mock := &mockAdminService{
		dashboardFn: func(ctx context.Context) (map[string]int64, error) {
			return map[string]int64{
				"user_count":      100,
				"quotation_count": 50,
				"tender_count":    200,
				"alert_count":     30,
			}, nil
		},
	}
	router := setupAdminRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/admin/dashboard", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			UserCount      int64 `json:"user_count"`
			QuotationCount int64 `json:"quotation_count"`
			TenderCount    int64 `json:"tender_count"`
			AlertCount     int64 `json:"alert_count"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.UserCount != 100 {
		t.Errorf("expected user_count 100, got %d", resp.Data.UserCount)
	}
}
