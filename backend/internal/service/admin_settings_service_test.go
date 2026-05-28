package service

import (
	"context"
	"testing"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupServiceSettingsRepo(t *testing.T, data model.SettingsMap) *repository.AdminSettingsRepository {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.AdminSettings{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	repo := repository.NewAdminSettingsRepository(db)
	settings := &model.AdminSettings{SettingsData: data}
	if err := repo.Save(context.Background(), settings); err != nil {
		t.Fatalf("failed to save test settings: %v", err)
	}
	return repo
}

func TestAdminSettingsService_TestSMS_Disabled(t *testing.T) {
	repo := setupServiceSettingsRepo(t, model.SettingsMap{
		"smsEnabled": false,
	})
	svc := NewAdminSettingsService(repo)
	ctx := context.Background()

	success, msg, err := svc.TestSMS(ctx, "13800138000")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if success {
		t.Error("expected success=false when SMS disabled")
	}
	if msg == "" {
		t.Error("expected non-empty message")
	}
	t.Logf("disabled SMS result: success=%v, msg=%s", success, msg)
}

func TestAdminSettingsService_TestSMS_MissingAccessKey(t *testing.T) {
	repo := setupServiceSettingsRepo(t, model.SettingsMap{
		"smsEnabled":      true,
		"smsAccessKey":    "",
		"smsAccessSecret": "",
	})
	svc := NewAdminSettingsService(repo)
	ctx := context.Background()

	success, msg, err := svc.TestSMS(ctx, "13800138000")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if success {
		t.Error("expected success=false when AccessKey is missing")
	}
	if msg == "" {
		t.Error("expected non-empty message")
	}
	t.Logf("missing AccessKey result: success=%v, msg=%s", success, msg)
}

func TestAdminSettingsService_TestSMS_MissingSignName(t *testing.T) {
	repo := setupServiceSettingsRepo(t, model.SettingsMap{
		"smsEnabled":      true,
		"smsAccessKey":    "test-key",
		"smsAccessSecret": "test-secret",
		"smsSignName":     "",
		"smsTemplateCode": "SMS_001",
	})
	svc := NewAdminSettingsService(repo)
	ctx := context.Background()

	success, msg, err := svc.TestSMS(ctx, "13800138000")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if success {
		t.Error("expected success=false when SignName is missing")
	}
	if msg == "" {
		t.Error("expected non-empty message")
	}
	t.Logf("missing SignName result: success=%v, msg=%s", success, msg)
}

func TestAdminSettingsService_TestSMS_MissingTemplateCode(t *testing.T) {
	repo := setupServiceSettingsRepo(t, model.SettingsMap{
		"smsEnabled":      true,
		"smsAccessKey":    "test-key",
		"smsAccessSecret": "test-secret",
		"smsSignName":     "测试签名",
		"smsTemplateCode": "",
	})
	svc := NewAdminSettingsService(repo)
	ctx := context.Background()

	success, msg, err := svc.TestSMS(ctx, "13800138000")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if success {
		t.Error("expected success=false when TemplateCode is missing")
	}
	if msg == "" {
		t.Error("expected non-empty message")
	}
	t.Logf("missing TemplateCode result: success=%v, msg=%s", success, msg)
}

func TestAdminSettingsService_TestSMS_AllCompleteButAPIWillFail(t *testing.T) {
	repo := setupServiceSettingsRepo(t, model.SettingsMap{
		"smsEnabled":      true,
		"smsAccessKey":    "LTAI5tTestKey123",
		"smsAccessSecret": "testSecretKey123",
		"smsSignName":     "测试签名",
		"smsTemplateCode": "SMS_123456",
	})
	svc := NewAdminSettingsService(repo)
	ctx := context.Background()

	success, msg, err := svc.TestSMS(ctx, "13800138000")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if success {
		t.Log("SMS API call succeeded unexpectedly (real credentials?)")
	}
	if msg == "" {
		t.Error("expected non-empty message")
	}
	t.Logf("full config result: success=%v, msg=%s", success, msg)
}
