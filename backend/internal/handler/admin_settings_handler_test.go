package handler

import (
	"bytes"
	"context"
	"encoding/json"
	stderrors "errors"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

type mockAdminSettingsService struct {
	getSettingsFn    func(ctx context.Context) (map[string]interface{}, error)
	saveSettingsFn   func(ctx context.Context, data map[string]interface{}) error
	getPublicConfigFn func(ctx context.Context) (map[string]interface{}, error)
	uploadLogoFn     func(ctx context.Context, file *multipart.FileHeader) (string, error)
	testEmailFn      func(ctx context.Context, smtpConfig map[string]interface{}) (bool, string, error)
	testSmsFn        func(ctx context.Context, phone string) (bool, string, error)
}

func (m *mockAdminSettingsService) GetSettings(ctx context.Context) (map[string]interface{}, error) {
	return m.getSettingsFn(ctx)
}

func (m *mockAdminSettingsService) SaveSettings(ctx context.Context, data map[string]interface{}) error {
	return m.saveSettingsFn(ctx, data)
}

func (m *mockAdminSettingsService) GetPublicConfig(ctx context.Context) (map[string]interface{}, error) {
	return m.getPublicConfigFn(ctx)
}

func (m *mockAdminSettingsService) UploadLogo(ctx context.Context, file *multipart.FileHeader) (string, error) {
	return m.uploadLogoFn(ctx, file)
}

func (m *mockAdminSettingsService) TestEmail(ctx context.Context, smtpConfig map[string]interface{}) (bool, string, error) {
	return m.testEmailFn(ctx, smtpConfig)
}

func (m *mockAdminSettingsService) TestSMS(ctx context.Context, phone string) (bool, string, error) {
	return m.testSmsFn(ctx, phone)
}

func setupAdminSettingsRouter(mock *mockAdminSettingsService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &AdminSettingsHandler{adminSettingsService: mock}
	router := gin.New()
	router.GET("/admin/settings", handler.GetSettings)
	router.PUT("/admin/settings", handler.UpdateSettings)
	router.GET("/public/config", handler.GetPublicConfig)
	router.POST("/admin/settings/upload-logo", handler.UploadLogo)
	router.POST("/admin/settings/test-email", handler.TestEmail)
	router.POST("/admin/settings/test-sms", handler.TestSMS)
	return router
}

func TestGetSettings_Success(t *testing.T) {
	mock := &mockAdminSettingsService{
		getSettingsFn: func(ctx context.Context) (map[string]interface{}, error) {
			return map[string]interface{}{
				"siteName":          "钢铁行业Agent",
				"siteDescription":   "钢铁行业智能助手",
				"logoUrl":           "/uploads/default-logo.png",
				"faviconUrl":        "/uploads/favicon.ico",
				"contactEmail":      "admin@steel.com",
				"contactPhone":      "400-123-4567",
				"contactAddress":    "上海市浦东新区",
				"smtpHost":          "smtp.example.com",
				"smtpPort":          587,
				"smtpUser":          "noreply@steel.com",
				"smtpPassword":      "encrypted_password",
				"smtpFromName":      "钢铁行业Agent",
				"emailNotification": true,
				"smsNotification":   false,
				"pushNotification":  true,
				"maintenanceMode":   false,
				"allowRegister":     true,
			}, nil
		},
	}
	router := setupAdminSettingsRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/settings", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int                    `json:"code"`
		Message string                 `json:"message"`
		Data    map[string]interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data["siteName"] != "钢铁行业Agent" {
		t.Errorf("expected siteName '钢铁行业Agent', got %v", resp.Data["siteName"])
	}
}

func TestGetSettings_ServiceError(t *testing.T) {
	mock := &mockAdminSettingsService{
		getSettingsFn: func(ctx context.Context) (map[string]interface{}, error) {
			return nil, stderrors.New("db connection failed")
		},
	}
	router := setupAdminSettingsRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/settings", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeInternalError {
		t.Errorf("expected code %d, got %d", errors.CodeInternalError, resp.Code)
	}
}

func TestUpdateSettings_Success(t *testing.T) {
	var saved map[string]interface{}
	mock := &mockAdminSettingsService{
		saveSettingsFn: func(ctx context.Context, data map[string]interface{}) error {
			saved = data
			return nil
		},
	}
	router := setupAdminSettingsRouter(mock)

	body := `{"siteName":"新名称"}`
	req, _ := http.NewRequest("PUT", "/admin/settings", strings.NewReader(body))
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
	if saved == nil {
		t.Fatal("expected settings to be saved")
	}
	if saved["siteName"] != "新名称" {
		t.Errorf("expected siteName '新名称', got %v", saved["siteName"])
	}
}

func TestUpdateSettings_InvalidJSON(t *testing.T) {
	mock := &mockAdminSettingsService{}
	router := setupAdminSettingsRouter(mock)

	req, _ := http.NewRequest("PUT", "/admin/settings", strings.NewReader(`{broken`))
	req.Header.Set("Content-Type", "application/json")
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

func TestTestSMS_Success(t *testing.T) {
	mock := &mockAdminSettingsService{
		testSmsFn: func(ctx context.Context, phone string) (bool, string, error) {
			return true, "测试短信已成功发送", nil
		},
	}
	router := setupAdminSettingsRouter(mock)

	body := `{"phone":"13800138000"}`
	req, _ := http.NewRequest("POST", "/admin/settings/test-sms", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if !resp.Data.Success {
		t.Error("expected data.success to be true")
	}
	if resp.Data.Message != "测试短信已成功发送" {
		t.Errorf("expected message '测试短信已成功发送', got '%s'", resp.Data.Message)
	}
}

func TestTestSMS_NotEnabled(t *testing.T) {
	mock := &mockAdminSettingsService{
		testSmsFn: func(ctx context.Context, phone string) (bool, string, error) {
			return false, "短信功能未启用，请先在系统设置中开启并保存配置", nil
		},
	}
	router := setupAdminSettingsRouter(mock)

	body := `{"phone":"13800138000"}`
	req, _ := http.NewRequest("POST", "/admin/settings/test-sms", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Success {
		t.Error("expected data.success to be false when SMS not enabled")
	}
}

func TestTestSMS_MissingPhone(t *testing.T) {
	mock := &mockAdminSettingsService{}
	router := setupAdminSettingsRouter(mock)

	body := `{}`
	req, _ := http.NewRequest("POST", "/admin/settings/test-sms", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
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

func TestTestSMS_InvalidJSON(t *testing.T) {
	mock := &mockAdminSettingsService{}
	router := setupAdminSettingsRouter(mock)

	req, _ := http.NewRequest("POST", "/admin/settings/test-sms", strings.NewReader(`{broken`))
	req.Header.Set("Content-Type", "application/json")
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

func TestUpdateSettings_ServiceError(t *testing.T) {
	mock := &mockAdminSettingsService{
		saveSettingsFn: func(ctx context.Context, data map[string]interface{}) error {
			return stderrors.New("save failed")
		},
	}
	router := setupAdminSettingsRouter(mock)

	body := `{"siteName":"test"}`
	req, _ := http.NewRequest("PUT", "/admin/settings", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeInternalError {
		t.Errorf("expected code %d, got %d", errors.CodeInternalError, resp.Code)
	}
	if resp.Message != "保存失败" {
		t.Errorf("expected message '保存失败', got '%s'", resp.Message)
	}
}

func TestGetPublicConfig_Success(t *testing.T) {
	mock := &mockAdminSettingsService{
		getPublicConfigFn: func(ctx context.Context) (map[string]interface{}, error) {
			return map[string]interface{}{
				"siteName":      "钢铁行业Agent",
				"logoUrl":       "/uploads/logo.png",
				"contactEmail":  "admin@steel.com",
				"contactPhone":  "400-123-4567",
			}, nil
		},
	}
	router := setupAdminSettingsRouter(mock)

	req, _ := http.NewRequest("GET", "/public/config", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int                    `json:"code"`
		Message string                 `json:"message"`
		Data    map[string]interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data["siteName"] == nil {
		t.Error("expected data.siteName to exist")
	}
	if resp.Data["logoUrl"] == nil {
		t.Error("expected data.logoUrl to exist")
	}
	if resp.Data["contactEmail"] == nil {
		t.Error("expected data.contactEmail to exist")
	}
	if resp.Data["contactPhone"] == nil {
		t.Error("expected data.contactPhone to exist")
	}
}

func TestGetPublicConfig_ServiceError(t *testing.T) {
	mock := &mockAdminSettingsService{
		getPublicConfigFn: func(ctx context.Context) (map[string]interface{}, error) {
			return nil, stderrors.New("db error")
		},
	}
	router := setupAdminSettingsRouter(mock)

	req, _ := http.NewRequest("GET", "/public/config", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeInternalError {
		t.Errorf("expected code %d, got %d", errors.CodeInternalError, resp.Code)
	}
}

func TestUploadLogo_Success(t *testing.T) {
	mock := &mockAdminSettingsService{
		uploadLogoFn: func(ctx context.Context, file *multipart.FileHeader) (string, error) {
			return "/uploads/logo_123.png", nil
		},
	}
	router := setupAdminSettingsRouter(mock)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "logo.png")
	io.WriteString(part, "fake-image-content")
	writer.Close()

	req, _ := http.NewRequest("POST", "/admin/settings/upload-logo", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int               `json:"code"`
		Message string            `json:"message"`
		Data    map[string]string `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if !strings.HasPrefix(resp.Data["url"], "/uploads/") {
		t.Errorf("expected url to start with /uploads/, got %s", resp.Data["url"])
	}
}

func TestUploadLogo_NoFile(t *testing.T) {
	mock := &mockAdminSettingsService{}
	router := setupAdminSettingsRouter(mock)

	req, _ := http.NewRequest("POST", "/admin/settings/upload-logo", nil)
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

func TestTestEmail_Success(t *testing.T) {
	mock := &mockAdminSettingsService{
		testEmailFn: func(ctx context.Context, smtpConfig map[string]interface{}) (bool, string, error) {
			return true, "发送成功", nil
		},
	}
	router := setupAdminSettingsRouter(mock)

	body := `{"smtpHost":"smtp.example.com","smtpPort":587}`
	req, _ := http.NewRequest("POST", "/admin/settings/test-email", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if !resp.Data.Success {
		t.Error("expected data.success to be true")
	}
}

func TestTestEmail_EmptyServer(t *testing.T) {
	mock := &mockAdminSettingsService{
		testEmailFn: func(ctx context.Context, smtpConfig map[string]interface{}) (bool, string, error) {
			return false, "SMTP服务器地址不能为空", nil
		},
	}
	router := setupAdminSettingsRouter(mock)

	body := `{"smtpHost":""}`
	req, _ := http.NewRequest("POST", "/admin/settings/test-email", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.Success {
		t.Error("expected data.success to be false")
	}
}

func TestTestEmail_InvalidJSON(t *testing.T) {
	mock := &mockAdminSettingsService{}
	router := setupAdminSettingsRouter(mock)

	req, _ := http.NewRequest("POST", "/admin/settings/test-email", strings.NewReader(`{broken`))
	req.Header.Set("Content-Type", "application/json")
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
