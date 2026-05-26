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
	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

func init() {
	config.AppConfig = &config.Config{
		JWTSecret:        "test-secret",
		JWTRefreshSecret: "test-refresh-secret",
	}
}

type mockAuthService struct {
	sendSMSCodeFn   func(ctx context.Context, phone string) error
	loginFn         func(ctx context.Context, phone, code string) (string, string, error)
	loginPasswordFn func(ctx context.Context, phone, password string) (string, string, error)
	registerFn      func(ctx context.Context, phone, password, code, nickname string) (string, string, error)
	refreshTokenFn  func(ctx context.Context, oldToken string) (string, error)
	logoutFn        func(ctx context.Context, refreshToken string) error
}

func (m *mockAuthService) SendSMSCode(ctx context.Context, phone string) error {
	return m.sendSMSCodeFn(ctx, phone)
}

func (m *mockAuthService) Login(ctx context.Context, phone, code string) (string, string, error) {
	return m.loginFn(ctx, phone, code)
}

func (m *mockAuthService) LoginPassword(ctx context.Context, phone, password string) (string, string, error) {
	return m.loginPasswordFn(ctx, phone, password)
}

func (m *mockAuthService) Register(ctx context.Context, phone, password, code, nickname string) (string, string, error) {
	return m.registerFn(ctx, phone, password, code, nickname)
}

func (m *mockAuthService) RefreshToken(ctx context.Context, oldToken string) (string, error) {
	return m.refreshTokenFn(ctx, oldToken)
}

func (m *mockAuthService) Logout(ctx context.Context, refreshToken string) error {
	if m.logoutFn != nil {
		return m.logoutFn(ctx, refreshToken)
	}
	return nil
}

func setupAuthRouter(mock *mockAuthService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &AuthHandler{authService: mock, loginLogRecorder: &mockLoginLogRecorder{}}
	router := gin.New()
	router.POST("/api/v1/auth/sms-code", handler.GetSMSCode)
	router.POST("/api/v1/auth/login", handler.Login)
	router.POST("/api/v1/auth/login-password", handler.LoginPassword)
	router.POST("/api/v1/auth/register", handler.Register)
	router.POST("/api/v1/auth/refresh", handler.RefreshToken)
	router.POST("/api/v1/auth/logout", handler.Logout)
	return router
}

func TestGetSMSCode_ValidPhone(t *testing.T) {
	mock := &mockAuthService{
		sendSMSCodeFn: func(ctx context.Context, phone string) error {
			return nil
		},
	}
	router := setupAuthRouter(mock)

	body := `{"phone": "13800138000"}`
	req, _ := http.NewRequest("POST", "/api/v1/auth/sms-code", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestGetSMSCode_InvalidPhone(t *testing.T) {
	mock := &mockAuthService{
		sendSMSCodeFn: func(ctx context.Context, phone string) error {
			return nil
		},
	}
	router := setupAuthRouter(mock)

	body := `{"phone": "12345"}`
	req, _ := http.NewRequest("POST", "/api/v1/auth/sms-code", strings.NewReader(body))
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

func TestGetSMSCode_EmptyPhone(t *testing.T) {
	mock := &mockAuthService{
		sendSMSCodeFn: func(ctx context.Context, phone string) error {
			return nil
		},
	}
	router := setupAuthRouter(mock)

	body := `{}`
	req, _ := http.NewRequest("POST", "/api/v1/auth/sms-code", strings.NewReader(body))
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

func TestLogin_ValidPhoneAndCode(t *testing.T) {
	mock := &mockAuthService{
		loginFn: func(ctx context.Context, phone, code string) (string, string, error) {
			return "test-access-token", "test-refresh-token", nil
		},
	}
	router := setupAuthRouter(mock)

	body := `{"phone": "13800138000", "code": "123456"}`
	req, _ := http.NewRequest("POST", "/api/v1/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.AccessToken == "" {
		t.Error("expected non-empty access_token")
	}
	if resp.Data.RefreshToken == "" {
		t.Error("expected non-empty refresh_token")
	}
}

func TestLogin_UserNotFound(t *testing.T) {
	mock := &mockAuthService{
		loginFn: func(ctx context.Context, phone, code string) (string, string, error) {
			return "", "", stderrors.New("用户不存在")
		},
	}
	router := setupAuthRouter(mock)

	body := `{"phone": "13800138000", "code": "123456"}`
	req, _ := http.NewRequest("POST", "/api/v1/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeBusinessError {
		t.Errorf("expected code %d, got %d", errors.CodeBusinessError, resp.Code)
	}
}

func TestLoginPassword_ValidCredentials(t *testing.T) {
	mock := &mockAuthService{
		loginPasswordFn: func(ctx context.Context, phone, password string) (string, string, error) {
			return "test-access-token", "test-refresh-token", nil
		},
	}
	router := setupAuthRouter(mock)

	body := `{"phone": "13800138000", "password": "password123"}`
	req, _ := http.NewRequest("POST", "/api/v1/auth/login-password", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.AccessToken == "" {
		t.Error("expected non-empty access_token")
	}
	if resp.Data.RefreshToken == "" {
		t.Error("expected non-empty refresh_token")
	}
}

func TestLoginPassword_WrongPassword(t *testing.T) {
	mock := &mockAuthService{
		loginPasswordFn: func(ctx context.Context, phone, password string) (string, string, error) {
			return "", "", stderrors.New("用户不存在或密码错误")
		},
	}
	router := setupAuthRouter(mock)

	body := `{"phone": "13800138000", "password": "wrongpassword"}`
	req, _ := http.NewRequest("POST", "/api/v1/auth/login-password", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeBusinessError {
		t.Errorf("expected code %d, got %d", errors.CodeBusinessError, resp.Code)
	}
}

func TestRegister_ValidData(t *testing.T) {
	mock := &mockAuthService{
		registerFn: func(ctx context.Context, phone, password, code, nickname string) (string, string, error) {
			return "test-access-token", "test-refresh-token", nil
		},
	}
	router := setupAuthRouter(mock)

	body := `{"phone": "13800138000", "password": "password123", "code": "123456", "nickname": "testuser"}`
	req, _ := http.NewRequest("POST", "/api/v1/auth/register", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.AccessToken == "" {
		t.Error("expected non-empty access_token")
	}
	if resp.Data.RefreshToken == "" {
		t.Error("expected non-empty refresh_token")
	}
}

func TestRegister_DuplicatePhone(t *testing.T) {
	mock := &mockAuthService{
		registerFn: func(ctx context.Context, phone, password, code, nickname string) (string, string, error) {
			return "", "", stderrors.New("手机号已注册")
		},
	}
	router := setupAuthRouter(mock)

	body := `{"phone": "13800138000", "password": "password123", "code": "123456"}`
	req, _ := http.NewRequest("POST", "/api/v1/auth/register", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeBusinessError {
		t.Errorf("expected code %d, got %d", errors.CodeBusinessError, resp.Code)
	}
}

func TestRefreshToken_ValidToken(t *testing.T) {
	mock := &mockAuthService{
		refreshTokenFn: func(ctx context.Context, oldToken string) (string, error) {
			return "new-access-token", nil
		},
	}
	router := setupAuthRouter(mock)

	body := `{"refresh_token": "old-valid-token"}`
	req, _ := http.NewRequest("POST", "/api/v1/auth/refresh", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			AccessToken string `json:"access_token"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.AccessToken == "" {
		t.Error("expected non-empty access_token")
	}
}

func TestRefreshToken_InvalidToken(t *testing.T) {
	mock := &mockAuthService{
		refreshTokenFn: func(ctx context.Context, oldToken string) (string, error) {
			return "", stderrors.New("令牌无效或已过期")
		},
	}
	router := setupAuthRouter(mock)

	body := `{"refresh_token": "invalid-token"}`
	req, _ := http.NewRequest("POST", "/api/v1/auth/refresh", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeBusinessError {
		t.Errorf("expected code %d, got %d", errors.CodeBusinessError, resp.Code)
	}
}

func TestLogout(t *testing.T) {
	mock := &mockAuthService{}
	router := setupAuthRouter(mock)

	body := `{"refresh_token": "test-refresh-token"}`
	req, _ := http.NewRequest("POST", "/api/v1/auth/logout", strings.NewReader(body))
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
