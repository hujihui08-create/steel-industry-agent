package service

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"steel-agent-backend/internal/config"
	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

// BackupService handles scheduled daily database backups using pg_dump.
type BackupService struct {
	backupDir         string
	dbHost            string
	dbPort            string
	dbUser            string
	dbName            string
	adminSettingsRepo *repository.AdminSettingsRepository
}

// NewBackupService creates a new BackupService instance.
// backupDir is the directory where backup files will be stored.
// Uses centralized configuration from config.AppConfig for database connection parameters.
func NewBackupService(backupDir string, adminSettingsRepo *repository.AdminSettingsRepository) *BackupService {
	cfg := config.AppConfig
	return &BackupService{
		backupDir:         backupDir,
		dbHost:            cfg.DBHost,
		dbPort:            cfg.DBPort,
		dbUser:            cfg.DBUser,
		dbName:            cfg.DBName,
		adminSettingsRepo: adminSettingsRepo,
	}
}

// backup performs a single database backup using pg_dump.
func (s *BackupService) backup() {
	// Ensure the backup directory exists
	if err := os.MkdirAll(s.backupDir, 0755); err != nil {
		log.Printf("[Backup] Failed to create backup directory %s: %v", s.backupDir, err)
		return
	}

	filename := "steel_agent_backup_" + time.Now().Format("20060102") + ".sql"
	filePath := filepath.Join(s.backupDir, filename)

	log.Printf("[Backup] Starting database backup to %s...", filePath)

	cmd := exec.Command("pg_dump",
		"-h", s.dbHost,
		"-p", s.dbPort,
		"-U", s.dbUser,
		"-d", s.dbName,
	)

	outFile, err := os.Create(filePath)
	if err != nil {
		log.Printf("[Backup] Failed to create backup file: %v", err)
		return
	}
	defer outFile.Close()

	cmd.Stdout = outFile
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		log.Printf("[Backup] pg_dump failed: %v", err)
		return
	}

	log.Printf("[Backup] Backup created successfully: %s", filePath)
}

// cleanup removes backup files older than 30 days.
func (s *BackupService) cleanup() {
	cutoff := time.Now().AddDate(0, 0, -30)

	entries, err := os.ReadDir(s.backupDir)
	if err != nil {
		log.Printf("[Backup] Failed to read backup directory: %v", err)
		return
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		if info.ModTime().Before(cutoff) {
			path := filepath.Join(s.backupDir, entry.Name())
			if err := os.Remove(path); err != nil {
				log.Printf("[Backup] Failed to delete old backup %s: %v", entry.Name(), err)
			} else {
				log.Printf("[Backup] Deleted old backup: %s", entry.Name())
			}
		}
	}
}

// StartScheduler launches a background goroutine that performs a backup
// every day at 03:00 AM. The caller can stop the scheduler by closing
// the stopCh channel.
func (s *BackupService) StartScheduler(stopCh <-chan struct{}) {
	go func() {
		for {
			now := time.Now()
			next := time.Date(now.Year(), now.Month(), now.Day(), 3, 0, 0, 0, now.Location())
			if !now.Before(next) {
				next = next.AddDate(0, 0, 1)
			}
			duration := next.Sub(now)

			select {
			case <-time.After(duration):
				s.backup()
				s.cleanup()
			case <-stopCh:
				log.Println("[Backup] Scheduled backup task stopped")
				return
			}
		}
	}()
}

func (s *BackupService) TriggerBackup() (string, error) {
	if err := os.MkdirAll(s.backupDir, 0755); err != nil {
		return "", err
	}

	filename := "steel_agent_backup_" + time.Now().Format("20060102_150405") + ".sql"
	filePath := filepath.Join(s.backupDir, filename)

	cmd := exec.Command("pg_dump",
		"-h", s.dbHost,
		"-p", s.dbPort,
		"-U", s.dbUser,
		"-d", s.dbName,
	)

	outFile, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer outFile.Close()

	cmd.Stdout = outFile
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return "", err
	}

	return filename, nil
}

func (s *BackupService) Overview() (map[string]interface{}, error) {
	records, err := s.listBackupFiles()
	if err != nil {
		return nil, err
	}

	lastBackup := ""
	totalSize := int64(0)
	if len(records) > 0 {
		if ts, ok := records[0]["timestamp"].(string); ok {
			lastBackup = ts
		}
	}
	for _, r := range records {
		if sz, ok := r["file_size"].(int64); ok {
			totalSize += sz
		}
	}

	return map[string]interface{}{
		"db_size":             formatSize(totalSize),
		"file_count":          len(records),
		"last_backup":         lastBackup,
		"auto_backup_enabled": true,
		"auto_backup_time":    "03:00",
		"retention_days":      30,
	}, nil
}

func (s *BackupService) Records(page, pageSize int) (map[string]interface{}, error) {
	records, err := s.listBackupFiles()
	if err != nil {
		return nil, err
	}

	start := (page - 1) * pageSize
	if start < 0 {
		start = 0
	}
	end := start + pageSize
	if end > len(records) {
		end = len(records)
	}

	paged := records
	if start < len(records) {
		paged = records[start:end]
	} else {
		paged = []map[string]interface{}{}
	}

	return map[string]interface{}{
		"items":     paged,
		"total":     len(records),
		"page":      page,
		"page_size": pageSize,
	}, nil
}

// RestoreBackup restores the database from a backup file using psql.
// The backup files are plain SQL dumps, so psql is used instead of pg_restore.
func (s *BackupService) RestoreBackup(filename string) error {
	filePath := filepath.Join(s.backupDir, filename)

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return fmt.Errorf("备份文件不存在: %s", filename)
	}

	log.Printf("[Backup] Starting database restore from %s...", filePath)

	cmd := exec.Command("psql",
		"-h", s.dbHost,
		"-p", s.dbPort,
		"-U", s.dbUser,
		"-d", s.dbName,
		"-f", filePath,
	)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		log.Printf("[Backup] psql restore failed: %v", err)
		return fmt.Errorf("数据库恢复失败: %w", err)
	}

	log.Printf("[Backup] Database restored successfully from: %s", filePath)
	return nil
}

// GetBackupSettings reads backup-related settings from the admin_settings table.
// Keys are stored as camelCase in the JSONB map: backupTime, retentionDays, storagePath.
func (s *BackupService) GetBackupSettings(ctx context.Context) (map[string]interface{}, error) {
	settings, err := s.adminSettingsRepo.Get(ctx)
	if err != nil {
		return nil, err
	}

	result := map[string]interface{}{
		"backup_time":    "03:00",
		"retention_days": 30,
		"storage_path":   s.backupDir,
	}

	if settings != nil && settings.SettingsData != nil {
		if v, ok := settings.SettingsData["backupTime"]; ok {
			result["backup_time"] = v
		}
		if v, ok := settings.SettingsData["retentionDays"]; ok {
			result["retention_days"] = v
		}
		if v, ok := settings.SettingsData["storagePath"]; ok {
			result["storage_path"] = v
		}
	}

	return result, nil
}

// SaveBackupSettings merges backup-related keys into the admin_settings table.
func (s *BackupService) SaveBackupSettings(ctx context.Context, data map[string]interface{}) error {
	existing, err := s.adminSettingsRepo.Get(ctx)
	if err != nil {
		return err
	}

	var merged map[string]interface{}
	if existing != nil {
		merged = existing.SettingsData
	} else {
		merged = make(map[string]interface{})
	}

	// Extract backup-related keys and store them as camelCase in the settings map.
	// The frontend sends snake_case keys; we remap to camelCase for storage.
	keyMap := map[string]string{
		"backup_time":    "backupTime",
		"retention_days": "retentionDays",
		"storage_path":   "storagePath",
	}

	for srcKey, destKey := range keyMap {
		if v, ok := data[srcKey]; ok {
			merged[destKey] = v
		}
	}

	if existing == nil {
		existing = &model.AdminSettings{}
	}
	existing.SettingsData = merged
	return s.adminSettingsRepo.Save(ctx, existing)
}

func (s *BackupService) GetFilePath(filename string) string {
	return filepath.Join(s.backupDir, filename)
}

// listBackupFiles returns backup records with fields matching the frontend BackupRecord type:
// id, timestamp, file_size, type (auto/manual), status (success).
func (s *BackupService) listBackupFiles() ([]map[string]interface{}, error) {
	entries, err := os.ReadDir(s.backupDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []map[string]interface{}{}, nil
		}
		return nil, err
	}

	var records []map[string]interface{}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}

		// Determine backup type: auto backups have date-only pattern (YYYYMMDD),
		// manual backups include timestamp (YYYYMMDD_HHMMSS).
		backupType := "auto"
		name := entry.Name()
		// Strip prefix and extension to extract the datetime portion
		trimmed := strings.TrimPrefix(name, "steel_agent_backup_")
		trimmed = strings.TrimSuffix(trimmed, ".sql")
		if strings.Contains(trimmed, "_") {
			backupType = "manual"
		}

		records = append(records, map[string]interface{}{
			"id":        name,
			"timestamp": info.ModTime().Format("2006-01-02 15:04:05"),
			"file_size": info.Size(),
			"type":      backupType,
			"status":    "success",
		})
	}

	return records, nil
}

// formatSize converts a byte count into a human-readable string like "12.5 MB".
func formatSize(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	units := []string{"KB", "MB", "GB", "TB"}
	return fmt.Sprintf("%.1f %s", float64(bytes)/float64(div), units[exp])
}


