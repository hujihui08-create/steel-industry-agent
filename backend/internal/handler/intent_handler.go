package handler

import (
	"context"
	"strconv"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type intentService interface {
	List(ctx context.Context) ([]model.Intent, error)
	Create(ctx context.Context, intent *model.Intent) error
	Update(ctx context.Context, intent *model.Intent) error
	Delete(ctx context.Context, id uint) error
	Stats(ctx context.Context) (map[string]interface{}, error)
}

type IntentHandler struct {
	intentService intentService
}

func NewIntentHandler(intentService *service.IntentService) *IntentHandler {
	return &IntentHandler{intentService: intentService}
}

func (h *IntentHandler) List(c *gin.Context) {
	intents, err := h.intentService.List(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, intents)
}

func (h *IntentHandler) Create(c *gin.Context) {
	var req struct {
		IntentCode    string   `json:"intent_code" binding:"required"`
		IntentName    string   `json:"intent_name" binding:"required"`
		ToolName      string   `json:"tool_name"`
		Keywords      []string `json:"keywords"`
		Entities      []string `json:"entities"`
		ReplyTemplate string   `json:"reply_template"`
		Priority      int      `json:"priority"`
		IsActive      bool     `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	intent := &model.Intent{
		IntentCode:    req.IntentCode,
		IntentName:    req.IntentName,
		ToolName:      req.ToolName,
		Keywords:      req.Keywords,
		Entities:      req.Entities,
		ReplyTemplate: req.ReplyTemplate,
		Priority:      req.Priority,
		IsActive:      req.IsActive,
	}

	if err := h.intentService.Create(c.Request.Context(), intent); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, intent)
}

func (h *IntentHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	var req struct {
		IntentCode    string   `json:"intent_code"`
		IntentName    string   `json:"intent_name"`
		ToolName      string   `json:"tool_name"`
		Keywords      []string `json:"keywords"`
		Entities      []string `json:"entities"`
		ReplyTemplate string   `json:"reply_template"`
		Priority      int      `json:"priority"`
		IsActive      *bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	intent := &model.Intent{
		ID:            uint(id),
		IntentCode:    req.IntentCode,
		IntentName:    req.IntentName,
		ToolName:      req.ToolName,
		Keywords:      req.Keywords,
		Entities:      req.Entities,
		ReplyTemplate: req.ReplyTemplate,
		Priority:      req.Priority,
	}
	if req.IsActive != nil {
		intent.IsActive = *req.IsActive
	}

	if err := h.intentService.Update(c.Request.Context(), intent); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

func (h *IntentHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	if err := h.intentService.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

func (h *IntentHandler) Stats(c *gin.Context) {
	stats, err := h.intentService.Stats(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, stats)
}
