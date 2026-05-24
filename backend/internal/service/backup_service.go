package service

import (
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"steel-agent-backend/internal/config"
)

// BackupService handles scheduled daily database backups using pg_dump.
type BackupService struct {
	backupDir string
	dbHost    string
	dbPort    string
	dbUser    string
	dbName    string
}

// NewBackupService creates a new BackupService instance.
// backupDir is the directory where backup files will be stored.
// Uses centralized configuration from config.AppConfig for database connection parameters.
func NewBackupService(backupDir string) *BackupService {
	cfg := config.AppConfig
	return &BackupService{
		backupDir: backupDir,
		dbHost:    cfg.DBHost,
		dbPort:    cfg.DBPort,
		dbUser:    cfg.DBUser,
		dbName:    cfg.DBName,
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
			// Calculate the next occurrence: today at 03:00 if not yet passed,
			// otherwise tomorrow at 03:00.
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


