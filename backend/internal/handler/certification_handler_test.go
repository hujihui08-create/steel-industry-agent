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

type mockCertificationService struct {
	submitFn  func(ctx context.Context, userID uint, companyName, creditCode, contactName, contactPhone string) (*model.UserCertification, error)
	getMyFn   func(ctx context.Context, userID uint) (*model.UserCertification, error)
}

func (m *mockCertificationService) SubmitCertification(ctx context.Context, userID uint, companyName, creditCode, contactName, contactPhone string) (*model.UserCertification, error) {
	return m.submitFn(ctx, userID, companyName, creditCode, contactName, contactPhone)
}

func (m *mockCertificationService) GetMyCertification(ctx context.Context, userID uint) (*model.UserCertification, error) {
	return m.getMyFn(ctx, userID)
}

func setupCertRouter(mock *mockCertificationService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &CertificationHandler{certService: mock}
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	})
	router.POST("/api/v1/users/certification", handler.SubmitCertification)
	router.GET("/api/v1/users/certification", handler.GetMyCertification)
	return router
}

func TestSubmitCertification_Success(t *testing.T) {
	mock := &mockCertificationService{
		submitFn: func(ctx context.Context, userID uint, companyName, creditCode, contactName, contactPhone string) (*model.UserCertification, error) {
			return &model.UserCertification{
				ID:           1,
				UserID:       userID,
				CompanyName:  companyName,
				CreditCode:   creditCode,
				ContactName:  contactName,
				ContactPhone: contactPhone,
				Status:       "pending",
			}, nil
		},
	}
	router := setupCertRouter(mock)

	body := `{"company_name":"测试钢铁有限公司","credit_code":"123456789012345678","contact_name":"张三","contact_phone":"13800138000"}`
	req, _ := http.NewRequest("POST", "/api/v1/users/certification", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int                      `json:"code"`
		Data model.UserCertification `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.CompanyName != "测试钢铁有限公司" {
		t.Errorf("expected company_name '测试钢铁有限公司', got '%s'", resp.Data.CompanyName)
	}
	if resp.Data.Status != "pending" {
		t.Errorf("expected status 'pending', got '%s'", resp.Data.Status)
	}
}

func TestSubmitCertification_MissingFields(t *testing.T) {
	mock := &mockCertificationService{
		submitFn: func(ctx context.Context, userID uint, companyName, creditCode, contactName, contactPhone string) (*model.UserCertification, error) {
			return nil, nil
		},
	}
	router := setupCertRouter(mock)

	body := `{}`
	req, _ := http.NewRequest("POST", "/api/v1/users/certification", strings.NewReader(body))
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

func TestSubmitCertification_Conflict(t *testing.T) {
	mock := &mockCertificationService{
		submitFn: func(ctx context.Context, userID uint, companyName, creditCode, contactName, contactPhone string) (*model.UserCertification, error) {
			return nil, stderrors.New("您已有认证申请正在处理中")
		},
	}
	router := setupCertRouter(mock)

	body := `{"company_name":"测试钢铁有限公司","credit_code":"123456789012345678","contact_name":"张三","contact_phone":"13800138000"}`
	req, _ := http.NewRequest("POST", "/api/v1/users/certification", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeConflict {
		t.Errorf("expected code %d, got %d", errors.CodeConflict, resp.Code)
	}
}

func TestSubmitCertification_InternalError(t *testing.T) {
	mock := &mockCertificationService{
		submitFn: func(ctx context.Context, userID uint, companyName, creditCode, contactName, contactPhone string) (*model.UserCertification, error) {
			return nil, stderrors.New("database error")
		},
	}
	router := setupCertRouter(mock)

	body := `{"company_name":"测试钢铁有限公司","credit_code":"123456789012345678","contact_name":"张三","contact_phone":"13800138000"}`
	req, _ := http.NewRequest("POST", "/api/v1/users/certification", strings.NewReader(body))
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

func TestGetMyCertification_HasRecord(t *testing.T) {
	mock := &mockCertificationService{
		getMyFn: func(ctx context.Context, userID uint) (*model.UserCertification, error) {
			return &model.UserCertification{
				ID:           1,
				UserID:       userID,
				CompanyName:  "测试钢铁有限公司",
				CreditCode:   "123456789012345678",
				ContactName:  "张三",
				ContactPhone: "13800138000",
				Status:       "approved",
			}, nil
		},
	}
	router := setupCertRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/users/certification", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int                        `json:"code"`
		Data *model.UserCertification   `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data == nil {
		t.Fatal("expected data not nil")
	}
	if resp.Data.Status != "approved" {
		t.Errorf("expected status 'approved', got '%s'", resp.Data.Status)
	}
}

func TestGetMyCertification_NoRecord(t *testing.T) {
	mock := &mockCertificationService{
		getMyFn: func(ctx context.Context, userID uint) (*model.UserCertification, error) {
			return nil, stderrors.New("record not found")
		},
	}
	router := setupCertRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/users/certification", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int `json:"code"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200 (nil data), got %d", resp.Code)
	}
}

func TestGetMyCertification_PendingStatus(t *testing.T) {
	mock := &mockCertificationService{
		getMyFn: func(ctx context.Context, userID uint) (*model.UserCertification, error) {
			return &model.UserCertification{
				ID:     2,
				UserID: userID,
				Status: "pending",
			}, nil
		},
	}
	router := setupCertRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/users/certification", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code int                      `json:"code"`
		Data model.UserCertification `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Status != "pending" {
		t.Errorf("expected status 'pending', got '%s'", resp.Data.Status)
	}
}
