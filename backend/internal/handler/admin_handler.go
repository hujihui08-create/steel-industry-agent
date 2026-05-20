package handler

import (
	"context"
	"strconv"
	"strings"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"
	"steel-agent-backend/pkg/validate"

	"github.com/gin-gonic/gin"
)

type adminService interface {
	Login(ctx context.Context, username, password string) (string, error)
	Logout(ctx context.Context) error
	GetInfo(ctx context.Context, adminID uint) (*model.Admin, error)
	UpdatePassword(ctx context.Context, adminID uint, oldPassword, newPassword string) error
	Dashboard(ctx context.Context) (map[string]int64, error)
	ListAdmins(ctx context.Context) ([]model.Admin, error)
	CreateAdmin(ctx context.Context, username, nickname, password, role string) (*model.Admin, error)
	UpdateAdmin(ctx context.Context, id uint, nickname, role string) error
	DeleteAdmin(ctx context.Context, id uint) error
	UpdateProfile(ctx context.Context, adminID uint, nickname string) error
}

// AdminHandler handles admin management HTTP requests.
type AdminHandler struct {
	adminService adminService
}

// NewAdminHandler creates a new AdminHandler with the given admin service.
func NewAdminHandler(adminService *service.AdminService) *AdminHandler {
	return &AdminHandler{adminService: adminService}
}

// Dashboard returns aggregated admin dashboard statistics.
func (h *AdminHandler) Dashboard(c *gin.Context) {
	stats, err := h.adminService.Dashboard(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, stats)
}

// Login authenticates an admin by username and password, returning a JWT token.
func (h *AdminHandler) Login(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if req.Username == "" || req.Password == "" {
		response.Error(c, errors.CodeParamError, "用户名和密码不能为空")
		return
	}

	token, err := h.adminService.Login(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "锁定") || strings.Contains(errMsg, "还剩") {
			response.Error(c, errors.CodeForbidden, errMsg)
			return
		}
		response.Error(c, errors.CodeAuthFailed, errMsg)
		return
	}

	response.Success(c, gin.H{"token": token})
}

// Logout clears the admin's authentication state.
func (h *AdminHandler) Logout(c *gin.Context) {
	_ = h.adminService.Logout(c.Request.Context())
	response.Success(c, nil)
}

// GetInfo returns the authenticated admin's information.
func (h *AdminHandler) GetInfo(c *gin.Context) {
	adminID, exists := c.Get("user_id")
	if !exists {
		response.Error(c, errors.CodeAuthFailed, "未登录或令牌已过期")
		return
	}

	id, ok := adminID.(uint)
	if !ok {
		response.Error(c, errors.CodeAuthFailed, "令牌格式错误")
		return
	}

	admin, err := h.adminService.GetInfo(c.Request.Context(), id)
	if err != nil {
		response.Error(c, errors.CodeNotFound, err.Error())
		return
	}

	response.Success(c, admin)
}

// UpdatePassword changes the authenticated admin's password.
func (h *AdminHandler) UpdatePassword(c *gin.Context) {
	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if !validate.ValidatePassword(req.NewPassword) {
		response.Error(c, errors.CodeParamError, "新密码格式不正确（6-32位）")
		return
	}

	adminID, exists := c.Get("user_id")
	if !exists {
		response.Error(c, errors.CodeAuthFailed, "未登录或令牌已过期")
		return
	}

	id, ok := adminID.(uint)
	if !ok {
		response.Error(c, errors.CodeAuthFailed, "令牌格式错误")
		return
	}

	if err := h.adminService.UpdatePassword(c.Request.Context(), id, req.OldPassword, req.NewPassword); err != nil {
		response.Error(c, errors.CodeAuthFailed, err.Error())
		return
	}

	response.Success(c, nil)
}

// ListAdmins returns all admin accounts in the system.
func (h *AdminHandler) ListAdmins(c *gin.Context) {
	admins, err := h.adminService.ListAdmins(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, admins)
}

// CreateAdmin creates a new admin account with the given username, nickname, password, and role.
func (h *AdminHandler) CreateAdmin(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Nickname string `json:"nickname" binding:"required"`
		Password string `json:"password" binding:"required"`
		Role     string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	admin, err := h.adminService.CreateAdmin(c.Request.Context(), req.Username, req.Nickname, req.Password, req.Role)
	if err != nil {
		response.Error(c, errors.CodeParamError, err.Error())
		return
	}

	response.Success(c, admin)
}

// UpdateAdmin updates an existing admin's nickname and role by ID.
func (h *AdminHandler) UpdateAdmin(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	var req struct {
		Nickname string `json:"nickname" binding:"required"`
		Role     string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if err := h.adminService.UpdateAdmin(c.Request.Context(), uint(id), req.Nickname, req.Role); err != nil {
		response.Error(c, errors.CodeParamError, err.Error())
		return
	}

	response.Success(c, nil)
}

// DeleteAdmin removes an admin account by ID.
func (h *AdminHandler) DeleteAdmin(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	if err := h.adminService.DeleteAdmin(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeForbidden, err.Error())
		return
	}

	response.Success(c, nil)
}

// UpdateProfile updates the authenticated admin's profile information.
func (h *AdminHandler) UpdateProfile(c *gin.Context) {
	adminIDVal, exists := c.Get("user_id")
	if !exists {
		response.Error(c, errors.CodeAuthFailed, "未登录或令牌已过期")
		return
	}

	adminID, ok := adminIDVal.(uint)
	if !ok {
		response.Error(c, errors.CodeAuthFailed, "令牌格式错误")
		return
	}

	var req struct {
		Nickname string `json:"nickname" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if err := h.adminService.UpdateProfile(c.Request.Context(), adminID, req.Nickname); err != nil {
		response.Error(c, errors.CodeParamError, err.Error())
		return
	}

	response.Success(c, nil)
}
