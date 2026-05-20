package response

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

func TestSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

	Success(c, gin.H{"key": "value"})

	if w.Code != http.StatusOK {
		t.Errorf("HTTP status = %d, want %d", w.Code, http.StatusOK)
	}

	var resp Response
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}
	if resp.Code != 200 {
		t.Errorf("code = %d, want 200", resp.Code)
	}
	if resp.Message != "success" {
		t.Errorf("message = %q, want %q", resp.Message, "success")
	}

	data, ok := resp.Data.(map[string]interface{})
	if !ok {
		t.Fatalf("data is not a map: %T", resp.Data)
	}
	if data["key"] != "value" {
		t.Errorf("data.key = %v, want %q", data["key"], "value")
	}
}

func TestResponseHelpers(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name        string
		call        func(c *gin.Context)
		wantCode    int
		wantMessage string
	}{
		{
			name: "Success",
			call: func(c *gin.Context) {
				Success(c, gin.H{"key": "value"})
			},
			wantCode:    200,
			wantMessage: "success",
		},
		{
			name: "Error",
			call: func(c *gin.Context) {
				Error(c, errors.CodeParamError, "custom msg")
			},
			wantCode:    40001,
			wantMessage: "custom msg",
		},
		{
			name: "BadRequest",
			call: func(c *gin.Context) {
				BadRequest(c, "bad request test")
			},
			wantCode:    40001,
			wantMessage: "bad request test",
		},
		{
			name: "BusinessError",
			call: func(c *gin.Context) {
				BusinessError(c, "business error test")
			},
			wantCode:    40002,
			wantMessage: "business error test",
		},
		{
			name: "Unauthorized",
			call: func(c *gin.Context) {
				Unauthorized(c, "unauthorized test")
			},
			wantCode:    40101,
			wantMessage: "unauthorized test",
		},
		{
			name: "TokenInvalid",
			call: func(c *gin.Context) {
				TokenInvalid(c, "token invalid test")
			},
			wantCode:    40102,
			wantMessage: "token invalid test",
		},
		{
			name: "Forbidden",
			call: func(c *gin.Context) {
				Forbidden(c, "forbidden test")
			},
			wantCode:    40301,
			wantMessage: "forbidden test",
		},
		{
			name: "NotFound",
			call: func(c *gin.Context) {
				NotFound(c, "not found test")
			},
			wantCode:    40401,
			wantMessage: "not found test",
		},
		{
			name: "Conflict",
			call: func(c *gin.Context) {
				Conflict(c, "conflict test")
			},
			wantCode:    40901,
			wantMessage: "conflict test",
		},
		{
			name: "InternalError",
			call: func(c *gin.Context) {
				InternalError(c, "internal error test")
			},
			wantCode:    50001,
			wantMessage: "internal error test",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
			tt.call(c)

			if w.Code != http.StatusOK {
				t.Errorf("HTTP status = %d, want %d", w.Code, http.StatusOK)
			}

			var resp Response
			if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
				t.Fatalf("failed to unmarshal: %v", err)
			}
			if resp.Code != tt.wantCode {
				t.Errorf("code = %d, want %d", resp.Code, tt.wantCode)
			}
			if resp.Message != tt.wantMessage {
				t.Errorf("message = %q, want %q", resp.Message, tt.wantMessage)
			}
		})
	}
}

func TestErrorNilData(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

	Error(c, errors.CodeInternalError, "server error")

	var resp Response
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}
	if resp.Data != nil {
		t.Errorf("data = %v, want nil", resp.Data)
	}
}
