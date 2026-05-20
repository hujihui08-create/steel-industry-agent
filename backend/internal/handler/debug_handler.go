package handler

import (
	"context"
	"fmt"
	"io"

	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type debugService interface {
	StreamDebugChat(ctx context.Context, req *service.DebugDialogueRequest, ch chan<- string) error
	TestIntent(ctx context.Context, text string) (*service.IntentTestResult, error)
	ExecuteTool(ctx context.Context, toolName string, params map[string]interface{}, useMock bool) (*service.ToolExecuteResult, error)
	GetToolSchemas() ([]service.ToolSchema, error)
	CheckToolHealth(ctx context.Context) (*service.ToolHealthResult, error)
	PreviewPrompt(ctx context.Context, variables map[string]string) (*service.PromptPreviewResult, error)
	GetDebugSessions(ctx context.Context) ([]service.DebugSession, error)
	LoadDebugSession(ctx context.Context, sessionID uint) (*service.DebugSession, error)
	GetMockConfigs(ctx context.Context) ([]service.MockConfig, error)
	SetMockConfig(ctx context.Context, toolName string, mockData interface{}, scenario string) error
	DeleteMockConfig(ctx context.Context, toolName string) error
}

type DebugHandler struct {
	service debugService
}

func NewDebugHandler(s debugService) *DebugHandler {
	return &DebugHandler{service: s}
}

func (h *DebugHandler) StreamChat(c *gin.Context) {
	var req service.DebugDialogueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if req.Message == "" {
		response.Error(c, errors.CodeParamError, "message 不能为空")
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	ch := make(chan string, 100)

	go func() {
		defer close(ch)
		h.service.StreamDebugChat(c.Request.Context(), &req, ch)
	}()

	c.Stream(func(w io.Writer) bool {
		chunk, ok := <-ch
		if !ok {
			return false
		}
		fmt.Fprint(w, chunk)
		return true
	})
}

func (h *DebugHandler) TestIntent(c *gin.Context) {
	var req struct {
		Text string `json:"text" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	result, err := h.service.TestIntent(c.Request.Context(), req.Text)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, result)
}

func (h *DebugHandler) ExecuteTool(c *gin.Context) {
	var req struct {
		ToolName string                 `json:"tool_name" binding:"required"`
		Params   map[string]interface{} `json:"params"`
		UseMock  bool                   `json:"use_mock"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if req.Params == nil {
		req.Params = make(map[string]interface{})
	}

	result, err := h.service.ExecuteTool(c.Request.Context(), req.ToolName, req.Params, req.UseMock)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, result)
}

func (h *DebugHandler) GetToolSchemas(c *gin.Context) {
	schemas, err := h.service.GetToolSchemas()
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, schemas)
}

func (h *DebugHandler) CheckToolHealth(c *gin.Context) {
	result, err := h.service.CheckToolHealth(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, result)
}

func (h *DebugHandler) PreviewPrompt(c *gin.Context) {
	var req struct {
		Variables map[string]string `json:"variables"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if req.Variables == nil {
		req.Variables = make(map[string]string)
	}

	result, err := h.service.PreviewPrompt(c.Request.Context(), req.Variables)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, result)
}

func (h *DebugHandler) GetSessions(c *gin.Context) {
	sessions, err := h.service.GetDebugSessions(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, sessions)
}

func (h *DebugHandler) LoadSession(c *gin.Context) {
	var req struct {
		SessionID uint `json:"session_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	session, err := h.service.LoadDebugSession(c.Request.Context(), req.SessionID)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, session)
}

func (h *DebugHandler) GetMockConfigs(c *gin.Context) {
	configs, err := h.service.GetMockConfigs(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, configs)
}

func (h *DebugHandler) SaveMockConfig(c *gin.Context) {
	var req struct {
		ToolName string      `json:"tool_name" binding:"required"`
		MockData interface{} `json:"mock_data"`
		Scenario string      `json:"scenario"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if err := h.service.SetMockConfig(c.Request.Context(), req.ToolName, req.MockData, req.Scenario); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, nil)
}

func (h *DebugHandler) DeleteMockConfig(c *gin.Context) {
	toolName := c.Query("tool_name")
	if toolName == "" {
		var req struct {
			ToolName string `json:"tool_name"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.ToolName == "" {
			response.Error(c, errors.CodeParamError, "tool_name 不能为空")
			return
		}
		toolName = req.ToolName
	}

	if err := h.service.DeleteMockConfig(c.Request.Context(), toolName); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, nil)
}
