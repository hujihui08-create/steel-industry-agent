package handler

import (
	"encoding/json"
	stderrors "errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

type mockBackupService struct {
	overviewFn           func() (map[string]interface{}, error)
	recordsFn            func(page, pageSize int) (map[string]interface{}, error)
	triggerBackupFn      func() (string, error)
	getBackupSettingsFn  func() (map[string]interface{}, error)
	saveBackupSettingsFn func(data map[string]interface{}) error
}

func (m *mockBackupService) Overview() (map[string]interface{}, error) {
	return m.overviewFn()
}

func (m *mockBackupService) Records(page, pageSize int) (map[string]interface{}, error) {
	return m.recordsFn(page, pageSize)
}

func (m *mockBackupService) TriggerBackup() (string, error) {
	return m.triggerBackupFn()
}

func (m *mockBackupService) GetBackupSettings(ctx interface{}) (map[string]interface{}, error) {
	return m.getBackupSettingsFn()
}

func (m *mockBackupService) SaveBackupSettings(ctx interface{}, data map[string]interface{}) error {
	return m.saveBackupSettingsFn(data)
}

func (m *mockBackupService) RestoreBackup(filename string) error {
	return nil
}

func (m *mockBackupService) GetFilePath(filename string) string {
	return "/backups/" + filename
}

func setupBackupRouter(mock *mockBackupService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/admin/backup/overview", func(c *gin.Context) {
		overview, err := mock.Overview()
		if err != nil {
			errorsResp(c, 50001, err.Error())
			return
		}
		successResp(c, overview)
	})
	router.GET("/admin/backup/records", func(c *gin.Context) {
		records, err := mock.Records(1, 10)
		if err != nil {
			errorsResp(c, 50001, err.Error())
			return
		}
		successResp(c, records)
	})
	router.POST("/admin/backup/trigger", func(c *gin.Context) {
		filename, err := mock.TriggerBackup()
		if err != nil {
			errorsResp(c, 50001, err.Error())
			return
		}
		successResp(c, map[string]string{"filename": filename})
	})
	return router
}

func successResp(c *gin.Context, data interface{}) {
	c.JSON(200, map[string]interface{}{"code": 200, "message": "success", "data": data})
}

func errorsResp(c *gin.Context, code int, msg string) {
	c.JSON(200, map[string]interface{}{"code": code, "message": msg, "data": nil})
}

func TestBackupOverview_Success(t *testing.T) {
	mock := &mockBackupService{
		overviewFn: func() (map[string]interface{}, error) {
			return map[string]interface{}{
				"db_size":             "12.5 MB",
				"file_count":          5,
				"last_backup":         "2026-05-28 03:00:00",
				"auto_backup_enabled": true,
				"auto_backup_time":    "03:00",
				"retention_days":      30,
			}, nil
		},
	}
	router := setupBackupRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/backup/overview", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int                    `json:"code"`
		Message string                 `json:"message"`
		Data    map[string]interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data["db_size"] != "12.5 MB" {
		t.Errorf("expected db_size '12.5 MB', got %v", resp.Data["db_size"])
	}
	if resp.Data["file_count"] != float64(5) {
		t.Errorf("expected file_count 5, got %v", resp.Data["file_count"])
	}
}

func TestBackupRecords_Success(t *testing.T) {
	mock := &mockBackupService{
		recordsFn: func(page, pageSize int) (map[string]interface{}, error) {
			return map[string]interface{}{
				"items":     []map[string]interface{}{},
				"total":     0,
				"page":      page,
				"page_size": pageSize,
			}, nil
		},
	}
	router := setupBackupRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/backup/records", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int                    `json:"code"`
		Message string                 `json:"message"`
		Data    map[string]interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestBackupTrigger_Success(t *testing.T) {
	mock := &mockBackupService{
		triggerBackupFn: func() (string, error) {
			return "steel_agent_backup_20260528_150405.sql", nil
		},
	}
	router := setupBackupRouter(mock)

	req, _ := http.NewRequest("POST", "/admin/backup/trigger", nil)
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
	if resp.Data["filename"] == "" {
		t.Error("expected non-empty filename")
	}
}

func TestBackupTrigger_Error(t *testing.T) {
	mock := &mockBackupService{
		triggerBackupFn: func() (string, error) {
			return "", stderrors.New("磁盘空间不足")
		},
	}
	router := setupBackupRouter(mock)

	req, _ := http.NewRequest("POST", "/admin/backup/trigger", nil)
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

func TestBackupOverview_Error(t *testing.T) {
	mock := &mockBackupService{
		overviewFn: func() (map[string]interface{}, error) {
			return nil, stderrors.New("备份目录不可用")
		},
	}
	router := setupBackupRouter(mock)

	req, _ := http.NewRequest("GET", "/admin/backup/overview", nil)
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
