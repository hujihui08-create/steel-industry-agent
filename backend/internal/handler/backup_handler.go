package handler

import (
	"fmt"
	"io"
	"os"
	"strconv"

	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type BackupHandler struct {
	backupService *service.BackupService
}

func NewBackupHandler(backupService *service.BackupService) *BackupHandler {
	return &BackupHandler{backupService: backupService}
}

func (h *BackupHandler) Overview(c *gin.Context) {
	overview, err := h.backupService.Overview()
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, overview)
}

func (h *BackupHandler) Records(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "10")

	page, _ := strconv.Atoi(pageStr)
	pageSize, _ := strconv.Atoi(pageSizeStr)
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}

	records, err := h.backupService.Records(page, pageSize)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, records)
}

func (h *BackupHandler) Trigger(c *gin.Context) {
	filename, err := h.backupService.TriggerBackup()
	if err != nil {
		response.Error(c, errors.CodeInternalError, fmt.Sprintf("备份失败: %v", err))
		return
	}
	response.Success(c, map[string]string{"filename": filename})
}

func (h *BackupHandler) Restore(c *gin.Context) {
	backupID := c.Param("backupId")
	filePath := h.backupService.GetFilePath(backupID)

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		response.Error(c, errors.CodeNotFound, "备份文件不存在")
		return
	}

	response.Success(c, map[string]string{"message": "恢复功能需手动执行 pg_restore，备份文件路径: " + filePath})
}

func (h *BackupHandler) Download(c *gin.Context) {
	backupID := c.Param("backupId")
	filePath := h.backupService.GetFilePath(backupID)

	file, err := os.Open(filePath)
	if err != nil {
		response.Error(c, errors.CodeNotFound, "备份文件不存在")
		return
	}
	defer file.Close()

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", backupID))
	c.Header("Content-Type", "application/octet-stream")
	io.Copy(c.Writer, file)
}

func (h *BackupHandler) GetSettings(c *gin.Context) {
	response.Success(c, map[string]interface{}{
		"backup_time":    "03:00",
		"retention_days": 30,
		"storage_path":   "./backups",
	})
}

func (h *BackupHandler) UpdateSettings(c *gin.Context) {
	response.Success(c, nil)
}
