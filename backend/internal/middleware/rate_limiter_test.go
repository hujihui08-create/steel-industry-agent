package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

func TestRateLimiter_Allowed(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Rate: 10 requests per second, Burst: 5
	router := gin.New()
	router.Use(RateLimit(rate.Limit(10), 5))
	router.GET("/api/v1/prices", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Make requests within the limit
	for i := 0; i < 5; i++ {
		req, _ := http.NewRequest("GET", "/api/v1/prices", nil)
		req.RemoteAddr = "127.0.0.1:8080"
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != 200 {
			t.Errorf("request %d: expected status 200, got %d", i+1, w.Code)
		}
	}
}

func TestRateLimiter_Enforced(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Rate: 1 request per second, Burst: 1
	router := gin.New()
	router.Use(RateLimit(rate.Limit(1), 1))
	router.GET("/api/v1/prices", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// First request should pass
	req1, _ := http.NewRequest("GET", "/api/v1/prices", nil)
	req1.RemoteAddr = "127.0.0.1:8080"
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	if w1.Code != 200 {
		t.Errorf("first request: expected status 200, got %d", w1.Code)
	}

	// Second request should be rate limited (burst=1, rate=1/s)
	req2, _ := http.NewRequest("GET", "/api/v1/prices", nil)
	req2.RemoteAddr = "127.0.0.1:8080"
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	if w2.Code != http.StatusTooManyRequests {
		t.Errorf("second request: expected status 429, got %d", w2.Code)
	}

	// Verify Retry-After header
	if w2.Header().Get("Retry-After") == "" {
		t.Error("expected Retry-After header")
	}
}

func TestRateLimiter_DifferentIPs(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Rate: 1 request per second, Burst: 1
	router := gin.New()
	router.Use(RateLimit(rate.Limit(1), 1))
	router.GET("/api/v1/prices", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// IP 1: first request passes
	req1, _ := http.NewRequest("GET", "/api/v1/prices", nil)
	req1.RemoteAddr = "192.168.1.1:8080"
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	if w1.Code != 200 {
		t.Errorf("IP 1 first request: expected status 200, got %d", w1.Code)
	}

	// IP 2: first request should also pass (different limiter)
	req2, _ := http.NewRequest("GET", "/api/v1/prices", nil)
	req2.RemoteAddr = "192.168.1.2:8080"
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	if w2.Code != 200 {
		t.Errorf("IP 2 first request: expected status 200, got %d", w2.Code)
	}

	// IP 1: second request should be limited
	req3, _ := http.NewRequest("GET", "/api/v1/prices", nil)
	req3.RemoteAddr = "192.168.1.1:8080"
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, req3)
	if w3.Code != http.StatusTooManyRequests {
		t.Errorf("IP 1 second request: expected status 429, got %d", w3.Code)
	}

	// IP 2: second request should also be limited
	req4, _ := http.NewRequest("GET", "/api/v1/prices", nil)
	req4.RemoteAddr = "192.168.1.2:8080"
	w4 := httptest.NewRecorder()
	router.ServeHTTP(w4, req4)
	if w4.Code != http.StatusTooManyRequests {
		t.Errorf("IP 2 second request: expected status 429, got %d", w4.Code)
	}
}
