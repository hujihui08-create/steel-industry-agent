package handler

import (
	"context"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"
	"steel-agent-backend/pkg/validate"

	"github.com/gin-gonic/gin"
)

type userService interface {
	GetProfile(ctx context.Context, userID uint) (*model.User, error)
	UpdateProfile(ctx context.Context, userID uint, nickname, company, region string) (*model.User, error)
	UpdatePassword(ctx context.Context, userID uint, oldPassword, newPassword string) error
}

// UserHandler handles user profile-related HTTP requests.
type UserHandler struct {
	userService userService
}

// NewUserHandler creates a new UserHandler with the given user service.
func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

// GetProfile returns the authenticated user's profile information.
func (h *UserHandler) GetProfile(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	user, err := h.userService.GetProfile(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, gin.H{
		"id":       user.ID,
		"phone":    user.Phone,
		"nickname": user.Nickname,
		"company":  user.Company,
		"role":     user.Role,
		"region":   user.Region,
	})
}

// UpdateProfile updates the authenticated user's profile fields.
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	var req struct {
		Nickname string `json:"nickname"`
		Company  string `json:"company"`
		Region   string `json:"region"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	user, err := h.userService.UpdateProfile(c.Request.Context(), userID, req.Nickname, req.Company, req.Region)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, gin.H{
		"id":       user.ID,
		"phone":    user.Phone,
		"nickname": user.Nickname,
		"company":  user.Company,
		"role":     user.Role,
		"region":   user.Region,
	})
}

// UpdatePassword changes the authenticated user's password.
func (h *UserHandler) UpdatePassword(c *gin.Context) {
	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if !validate.ValidatePassword(req.NewPassword) {
		response.Error(c, errors.CodeParamError, "密码格式不正确")
		return
	}

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	if err := h.userService.UpdatePassword(c.Request.Context(), userID, req.OldPassword, req.NewPassword); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}
