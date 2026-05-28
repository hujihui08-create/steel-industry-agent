package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// SettingsMap is a key-value map stored as JSONB in the database.
type SettingsMap map[string]interface{}

// Value implements driver.Valuer for JSONB storage.
func (s SettingsMap) Value() (driver.Value, error) {
	return json.Marshal(s)
}

// Scan implements sql.Scanner for JSONB retrieval.
func (s *SettingsMap) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, s)
}

// AdminSettings represents the system-wide admin settings stored as a single row.
type AdminSettings struct {
	ID           uint        `gorm:"primaryKey" json:"id"`
	SettingsData SettingsMap `gorm:"type:jsonb;not null;default:'{}'" json:"settings_data"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}

// TableName returns the database table name for AdminSettings.
func (AdminSettings) TableName() string {
	return "admin_settings"
}

// SettingsDefaults returns the default values for all admin settings fields.
func SettingsDefaults() map[string]interface{} {
	return map[string]interface{}{
		"siteName":           "钢铁行业Agent管理后台",
		"logoUrl":            "",
		"contactEmail":       "",
		"contactPhone":       "",
		"emailEnabled":       false,
		"smtpServer":         "",
		"smtpPort":           465,
		"smtpEncryption":     "SSL",
		"smtpEmail":          "",
		"smtpPassword":       "",
		"smsEnabled":         false,
		"smsProvider":        "阿里云号码认证（个人开发者）",
		"smsAccessKey":       "",
		"smsAccessSecret":    "",
		"smsSignName":        "",
		"smsTemplateCode":    "",
		"sessionTimeout":     30,
		"loginLockCount":     5,
		"ipWhitelistEnabled": false,
		"ipWhitelist":        []string{},
	}
}