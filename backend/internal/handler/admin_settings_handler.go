package handler

import (
	"context"
	"mime/multipart"

	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

// adminSettingsService is the private interface that AdminSettingsHandler depends on.
type adminSettingsService interface {
	GetSettings(ctx context.Context) (map[string]interface{}, error)
	SaveSettings(ctx context.Context, data map[string]interface{}) error
	GetPublicConfig(ctx context.Context) (map[string]interface{}, error)
	UploadLogo(ctx context.Context, file *multipart.FileHeader) (string, error)
	TestEmail(ctx context.Context, smtpConfig map[string]interface{}) (bool, string, error)
}

// AdminSettingsHandler handles HTTP requests for admin system settings.
type AdminSettingsHandler struct {
	adminSettingsService adminSettingsService
}

// NewAdminSettingsHandler creates a new AdminSettingsHandler with the given service.
func NewAdminSettingsHandler(svc *service.AdminSettingsService) *AdminSettingsHandler {
	return &AdminSettingsHandler{adminSettingsService: svc}
}

// GetSettings returns the current admin settings.
func (h *AdminSettingsHandler) GetSettings(c *gin.Context) {
	settings, err := h.adminSettingsService.GetSettings(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, settings)
}

// UpdateSettings updates the admin settings with the provided JSON body.
func (h *AdminSettingsHandler) UpdateSettings(c *gin.Context) {
	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if err := h.adminSettingsService.SaveSettings(c.Request.Context(), data); err != nil {
		response.Error(c, errors.CodeInternalError, "保存失败")
		return
	}
	response.Success(c, nil)
}

// GetPublicConfig returns the public-facing site configuration without authentication.
func (h *AdminSettingsHandler) GetPublicConfig(c *gin.Context) {
	config, err := h.adminSettingsService.GetPublicConfig(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, config)
}

// UploadLogo handles logo file uploads.
func (h *AdminSettingsHandler) UploadLogo(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		response.Error(c, errors.CodeParamError, "请选择要上传的文件")
		return
	}

	url, err := h.adminSettingsService.UploadLogo(c.Request.Context(), file)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, map[string]string{"url": url})
}

// TestEmail sends a test email using the SMTP configuration provided in the request body.
func (h *AdminSettingsHandler) TestEmail(c *gin.Context) {
	var smtpConfig map[string]interface{}
	if err := c.ShouldBindJSON(&smtpConfig); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	success, msg, _ := h.adminSettingsService.TestEmail(c.Request.Context(), smtpConfig)
	response.Success(c, map[string]interface{}{
		"success": success,
		"message": msg,
	})
}
