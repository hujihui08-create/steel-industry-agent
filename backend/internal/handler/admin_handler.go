package handler

import (
	"context"
	"strconv"
	"strings"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/jwt"
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
	DashboardTrend(ctx context.Context, days int) ([]service.TrendDataPoint, error)
	ListAdmins(ctx context.Context) ([]model.Admin, error)
	CreateAdmin(ctx context.Context, username, nickname, password, role string) (*model.Admin, error)
	UpdateAdmin(ctx context.Context, id uint, nickname, role string, status int) error
	DeleteAdmin(ctx context.Context, id uint) error
	UpdateProfile(ctx context.Context, adminID uint, nickname string) error
	ListMobileUsers(ctx context.Context, keyword string, page, pageSize int) ([]model.User, int64, error)
	GetMobileUserDetail(ctx context.Context, id uint) (*model.User, error)
	DisableMobileUser(ctx context.Context, id uint) error
	EnableMobileUser(ctx context.Context, id uint) error
	CreateMobileUser(ctx context.Context, phone, nickname, company, password string, roleID uint, region string) (*model.User, error)
	UpdateMobileUser(ctx context.Context, id uint, nickname, company string, roleID uint, region string, status int) (*model.User, error)
	DeleteMobileUser(ctx context.Context, id uint) error
}

// AdminHandler handles admin management HTTP requests.
type AdminHandler struct {
	adminService     adminService
	menuService      *service.MenuService
	loginLogRecorder loginLogRecorder
}

// NewAdminHandler creates a new AdminHandler with the given admin service, menu service, and login log recorder.
func NewAdminHandler(adminService *service.AdminService, menuService *service.MenuService, loginLogRecorder loginLogRecorder) *AdminHandler {
	return &AdminHandler{adminService: adminService, menuService: menuService, loginLogRecorder: loginLogRecorder}
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
		h.loginLogRecorder.RecordLoginFailure(c.Request.Context(), "admin", nil, nil,
			c.ClientIP(), c.GetHeader("User-Agent"), "参数错误")
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if req.Username == "" || req.Password == "" {
		h.loginLogRecorder.RecordLoginFailure(c.Request.Context(), "admin", nil, nil,
			c.ClientIP(), c.GetHeader("User-Agent"), "用户名和密码不能为空")
		response.Error(c, errors.CodeParamError, "用户名和密码不能为空")
		return
	}

	token, err := h.adminService.Login(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		errMsg := err.Error()
		h.loginLogRecorder.RecordLoginFailure(c.Request.Context(), "admin", nil, nil,
			c.ClientIP(), c.GetHeader("User-Agent"), errMsg)
		if strings.Contains(errMsg, "锁定") || strings.Contains(errMsg, "还剩") {
			response.Error(c, errors.CodeForbidden, errMsg)
			return
		}
		response.Error(c, errors.CodeAuthFailed, errMsg)
		return
	}

	// Parse the token to extract the admin ID for logging.
	var adminID *uint
	if claims, parseErr := jwt.ParseToken(token); parseErr == nil {
		uid := claims.UserID
		adminID = &uid
	}
	h.loginLogRecorder.RecordLoginSuccess(c.Request.Context(), "admin", adminID, nil,
		c.ClientIP(), c.GetHeader("User-Agent"))

	response.Success(c, gin.H{"token": token})
}

// Logout clears the admin's authentication state.
func (h *AdminHandler) Logout(c *gin.Context) {
	_ = h.adminService.Logout(c.Request.Context())
	response.Success(c, nil)
}

// GetInfo returns the authenticated admin's information and menu tree.
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

	var menus interface{}
	if h.menuService != nil {
		menuTree, err := h.menuService.GetMenuTreeForRole(c.Request.Context(), admin.Role)
		if err != nil {
			response.Error(c, errors.CodeInternalError, err.Error())
			return
		}
		menus = menuTree
	}

	response.Success(c, gin.H{
		"admin": admin,
		"menus": menus,
	})
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
		Status   int    `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if err := h.adminService.UpdateAdmin(c.Request.Context(), uint(id), req.Nickname, req.Role, req.Status); err != nil {
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

// ListMobileUsers returns a paginated list of mobile users.
func (h *AdminHandler) ListMobileUsers(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "10")
	keyword := c.Query("keyword")

	page, _ := strconv.Atoi(pageStr)
	pageSize, _ := strconv.Atoi(pageSizeStr)
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}

	users, total, err := h.adminService.ListMobileUsers(c.Request.Context(), keyword, page, pageSize)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, map[string]interface{}{
		"list":      users,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// GetMobileUserDetail returns a mobile user's detail.
func (h *AdminHandler) GetMobileUserDetail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	user, err := h.adminService.GetMobileUserDetail(c.Request.Context(), uint(id))
	if err != nil {
		response.Error(c, errors.CodeNotFound, "用户不存在")
		return
	}

	response.Success(c, user)
}

// DisableMobileUser disables a mobile user account.
func (h *AdminHandler) DisableMobileUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	if err := h.adminService.DisableMobileUser(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

// EnableMobileUser enables a mobile user account.
func (h *AdminHandler) EnableMobileUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	if err := h.adminService.EnableMobileUser(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

// ExportMobileUsers exports mobile users as CSV.
func (h *AdminHandler) ExportMobileUsers(c *gin.Context) {
	keyword := c.Query("keyword")
	users, _, err := h.adminService.ListMobileUsers(c.Request.Context(), keyword, 1, 10000)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=mobile_users.csv")
	c.String(200, "ID,手机号,昵称,公司,角色,地区,注册时间\n")
	for _, u := range users {
		c.String(200, "%d,%s,%s,%s,%s,%s,%s\n",
			u.ID, u.Phone, u.Nickname, u.Company, u.Role, u.Region, u.CreatedAt.Format("2006-01-02 15:04:05"))
	}
}

// CreateMobileUser creates a new mobile user from admin backend.
func (h *AdminHandler) CreateMobileUser(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone" binding:"required"`
		Nickname string `json:"nickname" binding:"required"`
		Company  string `json:"company"`
		Password string `json:"password" binding:"required"`
		RoleID   uint   `json:"role_id" binding:"required"`
		Region   string `json:"region"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	user, err := h.adminService.CreateMobileUser(c.Request.Context(), req.Phone, req.Nickname, req.Company, req.Password, req.RoleID, req.Region)
	if err != nil {
		response.Error(c, errors.CodeParamError, err.Error())
		return
	}

	response.Success(c, user)
}

// UpdateMobileUser updates an existing mobile user from admin backend.
func (h *AdminHandler) UpdateMobileUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	var req struct {
		Nickname string `json:"nickname" binding:"required"`
		Company  string `json:"company"`
		RoleID   uint   `json:"role_id"`
		Region   string `json:"region"`
		Status   int    `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	user, err := h.adminService.UpdateMobileUser(c.Request.Context(), uint(id), req.Nickname, req.Company, req.RoleID, req.Region, req.Status)
	if err != nil {
		response.Error(c, errors.CodeParamError, err.Error())
		return
	}

	response.Success(c, user)
}

// DeleteMobileUser deletes a mobile user from admin backend.
func (h *AdminHandler) DeleteMobileUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	if err := h.adminService.DeleteMobileUser(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeParamError, err.Error())
		return
	}

	response.Success(c, nil)
}

// DashboardTrend returns trend data for dashboard.
func (h *AdminHandler) DashboardTrend(c *gin.Context) {
	period := c.DefaultQuery("period", "7days")

	var days int
	switch period {
	case "today":
		days = 1
	case "7days":
		days = 7
	case "30days":
		days = 30
	default:
		days = 7
	}

	trend, err := h.adminService.DashboardTrend(c.Request.Context(), days)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, trend)
}
