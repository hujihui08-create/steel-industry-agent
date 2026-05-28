package handler

import (
	"context"
	"encoding/json"
	stderrors "errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"steel-agent-backend/internal/config"
	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

func init() {
	config.AppConfig = &config.Config{
		JWTSecret:        "test-secret",
		JWTRefreshSecret: "test-refresh-secret",
	}
}

type mockAdminService struct {
	loginFn               func(ctx context.Context, username, password string) (string, error)
	logoutFn              func(ctx context.Context) error
	getInfoFn             func(ctx context.Context, adminID uint) (*model.Admin, error)
	updatePasswordFn      func(ctx context.Context, adminID uint, oldPassword, newPassword string) error
	dashboardFn           func(ctx context.Context) (map[string]int64, error)
	listAdminsFn          func(ctx context.Context) ([]model.Admin, error)
	createAdminFn         func(ctx context.Context, username, nickname, password, role string) (*model.Admin, error)
	updateAdminFn         func(ctx context.Context, id uint, nickname, role string) error
	deleteAdminFn         func(ctx context.Context, id uint) error
	updateProfileFn       func(ctx context.Context, adminID uint, nickname string) error
	listMobileUsersFn     func(ctx context.Context, keyword string, page, pageSize int) ([]model.User, int64, error)
	getMobileUserDetailFn func(ctx context.Context, id uint) (*model.User, error)
	disableMobileUserFn   func(ctx context.Context, id uint) error
	enableMobileUserFn    func(ctx context.Context, id uint) error
	dashboardTrendFn      func(ctx context.Context, days int) ([]service.TrendDataPoint, error)
	createMobileUserFn    func(ctx context.Context, phone, nickname, company, password string, roleID uint, region string) (*model.User, error)
	updateMobileUserFn    func(ctx context.Context, id uint, nickname, company string, roleID uint, region string, status int) (*model.User, error)
	deleteMobileUserFn    func(ctx context.Context, id uint) error
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

func (m *mockAdminService) DashboardTrend(ctx context.Context, days int) ([]service.TrendDataPoint, error) {
	return m.dashboardTrendFn(ctx, days)
}

func (m *mockAdminService) CreateMobileUser(ctx context.Context, phone, nickname, company, password string, roleID uint, region string) (*model.User, error) {
	return m.createMobileUserFn(ctx, phone, nickname, company, password, roleID, region)
}

func (m *mockAdminService) UpdateMobileUser(ctx context.Context, id uint, nickname, company string, roleID uint, region string, status int) (*model.User, error) {
	return m.updateMobileUserFn(ctx, id, nickname, company, roleID, region, status)
}

func (m *mockAdminService) DeleteMobileUser(ctx context.Context, id uint) error {
	return m.deleteMobileUserFn(ctx, id)
}

type mockLoginLogRecorder struct{}

func (m *mockLoginLogRecorder) RecordLoginSuccess(_ context.Context, _ string, _, _ *uint, _, _ string) {
}
func (m *mockLoginLogRecorder) RecordLoginFailure(_ context.Context, _ string, _, _ *uint, _, _, _ string) {
}

func setupAdminRouter(mock *mockAdminService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &AdminHandler{adminService: mock, loginLogRecorder: &mockLoginLogRecorder{}}
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

	adminMobileUsers := router.Group("/api/v1/admin/mobile-users")
	adminMobileUsers.POST("", handler.CreateMobileUser)
	adminMobileUsers.PUT("/:id", handler.UpdateMobileUser)
	adminMobileUsers.DELETE("/:id", handler.DeleteMobileUser)

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
			Admin struct {
				ID       uint   `json:"id"`
				Username string `json:"username"`
				Nickname string `json:"nickname"`
			} `json:"admin"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Admin.Username != "admin" {
		t.Errorf("expected username 'admin', got '%s'", resp.Data.Admin.Username)
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

// ===================== Mobile User CRUD Tests =====================

func TestCreateMobileUser_Success(t *testing.T) {
	mock := &mockAdminService{
		createMobileUserFn: func(ctx context.Context, phone, nickname, company, password string, roleID uint, region string) (*model.User, error) {
			if phone != "13800138000" {
				t.Errorf("expected phone '13800138000', got '%s'", phone)
			}
			return &model.User{
				ID: 1, Phone: phone, Nickname: nickname, Company: company,
				RoleID: roleID, Region: region, Status: 1,
			}, nil
		},
	}
	router := setupAdminRouter(mock)

	body := `{"phone":"13800138000","nickname":"测试用户","company":"测试公司","role_id":1,"region":"上海","password":"password123"}`
	req, _ := http.NewRequest("POST", "/api/v1/admin/mobile-users", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d: %s", resp.Code, resp.Message)
	}
}

func TestCreateMobileUser_MissingPhone(t *testing.T) {
	mock := &mockAdminService{}
	router := setupAdminRouter(mock)

	body := `{"nickname":"测试","password":"pass"}`
	req, _ := http.NewRequest("POST", "/api/v1/admin/mobile-users", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d for missing phone, got %d", errors.CodeParamError, resp.Code)
	}
}

func TestCreateMobileUser_ServiceError(t *testing.T) {
	mock := &mockAdminService{
		createMobileUserFn: func(ctx context.Context, phone, nickname, company, password string, roleID uint, region string) (*model.User, error) {
			return nil, stderrors.New("该手机号已注册")
		},
	}
	router := setupAdminRouter(mock)

	body := `{"phone":"13800138000","nickname":"test","role_id":1,"password":"pass"}`
	req, _ := http.NewRequest("POST", "/api/v1/admin/mobile-users", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d for service error, got %d", errors.CodeParamError, resp.Code)
	}
	if resp.Message != "该手机号已注册" {
		t.Errorf("expected '该手机号已注册', got '%s'", resp.Message)
	}
}

func TestUpdateMobileUser_Success(t *testing.T) {
	mock := &mockAdminService{
		updateMobileUserFn: func(ctx context.Context, id uint, nickname, company string, roleID uint, region string, status int) (*model.User, error) {
			return &model.User{ID: id, Nickname: nickname, Company: company, RoleID: roleID, Region: region}, nil
		},
	}
	router := setupAdminRouter(mock)

	body := `{"nickname":"新昵称","company":"新公司","role_id":2,"region":"北京","status":1}`
	req, _ := http.NewRequest("PUT", "/api/v1/admin/mobile-users/1", strings.NewReader(body))
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

func TestUpdateMobileUser_InvalidID(t *testing.T) {
	mock := &mockAdminService{}
	router := setupAdminRouter(mock)

	body := `{"nickname":"test"}`
	req, _ := http.NewRequest("PUT", "/api/v1/admin/mobile-users/abc", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d for invalid ID, got %d", errors.CodeParamError, resp.Code)
	}
}

func TestDeleteMobileUser_Success(t *testing.T) {
	mock := &mockAdminService{
		deleteMobileUserFn: func(ctx context.Context, id uint) error {
			return nil
		},
	}
	router := setupAdminRouter(mock)

	req, _ := http.NewRequest("DELETE", "/api/v1/admin/mobile-users/1", nil)
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

func TestDeleteMobileUser_ServiceError(t *testing.T) {
	mock := &mockAdminService{
		deleteMobileUserFn: func(ctx context.Context, id uint) error {
			return stderrors.New("用户不存在")
		},
	}
	router := setupAdminRouter(mock)

	req, _ := http.NewRequest("DELETE", "/api/v1/admin/mobile-users/999", nil)
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
