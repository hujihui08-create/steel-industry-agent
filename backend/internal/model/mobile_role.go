package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// PermissionMap maps permission keys to boolean enabled/disabled.
type PermissionMap map[string]bool

// Value implements driver.Valuer for JSONB storage.
func (p PermissionMap) Value() (driver.Value, error) {
	return json.Marshal(p)
}

// Scan implements sql.Scanner for JSONB retrieval.
func (p *PermissionMap) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, p)
}

// MobileRole represents a role that can be assigned to mobile users,
// controlling which features they can access.
type MobileRole struct {
	ID          uint          `gorm:"primaryKey" json:"id"`
	Name        string        `gorm:"type:varchar(50);uniqueIndex;not null" json:"name"`
	Description string        `gorm:"type:varchar(200)" json:"description"`
	Permissions PermissionMap `gorm:"type:jsonb;default:'{}'" json:"permissions"`
	Status      int           `gorm:"type:smallint;default:1" json:"status"`
	RoleType    string        `gorm:"type:varchar(20);default:mobile" json:"role_type"`
	UserCount   int           `gorm:"-" json:"user_count"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

// TableName returns the database table name for MobileRole.
func (MobileRole) TableName() string {
	return "mobile_roles"
}
