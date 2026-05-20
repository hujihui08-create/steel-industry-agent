package handler

import (
	"context"

	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

// agentConfigService is the private interface that AgentConfigHandler depends on.
type agentConfigService interface {
	GetAgentConfig(ctx context.Context) (*service.AgentConfigDO, error)
	SaveAgentConfig(ctx context.Context, config *service.AgentConfigDO) error
	GetPromptVersions(ctx context.Context) ([]service.PromptVersionDO, error)
	SavePromptVersions(ctx context.Context, versions []service.PromptVersionDO) error
	TestConnection(ctx context.Context, req *service.TestConnectionRequest) (*service.TestConnectionResponse, error)
}

// AgentConfigHandler handles HTTP requests for agent configuration management.
type AgentConfigHandler struct {
	agentConfigService agentConfigService
}

// NewAgentConfigHandler creates a new AgentConfigHandler with the given service.
func NewAgentConfigHandler(svc *service.AgentConfigService) *AgentConfigHandler {
	return &AgentConfigHandler{agentConfigService: svc}
}

// GetConfig returns the current agent configuration.
func (h *AgentConfigHandler) GetConfig(c *gin.Context) {
	config, err := h.agentConfigService.GetAgentConfig(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, config)
}

// SaveConfig updates the agent configuration.
func (h *AgentConfigHandler) SaveConfig(c *gin.Context) {
	var req service.AgentConfigDO
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if err := h.agentConfigService.SaveAgentConfig(c.Request.Context(), &req); err != nil {
		response.Error(c, errors.CodeInternalError, "保存失败")
		return
	}
	response.Success(c, nil)
}

// GetPromptVersions returns the system prompt version history.
func (h *AgentConfigHandler) GetPromptVersions(c *gin.Context) {
	versions, err := h.agentConfigService.GetPromptVersions(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, versions)
}

// SavePromptVersions updates the system prompt version history.
func (h *AgentConfigHandler) SavePromptVersions(c *gin.Context) {
	var req []service.PromptVersionDO
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if err := h.agentConfigService.SavePromptVersions(c.Request.Context(), req); err != nil {
		response.Error(c, errors.CodeInternalError, "保存失败")
		return
	}
	response.Success(c, nil)
}

// TestConnection tests connectivity to a model provider.
func (h *AgentConfigHandler) TestConnection(c *gin.Context) {
	var req service.TestConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	result, err := h.agentConfigService.TestConnection(c.Request.Context(), &req)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, result)
}
