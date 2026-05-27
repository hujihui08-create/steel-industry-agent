package handler

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type adminLogService interface {
	List(ctx context.Context, limit int) ([]model.AdminLog, error)
	GetByID(ctx context.Context, id uint) (*model.AdminLog, error)
}

type AdminLogHandler struct {
	adminLogService adminLogService
}

func NewAdminLogHandler(adminLogService *service.AdminLogService) *AdminLogHandler {
	return &AdminLogHandler{adminLogService: adminLogService}
}

func (h *AdminLogHandler) List(c *gin.Context) {
	limitStr := c.DefaultQuery("page_size", "50")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 50
	}

	logs, err := h.adminLogService.List(c.Request.Context(), limit)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, map[string]interface{}{
		"list":      logs,
		"total":     len(logs),
		"page":      1,
		"page_size": limit,
	})
}

func (h *AdminLogHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	log, err := h.adminLogService.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	if log == nil {
		response.Error(c, errors.CodeNotFound, "日志不存在")
		return
	}

	response.Success(c, log)
}

// csvEscape wraps a field in double quotes if it contains comma, double-quote, or newline,
// and doubles any embedded double-quotes.
func csvEscape(s string) string {
	if strings.ContainsAny(s, ",\"\n") {
		return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
	}
	return s
}

func (h *AdminLogHandler) Export(c *gin.Context) {
	logs, err := h.adminLogService.List(c.Request.Context(), 10000)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=operation_logs.csv")

	// BOM for Excel UTF-8 compatibility
	c.Writer.Write([]byte{0xEF, 0xBB, 0xBF})

	fmt.Fprintf(c.Writer, "ID,管理员ID,操作类型,目标类型,目标ID,IP地址,操作时间\n")
	for _, l := range logs {
		fmt.Fprintf(c.Writer, "%d,%d,%s,%s,%d,%s,%s\n",
			l.ID,
			l.AdminID,
			csvEscape(l.Action),
			csvEscape(l.TargetType),
			l.TargetID,
			csvEscape(l.IPAddress),
			l.CreatedAt.Format("2006-01-02 15:04:05"),
		)
	}
	c.Status(200)
}
