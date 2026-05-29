package handler

import (
	"context"

	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/jwt"
	"steel-agent-backend/pkg/response"
	"steel-agent-backend/pkg/validate"

	"github.com/gin-gonic/gin"
)

type authService interface {
	SendSMSCode(ctx context.Context, phone string) error
	Login(ctx context.Context, phone, code string) (string, string, error)
	LoginPassword(ctx context.Context, phone, password string) (string, string, error)
	Register(ctx context.Context, phone, password, code, nickname string) (string, string, error)
	RefreshToken(ctx context.Context, oldToken string) (string, string, error)
	Logout(ctx context.Context, tokenString string) error
}

// AuthHandler handles authentication-related HTTP requests.
type AuthHandler struct {
	authService      authService
	loginLogRecorder loginLogRecorder
}

// NewAuthHandler creates a new AuthHandler with the given auth service and login log recorder.
func NewAuthHandler(authService *service.AuthService, loginLogRecorder loginLogRecorder) *AuthHandler {
	return &AuthHandler{authService: authService, loginLogRecorder: loginLogRecorder}
}

// GetSMSCode sends an SMS verification code to the given phone number.
func (h *AuthHandler) GetSMSCode(c *gin.Context) {
	var req struct {
		Phone string `json:"phone" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if !validate.ValidatePhone(req.Phone) {
		response.Error(c, errors.CodeParamError, "手机号格式不正确")
		return
	}

	if err := h.authService.SendSMSCode(c.Request.Context(), req.Phone); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req struct {
		Phone string `json:"phone" binding:"required"`
		Code  string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.loginLogRecorder.RecordLoginFailure(c.Request.Context(), "mobile", nil, nil,
			c.ClientIP(), c.GetHeader("User-Agent"), "参数错误")
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if !validate.ValidatePhone(req.Phone) {
		h.loginLogRecorder.RecordLoginFailure(c.Request.Context(), "mobile", nil, nil,
			c.ClientIP(), c.GetHeader("User-Agent"), "手机号格式不正确")
		response.Error(c, errors.CodeParamError, "手机号格式不正确")
		return
	}

	if !validate.ValidateSMSCode(req.Code) {
		h.loginLogRecorder.RecordLoginFailure(c.Request.Context(), "mobile", nil, nil,
			c.ClientIP(), c.GetHeader("User-Agent"), "验证码格式不正确")
		response.Error(c, errors.CodeParamError, "验证码格式不正确")
		return
	}

	accessToken, refreshToken, err := h.authService.Login(c.Request.Context(), req.Phone, req.Code)
	if err != nil {
		h.loginLogRecorder.RecordLoginFailure(c.Request.Context(), "mobile", nil, nil,
			c.ClientIP(), c.GetHeader("User-Agent"), err.Error())
		response.Error(c, errors.CodeBusinessError, err.Error())
		return
	}

	// Parse the access token to extract the user ID for logging.
	var userID *uint
	if claims, parseErr := jwt.ParseToken(accessToken); parseErr == nil {
		uid := claims.UserID
		userID = &uid
	}
	h.loginLogRecorder.RecordLoginSuccess(c.Request.Context(), "mobile", nil, userID,
		c.ClientIP(), c.GetHeader("User-Agent"))

	response.Success(c, gin.H{"access_token": accessToken, "refresh_token": refreshToken, "expires_in": 7200})
}

// LoginPassword authenticates a user by phone number and password, returning a JWT token.
func (h *AuthHandler) LoginPassword(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.loginLogRecorder.RecordLoginFailure(c.Request.Context(), "mobile", nil, nil,
			c.ClientIP(), c.GetHeader("User-Agent"), "参数错误")
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if !validate.ValidatePhone(req.Phone) {
		h.loginLogRecorder.RecordLoginFailure(c.Request.Context(), "mobile", nil, nil,
			c.ClientIP(), c.GetHeader("User-Agent"), "手机号格式不正确")
		response.Error(c, errors.CodeParamError, "手机号格式不正确")
		return
	}

	if !validate.ValidatePassword(req.Password) {
		h.loginLogRecorder.RecordLoginFailure(c.Request.Context(), "mobile", nil, nil,
			c.ClientIP(), c.GetHeader("User-Agent"), "密码格式不正确")
		response.Error(c, errors.CodeParamError, "密码格式不正确")
		return
	}

	accessToken, refreshToken, err := h.authService.LoginPassword(c.Request.Context(), req.Phone, req.Password)
	if err != nil {
		h.loginLogRecorder.RecordLoginFailure(c.Request.Context(), "mobile", nil, nil,
			c.ClientIP(), c.GetHeader("User-Agent"), err.Error())
		response.Error(c, errors.CodeBusinessError, err.Error())
		return
	}

	// Parse the access token to extract the user ID for logging.
	var userID *uint
	if claims, parseErr := jwt.ParseToken(accessToken); parseErr == nil {
		uid := claims.UserID
		userID = &uid
	}
	h.loginLogRecorder.RecordLoginSuccess(c.Request.Context(), "mobile", nil, userID,
		c.ClientIP(), c.GetHeader("User-Agent"))

	response.Success(c, gin.H{"access_token": accessToken, "refresh_token": refreshToken, "expires_in": 7200})
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req struct {
		Phone    string `json:"phone" binding:"required"`
		Password string `json:"password" binding:"required"`
		Code     string `json:"code" binding:"required"`
		Nickname string `json:"nickname"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if !validate.ValidatePhone(req.Phone) {
		response.Error(c, errors.CodeParamError, "手机号格式不正确")
		return
	}

	if !validate.ValidatePassword(req.Password) {
		response.Error(c, errors.CodeParamError, "密码格式不正确")
		return
	}

	if !validate.ValidateSMSCode(req.Code) {
		response.Error(c, errors.CodeParamError, "验证码格式不正确")
		return
	}

	accessToken, refreshToken, err := h.authService.Register(c.Request.Context(), req.Phone, req.Password, req.Code, req.Nickname)
	if err != nil {
		response.Error(c, errors.CodeBusinessError, err.Error())
		return
	}

	response.Success(c, gin.H{"access_token": accessToken, "refresh_token": refreshToken, "expires_in": 7200})
}

// RefreshToken issues a new access token using a valid refresh token.
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	accessToken, refreshToken, err := h.authService.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		response.Error(c, errors.CodeBusinessError, err.Error())
		return
	}

	response.Success(c, gin.H{"access_token": accessToken, "refresh_token": refreshToken, "expires_in": 7200})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if err := h.authService.Logout(c.Request.Context(), req.RefreshToken); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}
