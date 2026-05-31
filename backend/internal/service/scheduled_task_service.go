package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

// ScheduledTaskService manages the lifecycle of scheduled background tasks:
// registration, listing, manual triggering, and status toggling.
type ScheduledTaskService struct {
	taskRepo   *repository.ScheduledTaskRepository
	logRepo    *repository.TaskExecutionLogRepository
	cleanupSvc *CleanupService
	backupSvc  *BackupService
	crawlerSvc *CrawlerService
	alertSvc   *AlertService
}

// NewScheduledTaskService creates a new ScheduledTaskService wired with all
// required dependencies.
func NewScheduledTaskService(
	taskRepo *repository.ScheduledTaskRepository,
	logRepo *repository.TaskExecutionLogRepository,
	cleanupSvc *CleanupService,
	backupSvc *BackupService,
	crawlerSvc *CrawlerService,
	alertSvc *AlertService,
) *ScheduledTaskService {
	return &ScheduledTaskService{
		taskRepo:   taskRepo,
		logRepo:    logRepo,
		cleanupSvc: cleanupSvc,
		backupSvc:  backupSvc,
		crawlerSvc: crawlerSvc,
		alertSvc:   alertSvc,
	}
}

// RegisterTasks upserts the three default scheduled tasks into the database.
// It is safe to call multiple times; existing tasks are updated in place.
func (s *ScheduledTaskService) RegisterTasks() error {
	ctx := context.Background()
	tasks := []model.ScheduledTask{
		{
			Name:        "data_cleanup",
			Description: "月度数据清理（删除过期价格/资讯/招标/对话数据）",
			CronExpr:    "每月1日 02:00",
			Status:      "running",
		},
		{
			Name:        "auto_backup",
			Description: "数据库自动备份",
			CronExpr:    "每天 03:00",
			Status:      "running",
		},
		{
			Name:        "crawler_collect",
			Description: "数据采集器（轮询活跃数据源）",
			CronExpr:    "每30秒",
			Status:      "running",
		},
		{
			Name:        "price_alert_check",
			Description: "价格预警检查（每分钟检查活跃预警并触发通知）",
			CronExpr:    "每60秒",
			Status:      "running",
		},
	}

	for _, task := range tasks {
		t := task // capture loop variable
		if err := s.taskRepo.Upsert(ctx, &t); err != nil {
			return fmt.Errorf("注册任务 %s 失败: %w", task.Name, err)
		}
	}

	log.Println("[ScheduledTaskService] 已注册 4 个默认定时任务")
	return nil
}

// ListTasks returns all scheduled tasks ordered by ID.
func (s *ScheduledTaskService) ListTasks() ([]model.ScheduledTask, error) {
	return s.taskRepo.FindAll(context.Background())
}

// TriggerTask starts the named task asynchronously. It creates an execution log
// entry, launches a goroutine to run the actual work, and then updates both
// the log and the task record on completion.
func (s *ScheduledTaskService) TriggerTask(taskName string) error {
	ctx := context.Background()

	task, err := s.taskRepo.FindByName(ctx, taskName)
	if err != nil {
		return fmt.Errorf("任务 %s 不存在", taskName)
	}

	if task.Status == "paused" {
		return fmt.Errorf("任务 %s 已暂停，无法触发", taskName)
	}

	// Create a running execution log entry.
	now := time.Now()
	execLog := &model.TaskExecutionLog{
		TaskID:    task.ID,
		StartedAt: now,
		Status:    "running",
	}
	if err := s.logRepo.Create(ctx, execLog); err != nil {
		return fmt.Errorf("创建执行日志失败: %w", err)
	}

	log.Printf("[ScheduledTaskService] 触发任务: %s (task_id=%d, log_id=%d)", taskName, task.ID, execLog.ID)

	// Run asynchronously so the HTTP handler can respond immediately.
	go s.executeTask(task, execLog)

	return nil
}

// executeTask runs the actual work for the given task and updates the execution
// log with the result.
func (s *ScheduledTaskService) executeTask(task *model.ScheduledTask, execLog *model.TaskExecutionLog) {
	ctx := context.Background()

	var resultDetail string
	var execErr error

	switch task.Name {
	case "data_cleanup":
		log.Println("[ScheduledTaskService] 执行数据清理任务...")
		s.cleanupSvc.RunMonthlyCleanup(ctx)
		resultDetail = "月度数据清理完成（过期价格/资讯/招标/对话数据）"

	case "auto_backup":
		log.Println("[ScheduledTaskService] 执行数据库备份任务...")
		filename, err := s.backupSvc.TriggerBackup()
		if err != nil {
			execErr = fmt.Errorf("备份失败: %w", err)
		} else {
			resultDetail = "备份文件: " + filename
		}

	case "crawler_collect":
		log.Println("[ScheduledTaskService] 执行数据采集任务...")
		s.crawlerSvc.RunSchedulerTick()
		resultDetail = "数据采集轮询完成"

	case "price_alert_check":
		log.Println("[ScheduledTaskService] 执行价格预警检查...")
		s.alertSvc.CheckAndTriggerAlerts(ctx)
		resultDetail = "价格预警检查完成"

	default:
		execErr = fmt.Errorf("未知任务: %s", task.Name)
	}

	// Update execution log.
	if execErr != nil {
		log.Printf("[ScheduledTaskService] 任务 %s 执行失败: %v", task.Name, execErr)
		if err := s.logRepo.UpdateStatus(ctx, execLog.ID, "failed", "", execErr.Error()); err != nil {
			log.Printf("[ScheduledTaskService] 更新执行日志失败: %v", err)
		}
	} else {
		log.Printf("[ScheduledTaskService] 任务 %s 执行成功", task.Name)
		if err := s.logRepo.UpdateStatus(ctx, execLog.ID, "success", resultDetail, ""); err != nil {
			log.Printf("[ScheduledTaskService] 更新执行日志失败: %v", err)
		}
	}

	// Update the task's last_run_at.
	latestRun := time.Now()
	if err := s.taskRepo.UpdateStatus(ctx, task.ID, task.Status, &latestRun, nil); err != nil {
		log.Printf("[ScheduledTaskService] 更新任务 last_run_at 失败: %v", err)
	}
}

// GetTaskLogs returns the most recent execution logs for the given task ID.
func (s *ScheduledTaskService) GetTaskLogs(taskID uint, limit int) ([]model.TaskExecutionLog, error) {
	return s.logRepo.FindByTaskID(context.Background(), taskID, limit)
}

// ToggleTask switches a task's status between "running" and "paused".
// Returns the new status string.
func (s *ScheduledTaskService) ToggleTask(taskName string) (string, error) {
	ctx := context.Background()

	task, err := s.taskRepo.FindByName(ctx, taskName)
	if err != nil {
		return "", fmt.Errorf("任务 %s 不存在", taskName)
	}

	newStatus := "paused"
	if task.Status == "paused" {
		newStatus = "running"
	}

	if err := s.taskRepo.UpdateStatus(ctx, task.ID, newStatus, nil, nil); err != nil {
		return "", fmt.Errorf("更新任务状态失败: %w", err)
	}

	log.Printf("[ScheduledTaskService] 任务 %s 状态切换: %s -> %s", taskName, task.Status, newStatus)
	return newStatus, nil
}
