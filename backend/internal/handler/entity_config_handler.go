package handler

import (
	"strconv"

	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type EntityConfigHandler struct {
	service *service.EntityConfigService
}

func NewEntityConfigHandler(svc *service.EntityConfigService) *EntityConfigHandler {
	return &EntityConfigHandler{service: svc}
}

func (h *EntityConfigHandler) List(c *gin.Context) {
	entityType := c.DefaultQuery("entity_type", "region")
	configs, err := h.service.List(c.Request.Context(), entityType)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, configs)
}

func (h *EntityConfigHandler) Create(c *gin.Context) {
	var req struct {
		EntityType  string `json:"entity_type" binding:"required"`
		EntityValue string `json:"entity_value" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}
	config, err := h.service.Create(c.Request.Context(), req.EntityType, req.EntityValue)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, config)
}

func (h *EntityConfigHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}
	if err := h.service.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, nil)
}
