package model

import (
	"time"

	"github.com/lib/pq"
)

// Intent represents a predefined user intent pattern for AI routing.
type Intent struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	IntentCode    string         `gorm:"size:50;uniqueIndex;not null" json:"intent_code"`
	IntentName    string         `gorm:"size:100;not null" json:"intent_name"`
	Keywords      pq.StringArray `gorm:"type:text[]" json:"keywords"`
	Entities      pq.StringArray `gorm:"type:text[]" json:"entities"`
	ReplyTemplate string         `gorm:"type:text" json:"reply_template"`
	Priority      int            `gorm:"default:0" json:"priority"`
	IsActive      bool           `json:"is_active"`
	ToolName      string         `gorm:"size:50" json:"tool_name"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// TableName returns the database table name for Intent.
func (Intent) TableName() string {
	return "intents"
}
