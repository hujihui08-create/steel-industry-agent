package handler

import (
	"strconv"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

// MenuHandler handles menu management HTTP requests.
type MenuHandler struct {
	menuService *service.MenuService
}

// NewMenuHandler creates a new MenuHandler with the given menu service.
func NewMenuHandler(menuService *service.MenuService) *MenuHandler {
	return &MenuHandler{menuService: menuService}
}

// GetMenuTree returns the full menu tree with parent-child hierarchy.
func (h *MenuHandler) GetMenuTree(c *gin.Context) {
	tree, err := h.menuService.GetMenuTree(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, tree)
}

// Create creates a new menu item.
func (h *MenuHandler) Create(c *gin.Context) {
	var req struct {
		ParentID     *uint  `json:"parent_id"`
		Name         string `json:"name" binding:"required"`
		Icon         string `json:"icon"`
		Path         string `json:"path" binding:"required"`
		SortOrder    int    `json:"sort_order"`
		VisibleRoles string `json:"visible_roles"`
		Status       int    `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：name和path不能为空")
		return
	}

	if req.VisibleRoles == "" {
		req.VisibleRoles = "super_admin,operator,data_admin,viewer"
	}
	if req.Status == 0 {
		req.Status = 1
	}

	menu := &model.Menu{
		ParentID:     req.ParentID,
		Name:         req.Name,
		Icon:         req.Icon,
		Path:         req.Path,
		SortOrder:    req.SortOrder,
		VisibleRoles: req.VisibleRoles,
		Status:       req.Status,
	}

	if err := h.menuService.CreateMenu(c.Request.Context(), menu); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, menu)
}

// Update updates an existing menu item by ID.
func (h *MenuHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	var req struct {
		ParentID     *uint  `json:"parent_id"`
		Name         string `json:"name" binding:"required"`
		Icon         string `json:"icon"`
		Path         string `json:"path" binding:"required"`
		SortOrder    int    `json:"sort_order"`
		VisibleRoles string `json:"visible_roles"`
		Status       int    `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：name和path不能为空")
		return
	}

	menu := &model.Menu{
		ID:           uint(id),
		ParentID:     req.ParentID,
		Name:         req.Name,
		Icon:         req.Icon,
		Path:         req.Path,
		SortOrder:    req.SortOrder,
		VisibleRoles: req.VisibleRoles,
		Status:       req.Status,
	}

	if err := h.menuService.UpdateMenu(c.Request.Context(), menu); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, menu)
}

// Delete deletes a menu and all its children by ID.
func (h *MenuHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	deletedCount, err := h.menuService.DeleteMenu(c.Request.Context(), uint(id))
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, gin.H{"deleted_count": deletedCount})
}
