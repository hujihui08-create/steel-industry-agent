package handler

import (
	"context"
	"strconv"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

// mobileRoleService defines the service contract for mobile role operations.
type mobileRoleService interface {
	ListRoles(ctx context.Context, roleType string) ([]model.MobileRole, error)
	CreateRole(ctx context.Context, name, description, roleType string, status int) (*model.MobileRole, error)
	UpdateRole(ctx context.Context, id uint, name, description string, status int) (*model.MobileRole, error)
	DeleteRole(ctx context.Context, id uint) error
	GetPermissions(ctx context.Context) ([]model.MobileRole, error)
	SavePermissions(ctx context.Context, roleID uint, permissions model.PermissionMap) error
	GetRetentionStats(ctx context.Context) (map[string]interface{}, error)
}

// MobileRoleHandler handles HTTP requests for mobile role management.
type MobileRoleHandler struct {
	roleService mobileRoleService
}

// NewMobileRoleHandler creates a new MobileRoleHandler with the given mobile role service.
func NewMobileRoleHandler(roleService mobileRoleService) *MobileRoleHandler {
	return &MobileRoleHandler{roleService: roleService}
}

// ListRoles returns all mobile roles.
// Accepts optional query parameter: role_type (e.g. "admin", "mobile").
func (h *MobileRoleHandler) ListRoles(c *gin.Context) {
	roleType := c.Query("role_type")
	roles, err := h.roleService.ListRoles(c.Request.Context(), roleType)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, roles)
}

type createRoleReq struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	RoleType    string `json:"role_type"`
	Status      int    `json:"status"`
}

// CreateRole creates a new mobile role.
func (h *MobileRoleHandler) CreateRole(c *gin.Context) {
	var req createRoleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}
	if req.Name == "" {
		response.Error(c, errors.CodeParamError, "角色名称不能为空")
		return
	}
	if req.Status == 0 {
		req.Status = 1
	}
	role, err := h.roleService.CreateRole(c.Request.Context(), req.Name, req.Description, req.RoleType, req.Status)
	if err != nil {
		response.Error(c, errors.CodeParamError, err.Error())
		return
	}
	response.Success(c, role)
}

type updateRoleReq struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      int    `json:"status"`
}

// UpdateRole updates an existing mobile role by ID.
func (h *MobileRoleHandler) UpdateRole(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "无效的角色ID")
		return
	}
	var req updateRoleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}
	role, err := h.roleService.UpdateRole(c.Request.Context(), uint(id), req.Name, req.Description, req.Status)
	if err != nil {
		response.Error(c, errors.CodeParamError, err.Error())
		return
	}
	response.Success(c, role)
}

// DeleteRole removes a mobile role by ID.
func (h *MobileRoleHandler) DeleteRole(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "无效的角色ID")
		return
	}
	if err := h.roleService.DeleteRole(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeParamError, err.Error())
		return
	}
	response.Success(c, nil)
}

// GetPermissions returns the permissions of all roles.
func (h *MobileRoleHandler) GetPermissions(c *gin.Context) {
	permissions, err := h.roleService.GetPermissions(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, permissions)
}

type savePermissionsReq struct {
	RoleID      uint               `json:"role_id"`
	Permissions model.PermissionMap `json:"permissions"`
}

// SavePermissions updates the permissions for a specific role.
func (h *MobileRoleHandler) SavePermissions(c *gin.Context) {
	var req savePermissionsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}
	if err := h.roleService.SavePermissions(c.Request.Context(), req.RoleID, req.Permissions); err != nil {
		response.Error(c, errors.CodeParamError, err.Error())
		return
	}
	response.Success(c, nil)
}

// GetRetentionStats returns user retention statistics.
func (h *MobileRoleHandler) GetRetentionStats(c *gin.Context) {
	stats, err := h.roleService.GetRetentionStats(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, stats)
}