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

type categoryService interface {
	ListCategories(ctx context.Context, typeFilter, statusFilter string) ([]model.Category, error)
	CreateCategory(ctx context.Context, req service.CreateCategoryRequest) (*model.Category, error)
	UpdateCategory(ctx context.Context, id uint, req service.UpdateCategoryRequest) (*model.Category, error)
	DeleteCategory(ctx context.Context, id uint) error
	ToggleCategory(ctx context.Context, id uint) (*model.Category, error)
	GetEnabledCategories(ctx context.Context) (*service.PublicCategoriesResponse, error)
}

type CategoryHandler struct {
	categoryService categoryService
}

func NewCategoryHandler(svc *service.CategoryService) *CategoryHandler {
	return &CategoryHandler{categoryService: svc}
}

func (h *CategoryHandler) ListCategories(c *gin.Context) {
	typeFilter := c.Query("type")
	statusFilter := c.Query("status")

	categories, err := h.categoryService.ListCategories(c.Request.Context(), typeFilter, statusFilter)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, categories)
}

func (h *CategoryHandler) CreateCategory(c *gin.Context) {
	var req service.CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	category, err := h.categoryService.CreateCategory(c.Request.Context(), req)
	if err != nil {
		response.Error(c, errors.CodeConflict, err.Error())
		return
	}
	response.Success(c, category)
}

func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	var req service.UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	category, err := h.categoryService.UpdateCategory(c.Request.Context(), uint(id), req)
	if err != nil {
		response.Error(c, errors.CodeNotFound, err.Error())
		return
	}
	response.Success(c, category)
}

func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if err := h.categoryService.DeleteCategory(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, nil)
}

func (h *CategoryHandler) ToggleCategory(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	category, err := h.categoryService.ToggleCategory(c.Request.Context(), uint(id))
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, category)
}

func (h *CategoryHandler) GetPublicCategories(c *gin.Context) {
	categories, err := h.categoryService.GetEnabledCategories(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, categories)
}
