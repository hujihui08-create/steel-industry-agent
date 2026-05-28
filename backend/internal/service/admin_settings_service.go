package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"mime/multipart"
	"net/smtp"
	"os"
	"path/filepath"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
	"steel-agent-backend/pkg/sms"
)

// AdminSettingsService handles admin settings business logic.
type AdminSettingsService struct {
	repo *repository.AdminSettingsRepository
}

// NewAdminSettingsService creates a new AdminSettingsService with the given repository.
func NewAdminSettingsService(repo *repository.AdminSettingsRepository) *AdminSettingsService {
	return &AdminSettingsService{repo: repo}
}

// GetSettings returns the full admin settings map. When no settings exist yet,
// the default values are returned.
func (s *AdminSettingsService) GetSettings(ctx context.Context) (map[string]interface{}, error) {
	settings, err := s.repo.Get(ctx)
	if err != nil {
		return nil, err
	}
	if settings == nil {
		return model.SettingsDefaults(), nil
	}
	return map[string]interface{}(settings.SettingsData), nil
}

// SaveSettings merges the incoming data with existing settings and persists the result.
func (s *AdminSettingsService) SaveSettings(ctx context.Context, data map[string]interface{}) error {
	existing, err := s.repo.Get(ctx)
	if err != nil {
		return err
	}

	var merged model.SettingsMap
	if existing != nil {
		// Start with existing settings
		merged = existing.SettingsData
	} else {
		// Start with defaults for a new row
		defaults := model.SettingsDefaults()
		merged = model.SettingsMap(defaults)
		existing = &model.AdminSettings{}
	}

	// Merge incoming data on top
	for k, v := range data {
		merged[k] = v
	}

	existing.SettingsData = merged
	return s.repo.Save(ctx, existing)
}

// GetPublicConfig returns the public-facing configuration containing only
// branding fields: siteName, logoUrl, contactEmail, contactPhone.
func (s *AdminSettingsService) GetPublicConfig(ctx context.Context) (map[string]interface{}, error) {
	settings, err := s.GetSettings(ctx)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"siteName":     settings["siteName"],
		"logoUrl":      settings["logoUrl"],
		"contactEmail": settings["contactEmail"],
		"contactPhone": settings["contactPhone"],
	}, nil
}

// GetSessionTimeout returns the session timeout in minutes from admin settings.
// Returns 0 if not configured, so callers can fall back to the environment default.
func (s *AdminSettingsService) GetSessionTimeout(ctx context.Context) (int, error) {
	settings, err := s.GetSettings(ctx)
	if err != nil {
		return 0, err
	}
	if timeout, ok := settings["sessionTimeout"]; ok {
		switch v := timeout.(type) {
		case float64:
			return int(v), nil
		case int:
			return v, nil
		case int64:
			return int(v), nil
		case json.Number:
			i, err := v.Int64()
			if err != nil {
				return 0, nil
			}
			return int(i), nil
		}
	}
	return 0, nil
}

// UploadLogo saves an uploaded image file to ./uploads/ with a unique filename
// and returns the relative URL path.
func (s *AdminSettingsService) UploadLogo(ctx context.Context, file *multipart.FileHeader) (string, error) {
	uploadDir := "./uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("创建上传目录失败: %w", err)
	}

	ext := filepath.Ext(file.Filename)
	if ext == "" {
		ext = ".png"
	}
	filename := fmt.Sprintf("logo_%d%s", time.Now().UnixNano(), ext)
	fullPath := filepath.Join(uploadDir, filename)

	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("打开上传文件失败: %w", err)
	}
	defer src.Close()

	dst, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("创建文件失败: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return "", fmt.Errorf("保存文件失败: %w", err)
	}

	url := "/uploads/" + filename
	return url, nil
}

// TestEmail sends a test email using the provided SMTP configuration.
// Returns a boolean indicating success, a human-readable result message, and an error.
func (s *AdminSettingsService) TestEmail(ctx context.Context, smtpConfig map[string]interface{}) (bool, string, error) {
	server, _ := smtpConfig["smtpServer"].(string)
	if server == "" {
		return false, "SMTP服务器地址不能为空", nil
	}

	port := toInt(smtpConfig["smtpPort"])
	if port == 0 {
		port = 465
	}

	email, _ := smtpConfig["smtpEmail"].(string)
	password, _ := smtpConfig["smtpPassword"].(string)
	if email == "" || password == "" {
		return false, "SMTP邮箱和密码不能为空", nil
	}

	to, _ := smtpConfig["smtpEmail"].(string) // send to self as test

	encryption, _ := smtpConfig["smtpEncryption"].(string)

	addr := fmt.Sprintf("%s:%d", server, port)

	msg := []byte("From: " + email + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: 钢铁行业Agent - 邮件测试\r\n" +
		"Content-Type: text/plain; charset=UTF-8\r\n" +
		"\r\n" +
		"这是一封测试邮件，用于验证SMTP配置是否正确。\r\n" +
		"发送时间: " + time.Now().Format("2006-01-02 15:04:05") + "\r\n")

	var sendErr error
	if encryption == "SSL" {
		auth := smtp.PlainAuth("", email, password, server)
		sendErr = smtp.SendMail(addr, auth, email, []string{to}, msg)
	} else if encryption == "TLS" || encryption == "STARTTLS" {
		auth := smtp.PlainAuth("", email, password, server)
		// Attempt TLS connection; Go's SendMail uses STARTTLS when available
		sendErr = smtp.SendMail(addr, auth, email, []string{to}, msg)
	} else {
		// No encryption
		auth := smtp.PlainAuth("", email, password, server)
		sendErr = smtp.SendMail(addr, auth, email, []string{to}, msg)
	}

	if sendErr != nil {
		return false, fmt.Sprintf("邮件发送失败: %v", sendErr), nil
	}

	return true, "测试邮件已成功发送", nil
}

// toInt safely converts an interface{} value to int.
func toInt(v interface{}) int {
	switch val := v.(type) {
	case float64:
		return int(val)
	case int:
		return val
	case int64:
		return int(val)
	case json.Number:
		i, _ := val.Int64()
		return int(i)
	default:
		return 0
	}
}

// TestSMS sends a test SMS verification code to the given phone number
// using the configured SMS provider settings.
func (s *AdminSettingsService) TestSMS(ctx context.Context, phone string) (bool, string, error) {
	settings, err := s.GetSettings(ctx)
	if err != nil {
		return false, "获取配置失败", err
	}

	enabled, _ := settings["smsEnabled"].(bool)
	if !enabled {
		return false, "短信功能未启用，请先在系统设置中开启并保存配置", nil
	}

	accessKey, _ := settings["smsAccessKey"].(string)
	accessSecret, _ := settings["smsAccessSecret"].(string)
	signName, _ := settings["smsSignName"].(string)
	templateCode, _ := settings["smsTemplateCode"].(string)

	if accessKey == "" || accessSecret == "" {
		return false, "短信配置不完整：缺少 AccessKey ID 或 AccessKey Secret", nil
	}
	if signName == "" {
		return false, "短信配置不完整：缺少签名名称（SignName）", nil
	}
	if templateCode == "" {
		return false, "短信配置不完整：缺少模板编号（TemplateCode）", nil
	}

	smsClient, err := sms.NewSMSService(accessKey, accessSecret)
	if err != nil {
		return false, fmt.Sprintf("短信服务初始化失败: %v", err), nil
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	code := fmt.Sprintf("%06d", rng.Intn(1000000))

	_, err = smsClient.SendVerificationCode(phone, signName, templateCode, code)
	if err != nil {
		return false, fmt.Sprintf("短信发送失败: %v", err), nil
	}

	return true, "测试短信已成功发送", nil
}