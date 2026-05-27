package router

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"steel-agent-backend/internal/config"
	"steel-agent-backend/internal/middleware"
	"steel-agent-backend/pkg/jwt"

	"github.com/gin-gonic/gin"
)

var publicRouteHandlers = map[string]gin.HandlerFunc{
	"POST /api/v1/auth/sms-code":      mockOK,
	"POST /api/v1/auth/login":         mockOK,
	"POST /api/v1/auth/login-password": mockOK,
	"POST /api/v1/auth/register":      mockOK,
	"POST /api/v1/auth/refresh":       mockOK,
	"POST /api/v1/auth/logout":        mockOK,
	"POST /api/v1/admin/auth/login":   mockOK,
	"POST /api/v1/admin/auth/logout":  mockOK,
	"GET /api/v1/admin/auth/info":     mockOK,
	"PUT /api/v1/admin/auth/password": mockOK,
}

var protectedRouteHandlers = map[string]gin.HandlerFunc{
	"GET /api/v1/users/profile":        mockOK,
	"PUT /api/v1/users/profile":        mockOK,
	"PUT /api/v1/users/password":       mockOK,
	"GET /api/v1/prices":               mockOK,
	"GET /api/v1/prices/latest":        mockOK,
	"GET /api/v1/prices/trend":         mockOK,
	"GET /api/v1/prices/compare":       mockOK,
	"POST /api/v1/quotations/calculate": mockOK,
	"POST /api/v1/quotations":          mockOK,
	"GET /api/v1/quotations":           mockOK,
	"GET /api/v1/quotations/:id":       mockOK,
	"PUT /api/v1/quotations/:id":       mockOK,
	"DELETE /api/v1/quotations/:id":    mockOK,
	"GET /api/v1/quotations/:id/pdf":   mockOK,
	"GET /api/v1/knowledge/search":     mockOK,
	"GET /api/v1/standards":            mockOK,
	"GET /api/v1/standards/:id":        mockOK,
	"GET /api/v1/grades/compare":       mockOK,
	"GET /api/v1/terms":                mockOK,
	"GET /api/v1/terms/:id":            mockOK,
	"POST /api/v1/tools/weight":        mockOK,
	"POST /api/v1/tools/convert":       mockOK,
	"GET /api/v1/tenders":              mockOK,
	"GET /api/v1/tenders/:id":          mockOK,
	"POST /api/v1/tenders/favorites":   mockOK,
	"DELETE /api/v1/tenders/favorites/:id": mockOK,
	"GET /api/v1/tenders/recommend":    mockOK,
	"POST /api/v1/alerts":              mockOK,
	"GET /api/v1/alerts":               mockOK,
	"PUT /api/v1/alerts/:id":           mockOK,
	"DELETE /api/v1/alerts/:id":        mockOK,
	"POST /api/v1/chat/completions":    mockOK,
	"GET /api/v1/chat/sessions":        mockOK,
	"GET /api/v1/news":                 mockOK,
	"GET /api/v1/news/:id":             mockOK,
	"GET /api/v1/reports/daily":        mockOK,
	"GET /api/v1/reports/weekly":       mockOK,
	"GET /api/v1/calendar":             mockOK,
	"GET /api/v1/admin/dashboard":      mockOK,
	"GET /api/v1/admin/crawler/sources":           mockOK,
	"POST /api/v1/admin/crawler/sources":          mockOK,
	"PUT /api/v1/admin/crawler/sources/:id":       mockOK,
	"DELETE /api/v1/admin/crawler/sources/:id":    mockOK,
	"GET /api/v1/admin/crawler/logs":              mockOK,
	"POST /api/v1/admin/crawler/trigger/:source_id": mockOK,
	"GET /api/v1/admin/crawler/status":            mockOK,
}

func mockOK(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"code": 200, "message": "success", "data": nil})
}

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.Use(middleware.CORS(nil))
	r.Use(middleware.Logger())

	api := r.Group("/api/v1")

	auth := api.Group("/auth")
	{
		auth.POST("/sms-code", mockOK)
		auth.POST("/login", mockOK)
		auth.POST("/login-password", mockOK)
		auth.POST("/register", mockOK)
		auth.POST("/refresh", mockOK)
		auth.POST("/logout", mockOK)
	}

	adminAuth := api.Group("/admin/auth")
	{
		adminAuth.POST("/login", mockOK)
		adminAuth.POST("/logout", mockOK)
		adminAuth.GET("/info", mockOK)
		adminAuth.PUT("/password", mockOK)
	}

	api.Use(middleware.Auth())

	users := api.Group("/users")
	{
		users.GET("/profile", mockOK)
		users.PUT("/profile", mockOK)
		users.PUT("/password", mockOK)
	}

	prices := api.Group("/prices")
	{
		prices.GET("", mockOK)
		prices.GET("/latest", mockOK)
		prices.GET("/trend", mockOK)
		prices.GET("/compare", mockOK)
	}

	quotations := api.Group("/quotations")
	{
		quotations.POST("/calculate", mockOK)
		quotations.POST("", mockOK)
		quotations.GET("", mockOK)
		quotations.GET("/:id", mockOK)
		quotations.PUT("/:id", mockOK)
		quotations.DELETE("/:id", mockOK)
		quotations.GET("/:id/pdf", mockOK)
	}

	knowledge := api.Group("/knowledge")
	{
		knowledge.GET("/search", mockOK)
	}

	standards := api.Group("/standards")
	{
		standards.GET("", mockOK)
		standards.GET("/:id", mockOK)
	}

	grades := api.Group("/grades")
	{
		grades.GET("/compare", mockOK)
	}

	terms := api.Group("/terms")
	{
		terms.GET("", mockOK)
		terms.GET("/:id", mockOK)
	}

	tools := api.Group("/tools")
	{
		tools.POST("/weight", mockOK)
		tools.POST("/convert", mockOK)
	}

	tenders := api.Group("/tenders")
	{
		tenders.GET("", mockOK)
		tenders.GET("/:id", mockOK)
		tenders.POST("/favorites", mockOK)
		tenders.DELETE("/favorites/:id", mockOK)
		tenders.GET("/recommend", mockOK)
	}

	alerts := api.Group("/alerts")
	{
		alerts.POST("", mockOK)
		alerts.GET("", mockOK)
		alerts.PUT("/:id", mockOK)
		alerts.DELETE("/:id", mockOK)
	}

	chat := api.Group("/chat")
	{
		chat.POST("/completions", mockOK)
		chat.GET("/sessions", mockOK)
	}

	api.GET("/news", mockOK)
	api.GET("/news/:id", mockOK)
	api.GET("/reports/daily", mockOK)
	api.GET("/reports/weekly", mockOK)
	api.GET("/calendar", mockOK)
	api.GET("/admin/dashboard", mockOK)

	adminCrawler := api.Group("/admin/crawler")
	{
		adminCrawler.GET("/sources", mockOK)
		adminCrawler.POST("/sources", mockOK)
		adminCrawler.PUT("/sources/:id", mockOK)
		adminCrawler.DELETE("/sources/:id", mockOK)
		adminCrawler.GET("/logs", mockOK)
		adminCrawler.POST("/trigger/:source_id", mockOK)
		adminCrawler.GET("/status", mockOK)
	}

	return r
}

func TestPublicRoutes_NoAuthRequired(t *testing.T) {
	config.AppConfig = &config.Config{JWTSecret: "test-secret"}
	r := setupTestRouter()

	for key := range publicRouteHandlers {
		parts := strings.SplitN(key, " ", 2)
		method := parts[0]
		path := parts[1]

		w := httptest.NewRecorder()
		req := httptest.NewRequest(method, path, nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("%s %s expected 200, got %d", method, path, w.Code)
		}
	}
}

func TestProtectedRoutes_NoToken_Returns401(t *testing.T) {
	config.AppConfig = &config.Config{JWTSecret: "test-secret"}
	r := setupTestRouter()

	for key := range protectedRouteHandlers {
		parts := strings.SplitN(key, " ", 2)
		method := parts[0]
		path := parts[1]

		w := httptest.NewRecorder()
		req := httptest.NewRequest(method, path, nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("%s %s expected 401, got %d (body: %s)", method, path, w.Code, w.Body.String())
		}
	}
}

func TestProtectedRoutes_WithValidToken_Returns200(t *testing.T) {
	config.AppConfig = &config.Config{JWTSecret: "test-secret"}
	token, err := jwt.GenerateAccessToken(1, "admin", 0)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	r := setupTestRouter()

	for key := range protectedRouteHandlers {
		parts := strings.SplitN(key, " ", 2)
		method := parts[0]
		path := parts[1]

		w := httptest.NewRecorder()
		req := httptest.NewRequest(method, path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("%s %s with valid token expected 200, got %d", method, path, w.Code)
		}
	}
}

func TestProtectedRoutes_InvalidToken_Returns401(t *testing.T) {
	config.AppConfig = &config.Config{JWTSecret: "test-secret"}
	r := setupTestRouter()

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/users/profile", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 with invalid token, got %d", w.Code)
	}
}

func TestProtectedRoutes_MalformedAuthHeader_Returns401(t *testing.T) {
	config.AppConfig = &config.Config{JWTSecret: "test-secret"}
	r := setupTestRouter()

	tests := []struct {
		header string
		desc   string
	}{
		{"", "empty header"},
		{"Basic dXNlcjpwYXNz", "Basic auth instead of Bearer"},
		{"Bearer", "Bearer without token"},
	}

	for _, tt := range tests {
		t.Run(tt.desc, func(t *testing.T) {
			w := httptest.NewRecorder()
			req := httptest.NewRequest("GET", "/api/v1/users/profile", nil)
			if tt.header != "" {
				req.Header.Set("Authorization", tt.header)
			}
			r.ServeHTTP(w, req)

			if w.Code != http.StatusUnauthorized {
				t.Errorf("expected 401 for %s, got %d", tt.desc, w.Code)
			}
		})
	}
}

func TestAuthMiddleware_401ResponseFormat(t *testing.T) {
	config.AppConfig = &config.Config{JWTSecret: "test-secret"}
	r := setupTestRouter()

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/prices/latest", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse response body: %v", err)
	}

	if code, ok := body["code"]; !ok {
		t.Error("response missing 'code' field")
	} else if codeVal, ok := code.(float64); !ok || codeVal != 401 {
		t.Errorf("expected code 401, got %v", code)
	}

	if msg, ok := body["message"]; !ok || msg == "" {
		t.Error("response missing non-empty 'message' field")
	}
}

func TestStaticRoutes_NoParams_Registered(t *testing.T) {
	config.AppConfig = &config.Config{JWTSecret: "test-secret"}
	token, _ := jwt.GenerateAccessToken(1, "admin", 0)
	r := setupTestRouter()

	staticRoutes := []struct {
		method string
		path   string
	}{
		{"GET", "/api/v1/news"},
		{"GET", "/api/v1/reports/daily"},
		{"GET", "/api/v1/reports/weekly"},
		{"GET", "/api/v1/calendar"},
		{"GET", "/api/v1/admin/dashboard"},
	}

	for _, route := range staticRoutes {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(route.method, route.path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("%s %s expected 200, got %d", route.method, route.path, w.Code)
		}
	}
}

func TestParamRoutes_Registered(t *testing.T) {
	config.AppConfig = &config.Config{JWTSecret: "test-secret"}
	token, _ := jwt.GenerateAccessToken(1, "admin", 0)
	r := setupTestRouter()

	paramRoutes := []struct {
		method string
		path   string
	}{
		{"GET", "/api/v1/quotations/123"},
		{"PUT", "/api/v1/quotations/123"},
		{"DELETE", "/api/v1/quotations/123"},
		{"GET", "/api/v1/quotations/123/pdf"},
		{"GET", "/api/v1/standards/abc"},
		{"GET", "/api/v1/terms/abc"},
		{"GET", "/api/v1/tenders/456"},
		{"DELETE", "/api/v1/tenders/favorites/456"},
		{"PUT", "/api/v1/alerts/1"},
		{"DELETE", "/api/v1/alerts/1"},
		{"GET", "/api/v1/news/456"},
		{"PUT", "/api/v1/admin/crawler/sources/1"},
		{"DELETE", "/api/v1/admin/crawler/sources/1"},
		{"POST", "/api/v1/admin/crawler/trigger/1"},
	}

	for _, route := range paramRoutes {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(route.method, route.path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("%s %s expected 200, got %d", route.method, route.path, w.Code)
		}
	}
}

func TestRouteCount(t *testing.T) {
	config.AppConfig = &config.Config{JWTSecret: "test-secret"}
	r := setupTestRouter()

	routes := r.Routes()

	if len(routes) == 0 {
		t.Error("expected non-zero routes")
	}

	expectedMin := len(publicRouteHandlers) + len(protectedRouteHandlers)
	if len(routes) < expectedMin {
		t.Errorf("expected at least %d routes, got %d", expectedMin, len(routes))
	}

	t.Logf("total registered routes: %d", len(routes))
}
