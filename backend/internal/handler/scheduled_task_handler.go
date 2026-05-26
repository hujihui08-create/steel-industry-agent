package handler

import (
	"fmt"
	"strconv"

	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

// ScheduledTaskHandler handles HTTP requests for scheduled task management.
type ScheduledTaskHandler struct {
	scheduledTaskService *service.ScheduledTaskService
}

// NewScheduledTaskHandler creates a new ScheduledTaskHandler.
func NewScheduledTaskHandler(scheduledTaskService *service.ScheduledTaskService) *ScheduledTaskHandler {
	return &ScheduledTaskHandler{scheduledTaskService: scheduledTaskService}
}

// List returns all scheduled tasks.
func (h *ScheduledTaskHandler) List(c *gin.Context) {
	tasks, err := h.scheduledTaskService.ListTasks()
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, tasks)
}

// Trigger manually triggers execution of a scheduled task.
func (h *ScheduledTaskHandler) Trigger(c *gin.Context) {
	var req struct {
		TaskName string `json:"task_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.TaskName == "" {
		response.BadRequest(c, "请提供 task_name 参数")
		return
	}

	if err := h.scheduledTaskService.TriggerTask(req.TaskName); err != nil {
		response.BusinessError(c, err.Error())
		return
	}

	response.Success(c, map[string]string{
		"message": fmt.Sprintf("任务 %s 已触发执行", req.TaskName),
	})
}

// Logs returns execution logs for a specific task.
func (h *ScheduledTaskHandler) Logs(c *gin.Context) {
	taskIDStr := c.Query("task_id")
	if taskIDStr == "" {
		response.BadRequest(c, "请提供 task_id 参数")
		return
	}

	taskID, err := strconv.ParseUint(taskIDStr, 10, 64)
	if err != nil {
		response.BadRequest(c, "task_id 格式错误")
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 50
	}

	logs, err := h.scheduledTaskService.GetTaskLogs(uint(taskID), limit)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, logs)
}

// Toggle switches a task's status between "running" and "paused".
func (h *ScheduledTaskHandler) Toggle(c *gin.Context) {
	var req struct {
		TaskName string `json:"task_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.TaskName == "" {
		response.BadRequest(c, "请提供 task_name 参数")
		return
	}

	newStatus, err := h.scheduledTaskService.ToggleTask(req.TaskName)
	if err != nil {
		response.BusinessError(c, err.Error())
		return
	}

	response.Success(c, map[string]string{
		"task_name":  req.TaskName,
		"new_status": newStatus,
	})
}
