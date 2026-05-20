package handler

import (
	"context"
	"encoding/json"
	stderrors "errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

type mockAgentConfigService struct {
	getConfigFn         func(ctx context.Context) (*service.AgentConfigDO, error)
	saveConfigFn        func(ctx context.Context, config *service.AgentConfigDO) error
	getPromptVersionsFn func(ctx context.Context) ([]service.PromptVersionDO, error)
	savePromptVersionsFn func(ctx context.Context, versions []service.PromptVersionDO) error
	testConnectionFn    func(ctx context.Context, req *service.TestConnectionRequest) (*service.TestConnectionResponse, error)
}

func (m *mockAgentConfigService) GetAgentConfig(ctx context.Context) (*service.AgentConfigDO, error) {
	return m.getConfigFn(ctx)
}

func (m *mockAgentConfigService) SaveAgentConfig(ctx context.Context, config *service.AgentConfigDO) error {
	return m.saveConfigFn(ctx, config)
}

func (m *mockAgentConfigService) GetPromptVersions(ctx context.Context) ([]service.PromptVersionDO, error) {
	return m.getPromptVersionsFn(ctx)
}

func (m *mockAgentConfigService) SavePromptVersions(ctx context.Context, versions []service.PromptVersionDO) error {
	return m.savePromptVersionsFn(ctx, versions)
}

func (m *mockAgentConfigService) TestConnection(ctx context.Context, req *service.TestConnectionRequest) (*service.TestConnectionResponse, error) {
	return m.testConnectionFn(ctx, req)
}

func setupAgentConfigRouter(mock *mockAgentConfigService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &AgentConfigHandler{agentConfigService: mock}
	router := gin.New()
	router.GET("/admin/agent-config", handler.GetConfig)
	router.PUT("/admin/agent-config", handler.SaveConfig)
	router.GET("/admin/agent-config/prompt-versions", handler.GetPromptVersions)
	router.PUT("/admin/agent-config/prompt-versions", handler.SavePromptVersions)
	return router
}

func TestGetAgentConfig_Success(t *testing.T) {
	mock := &mockAgentConfigService{
		getConfigFn: func(ctx context.Context) (*service.AgentConfigDO, error) {
			return &service.AgentConfigDO{
				PrimaryModel: "gpt-4o-mini",
				Temperature:  0.1,
				MaxTokens:    2048,
				Timeout:      30,
			}, nil
		},
	}
	router := setupAgentConfigRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/agent-config", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int                  `json:"code"`
		Message string               `json:"message"`
		Data    service.AgentConfigDO `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.PrimaryModel != "gpt-4o-mini" {
		t.Errorf("expected PrimaryModel gpt-4o-mini, got %s", resp.Data.PrimaryModel)
	}
	if resp.Data.Temperature != 0.1 {
		t.Errorf("expected Temperature 0.1, got %f", resp.Data.Temperature)
	}
}

func TestGetAgentConfig_ServiceError(t *testing.T) {
	mock := &mockAgentConfigService{
		getConfigFn: func(ctx context.Context) (*service.AgentConfigDO, error) {
			return nil, stderrors.New("db connection failed")
		},
	}
	router := setupAgentConfigRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/agent-config", nil)
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

func TestSaveAgentConfig_Success(t *testing.T) {
	var saved *service.AgentConfigDO
	mock := &mockAgentConfigService{
		saveConfigFn: func(ctx context.Context, config *service.AgentConfigDO) error {
			saved = config
			return nil
		},
	}
	router := setupAgentConfigRouter(mock)

	body := `{
		"primaryModel": "gpt-4o-mini",
		"backupModel": "qwen-turbo",
		"temperature": 0.1,
		"maxTokens": 2048,
		"apiKey": "sk-test",
		"timeout": 30,
		"systemPrompt": "test prompt",
		"welcomeMessage": "hello",
		"quickCommands": [],
		"hallucinationRules": [],
		"disclaimer": "disclaimer",
		"forceToolForData": true,
		"useTemplateForChat": false
	}`
	req, _ := http.NewRequest("PUT", "/admin/agent-config", strings.NewReader(body))
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
		t.Fatal("expected config to be saved")
	}
	if saved.PrimaryModel != "gpt-4o-mini" {
		t.Errorf("expected PrimaryModel gpt-4o-mini, got %s", saved.PrimaryModel)
	}
	if saved.SystemPrompt != "test prompt" {
		t.Errorf("expected SystemPrompt 'test prompt', got '%s'", saved.SystemPrompt)
	}
}

func TestSaveAgentConfig_InvalidJSON(t *testing.T) {
	mock := &mockAgentConfigService{}
	router := setupAgentConfigRouter(mock)

	req, _ := http.NewRequest("PUT", "/admin/agent-config", strings.NewReader(`{invalid`))
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

func TestSaveAgentConfig_ServiceError(t *testing.T) {
	mock := &mockAgentConfigService{
		saveConfigFn: func(ctx context.Context, config *service.AgentConfigDO) error {
			return stderrors.New("save failed")
		},
	}
	router := setupAgentConfigRouter(mock)

	body := `{"primaryModel": "test"}`
	req, _ := http.NewRequest("PUT", "/admin/agent-config", strings.NewReader(body))
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

func TestGetPromptVersions_Success(t *testing.T) {
	mock := &mockAgentConfigService{
		getPromptVersionsFn: func(ctx context.Context) ([]service.PromptVersionDO, error) {
			return []service.PromptVersionDO{
				{Version: "v1", Editor: "admin", EditedAt: "2026-05-19", IsCurrent: true, Content: "test"},
			}, nil
		},
	}
	router := setupAgentConfigRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/agent-config/prompt-versions", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int                       `json:"code"`
		Message string                    `json:"message"`
		Data    []service.PromptVersionDO `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if len(resp.Data) != 1 {
		t.Errorf("expected 1 version, got %d", len(resp.Data))
	}
	if resp.Data[0].Version != "v1" {
		t.Errorf("expected version v1, got %s", resp.Data[0].Version)
	}
}

func TestGetPromptVersions_EmptyList(t *testing.T) {
	mock := &mockAgentConfigService{
		getPromptVersionsFn: func(ctx context.Context) ([]service.PromptVersionDO, error) {
			return []service.PromptVersionDO{}, nil
		},
	}
	router := setupAgentConfigRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/agent-config/prompt-versions", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int                       `json:"code"`
		Message string                    `json:"message"`
		Data    []service.PromptVersionDO `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data == nil {
		t.Error("expected non-nil data slice")
	}
}

func TestGetPromptVersions_ServiceError(t *testing.T) {
	mock := &mockAgentConfigService{
		getPromptVersionsFn: func(ctx context.Context) ([]service.PromptVersionDO, error) {
			return nil, stderrors.New("db error")
		},
	}
	router := setupAgentConfigRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/agent-config/prompt-versions", nil)
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

func TestSavePromptVersions_Success(t *testing.T) {
	var saved []service.PromptVersionDO
	mock := &mockAgentConfigService{
		savePromptVersionsFn: func(ctx context.Context, versions []service.PromptVersionDO) error {
			saved = versions
			return nil
		},
	}
	router := setupAgentConfigRouter(mock)

	body := `[
		{"version": "v2", "editor": "admin", "editedAt": "2026-05-19", "isCurrent": true, "content": "new prompt"},
		{"version": "v1", "editor": "admin", "editedAt": "2026-05-18", "isCurrent": false, "content": "old prompt"}
	]`
	req, _ := http.NewRequest("PUT", "/admin/agent-config/prompt-versions", strings.NewReader(body))
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
	if len(saved) != 2 {
		t.Errorf("expected 2 versions saved, got %d", len(saved))
	}
}

func TestSavePromptVersions_InvalidJSON(t *testing.T) {
	mock := &mockAgentConfigService{}
	router := setupAgentConfigRouter(mock)

	req, _ := http.NewRequest("PUT", "/admin/agent-config/prompt-versions", strings.NewReader(`{invalid`))
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

func TestSavePromptVersions_ServiceError(t *testing.T) {
	mock := &mockAgentConfigService{
		savePromptVersionsFn: func(ctx context.Context, versions []service.PromptVersionDO) error {
			return stderrors.New("save failed")
		},
	}
	router := setupAgentConfigRouter(mock)

	body := `[{"version": "v1", "editor": "admin", "editedAt": "2026-05-19", "isCurrent": true, "content": "test"}]`
	req, _ := http.NewRequest("PUT", "/admin/agent-config/prompt-versions", strings.NewReader(body))
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
