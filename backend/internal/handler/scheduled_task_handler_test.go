package handler

import (
	"encoding/json"
	stderrors "errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

type mockScheduledTaskService struct {
	listTasksFn   func() (interface{}, error)
	triggerTaskFn func(taskName string) error
}

func (m *mockScheduledTaskService) ListTasks() (interface{}, error) {
	if m.listTasksFn != nil {
		return m.listTasksFn()
	}
	return nil, nil
}

func (m *mockScheduledTaskService) TriggerTask(taskName string) error {
	if m.triggerTaskFn != nil {
		return m.triggerTaskFn(taskName)
	}
	return nil
}

func (m *mockScheduledTaskService) GetTaskLogs(taskID uint, limit int) (interface{}, error) {
	return nil, nil
}

func (m *mockScheduledTaskService) ToggleTask(taskName string) (string, error) {
	return "running", nil
}

func setupScheduledTaskRouter(mock *mockScheduledTaskService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/admin/scheduled-tasks", func(c *gin.Context) {
		tasks, err := mock.ListTasks()
		if err != nil {
			errorResp(c, 50001, err.Error())
			return
		}
		successResp(c, tasks)
	})
	router.POST("/admin/scheduled-tasks/trigger", func(c *gin.Context) {
		var req struct {
			TaskName string `json:"task_name"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.TaskName == "" {
			c.JSON(200, map[string]interface{}{"code": 40001, "message": "请提供 task_name 参数", "data": nil})
			return
		}
		if err := mock.TriggerTask(req.TaskName); err != nil {
			c.JSON(200, map[string]interface{}{"code": 40002, "message": err.Error(), "data": nil})
			return
		}
		successResp(c, map[string]string{"message": "任务 " + req.TaskName + " 已触发执行"})
	})
	return router
}

func TestScheduledTaskList_Success(t *testing.T) {
	mock := &mockScheduledTaskService{
		listTasksFn: func() (interface{}, error) {
			return []map[string]interface{}{
				{"task_name": "price_crawl", "cron_expr": "0 9,14 * * *", "status": "running"},
				{"task_name": "backup", "cron_expr": "0 3 * * *", "status": "paused"},
			}, nil
		},
	}
	router := setupScheduledTaskRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/scheduled-tasks", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int           `json:"code"`
		Message string        `json:"message"`
		Data    []interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 tasks, got %d", len(resp.Data))
	}
}

func TestScheduledTaskList_Error(t *testing.T) {
	mock := &mockScheduledTaskService{
		listTasksFn: func() (interface{}, error) {
			return nil, stderrors.New("failed to load tasks")
		},
	}
	router := setupScheduledTaskRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/scheduled-tasks", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeInternalError {
		t.Errorf("expected code %d, got %d", errors.CodeInternalError, resp.Code)
	}
}

func TestScheduledTaskTrigger_Success(t *testing.T) {
	mock := &mockScheduledTaskService{
		triggerTaskFn: func(taskName string) error {
			return nil
		},
	}
	router := setupScheduledTaskRouter(mock)

	body := `{"task_name": "price_crawl"}`
	req, _ := http.NewRequest("POST", "/admin/scheduled-tasks/trigger", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int               `json:"code"`
		Message string            `json:"message"`
		Data    map[string]string `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestScheduledTaskTrigger_Error(t *testing.T) {
	mock := &mockScheduledTaskService{
		triggerTaskFn: func(taskName string) error {
			return stderrors.New("任务不存在")
		},
	}
	router := setupScheduledTaskRouter(mock)

	body := `{"task_name": "unknown_task"}`
	req, _ := http.NewRequest("POST", "/admin/scheduled-tasks/trigger", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeBusinessError {
		t.Errorf("expected code %d, got %d", errors.CodeBusinessError, resp.Code)
	}
}

func TestScheduledTaskTrigger_EmptyTaskName(t *testing.T) {
	mock := &mockScheduledTaskService{}
	router := setupScheduledTaskRouter(mock)

	body := `{"task_name": ""}`
	req, _ := http.NewRequest("POST", "/admin/scheduled-tasks/trigger", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d, got %d", errors.CodeParamError, resp.Code)
	}
}
