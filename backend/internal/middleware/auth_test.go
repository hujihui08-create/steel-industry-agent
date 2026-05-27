package middleware

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"steel-agent-backend/internal/config"
	"steel-agent-backend/pkg/jwt"

	"github.com/gin-gonic/gin"
)

func init() {
	config.AppConfig = &config.Config{
		JWTSecret: "test-jwt-secret-key",
	}
}

func TestAuth_NoHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/test", nil)

	Auth()(c)

	if !c.IsAborted() {
		t.Error("expected request to be aborted")
	}

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if resp.Code != 401 {
		t.Errorf("expected code 401, got %d", resp.Code)
	}
	if resp.Message != "未提供认证令牌" {
		t.Errorf("expected message '未提供认证令牌', got '%s'", resp.Message)
	}
}

func TestAuth_InvalidFormat(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/test", nil)
	c.Request.Header.Set("Authorization", "Basic xyz123")

	Auth()(c)

	if !c.IsAborted() {
		t.Error("expected request to be aborted")
	}

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if resp.Code != 401 {
		t.Errorf("expected code 401, got %d", resp.Code)
	}
	if resp.Message != "认证格式错误" {
		t.Errorf("expected message '认证格式错误', got '%s'", resp.Message)
	}
}

func TestAuth_InvalidFormat_NoParts(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/test", nil)
	c.Request.Header.Set("Authorization", "Bearer")

	Auth()(c)

	if !c.IsAborted() {
		t.Error("expected request to be aborted")
	}

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if resp.Code != 401 {
		t.Errorf("expected code 401, got %d", resp.Code)
	}
	if resp.Message != "认证格式错误" {
		t.Errorf("expected message '认证格式错误', got '%s'", resp.Message)
	}
}

func TestAuth_EmptyToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/test", nil)
	c.Request.Header.Set("Authorization", "Bearer ")

	Auth()(c)

	if !c.IsAborted() {
		t.Error("expected request to be aborted")
	}

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if resp.Code != 401 {
		t.Errorf("expected code 401, got %d", resp.Code)
	}
	if resp.Message != "认证令牌无效或已过期" {
		t.Errorf("expected message '认证令牌无效或已过期', got '%s'", resp.Message)
	}
}

func TestAuth_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/test", nil)
	c.Request.Header.Set("Authorization", "Bearer invalidtoken")

	Auth()(c)

	if !c.IsAborted() {
		t.Error("expected request to be aborted")
	}

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if resp.Code != 401 {
		t.Errorf("expected code 401, got %d", resp.Code)
	}
	if resp.Message != "认证令牌无效或已过期" {
		t.Errorf("expected message '认证令牌无效或已过期', got '%s'", resp.Message)
	}
}

func TestAuth_ValidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	token, err := jwt.GenerateAccessToken(42, "user", 0)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/test", nil)
	c.Request.Header.Set("Authorization", "Bearer "+token)

	Auth()(c)

	if c.IsAborted() {
		t.Error("expected request NOT to be aborted")
	}

	userID, exists := c.Get("user_id")
	if !exists {
		t.Error("expected user_id to be set in context")
	}

	uid, ok := userID.(uint)
	if !ok {
		t.Fatalf("expected user_id to be uint, got %T", userID)
	}

	if uid != 42 {
		t.Errorf("expected user_id 42, got %d", uid)
	}
}

func TestAuth_ValidToken_DifferentUser(t *testing.T) {
	gin.SetMode(gin.TestMode)

	token, err := jwt.GenerateAccessToken(7, "user", 0)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/test", nil)
	c.Request.Header.Set("Authorization", "Bearer "+token)

	Auth()(c)

	if c.IsAborted() {
		t.Error("expected request NOT to be aborted")
	}

	userID, exists := c.Get("user_id")
	if !exists {
		t.Error("expected user_id to be set in context")
	}

	uid, ok := userID.(uint)
	if !ok {
		t.Fatalf("expected user_id to be uint, got %T", userID)
	}

	if uid != 7 {
		t.Errorf("expected user_id 7, got %d", uid)
	}
}

func TestAuth_ValidToken_RoleExtraction(t *testing.T) {
	tests := []struct {
		name         string
		userID       uint
		role         string
		expectedRole string
	}{
		{"admin role", 42, "admin", "admin"},
		{"user role", 7, "user", "user"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)

			token, err := jwt.GenerateAccessToken(tt.userID, tt.role, 0)
			if err != nil {
				t.Fatalf("failed to generate token: %v", err)
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/test", nil)
			c.Request.Header.Set("Authorization", "Bearer "+token)

			Auth()(c)

			if c.IsAborted() {
				t.Error("expected request NOT to be aborted")
			}

			roleVal, exists := c.Get("role")
			if !exists {
				t.Error("expected role to be set in context")
			}

			role, ok := roleVal.(string)
			if !ok {
				t.Fatalf("expected role to be string, got %T", roleVal)
			}

			if role != tt.expectedRole {
				t.Errorf("expected role '%s', got '%s'", tt.expectedRole, role)
			}
		})
	}
}

func TestAuth_MalformedJSONPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/test", nil)
	c.Request.Header.Set("Authorization", "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN")

	Auth()(c)

	if !c.IsAborted() {
		t.Error("expected request to be aborted")
	}

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if resp.Code != 401 {
		t.Errorf("expected code 401, got %d", resp.Code)
	}
	if resp.Message != "认证令牌无效或已过期" {
		t.Errorf("expected message '认证令牌无效或已过期', got '%s'", resp.Message)
	}
}
