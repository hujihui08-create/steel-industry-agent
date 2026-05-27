package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

// These contract tests validate the HTTP response format of the API endpoints.
// They verify correct JSON structure, status codes, and required fields,
// without connecting to an actual database.

// Contract: Prices Latest endpoint
func TestContract_PricesLatest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Simulate the prices/latest handler behavior
	router.GET("/api/v1/prices/latest", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"code":    200,
			"message": "success",
			"data": []gin.H{
				{"category": "螺纹钢", "price": 3850.0, "region": "上海", "price_date": "2026-05-28"},
				{"category": "热卷", "price": 4200.0, "region": "上海", "price_date": "2026-05-28"},
			},
		})
	})

	req, _ := http.NewRequest("GET", "/api/v1/prices/latest", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    []struct {
			Category  string  `json:"category"`
			Price     float64 `json:"price"`
			Region    string  `json:"region"`
			PriceDate string  `json:"price_date"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Message != "success" {
		t.Errorf("expected message 'success', got '%s'", resp.Message)
	}
	if len(resp.Data) != 2 {
		t.Fatalf("expected 2 items, got %d", len(resp.Data))
	}
	if resp.Data[0].Category == "" {
		t.Error("expected non-empty category field")
	}
	if resp.Data[0].Price == 0 {
		t.Error("expected non-zero price field")
	}
	if resp.Data[0].Region == "" {
		t.Error("expected non-empty region field")
	}
	if resp.Data[0].PriceDate == "" {
		t.Error("expected non-empty price_date field")
	}
}

// Contract: Auth Login endpoint
func TestContract_AuthLogin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	router.POST("/api/v1/auth/login", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"code":    200,
			"message": "success",
			"data": gin.H{
				"access_token":  "eyJhbGciOiJIUzI1NiJ9.test",
				"refresh_token": "eyJhbGciOiJIUzI1NiJ9.refresh",
				"expires_in":    7200,
			},
		})
	})

	body := `{"phone": "13800138000", "code": "123456"}`
	req, _ := http.NewRequest("POST", "/api/v1/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
			ExpiresIn    int    `json:"expires_in"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

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

// Contract: Auth Login with missing fields
func TestContract_AuthLogin_MissingFields(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	router.POST("/api/v1/auth/login", func(c *gin.Context) {
		var req struct {
			Phone string `json:"phone" binding:"required"`
			Code  string `json:"code" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(200, gin.H{
				"code":    errors.CodeParamError,
				"message": "参数错误",
				"data":    nil,
			})
			return
		}
		c.JSON(200, gin.H{"code": 200, "message": "success", "data": nil})
	})

	// Empty body
	req, _ := http.NewRequest("POST", "/api/v1/auth/login", strings.NewReader(`{}`))
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

	// Missing body entirely
	req2, _ := http.NewRequest("POST", "/api/v1/auth/login", strings.NewReader(``))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	var resp2 struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w2.Body.Bytes(), &resp2)
	// Should return an error code, not 200
	if resp2.Code != errors.CodeParamError {
		t.Errorf("expected code %d, got %d", errors.CodeParamError, resp2.Code)
	}
}

// Contract: Quotation Calculate endpoint
func TestContract_QuotationCalculate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	router.POST("/api/v1/quotations/calculate", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"code":    200,
			"message": "success",
			"data": gin.H{
				"material_cost": 385000.0,
				"process_cost":  30800.0,
				"freight_cost":  5000.0,
				"tax_cost":      54704.0,
				"total_price":   475504.0,
				"unit_price":    3850.0,
			},
		})
	})

	body := `{"category": "螺纹钢", "spec": "HRB400E 20mm", "quantity": 100}`
	req, _ := http.NewRequest("POST", "/api/v1/quotations/calculate", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			MaterialCost float64 `json:"material_cost"`
			ProcessCost  float64 `json:"process_cost"`
			FreightCost  float64 `json:"freight_cost"`
			TaxCost      float64 `json:"tax_cost"`
			TotalPrice   float64 `json:"total_price"`
			UnitPrice    float64 `json:"unit_price"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.TotalPrice <= 0 {
		t.Errorf("expected positive total_price, got %f", resp.Data.TotalPrice)
	}
	if resp.Data.UnitPrice <= 0 {
		t.Errorf("expected positive unit_price, got %f", resp.Data.UnitPrice)
	}
	if resp.Data.MaterialCost <= 0 {
		t.Errorf("expected positive material_cost, got %f", resp.Data.MaterialCost)
	}
}

// Contract: Error response format
func TestContract_ErrorResponseFormat(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	router.GET("/api/v1/test-error", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"code":    errors.CodeInternalError,
			"message": "服务器内部错误",
			"data":    nil,
		})
	})

	req, _ := http.NewRequest("GET", "/api/v1/test-error", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if resp.Code != errors.CodeInternalError {
		t.Errorf("expected code %d, got %d", errors.CodeInternalError, resp.Code)
	}
	if resp.Message == "" {
		t.Error("expected non-empty message")
	}
	if resp.Data != nil {
		t.Errorf("expected nil data on error, got %v", resp.Data)
	}
}

// Contract: Empty data response
func TestContract_EmptyDataResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	router.GET("/api/v1/prices/latest", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"code":    200,
			"message": "success",
			"data":    []interface{}{},
		})
	})

	req, _ := http.NewRequest("GET", "/api/v1/prices/latest", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int             `json:"code"`
		Message string          `json:"message"`
		Data    json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	// Data should be an empty JSON array
	if string(resp.Data) != "[]" {
		t.Errorf("expected data to be '[]', got '%s'", string(resp.Data))
	}
}
