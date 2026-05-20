package model

import "time"

// AgentConfig represents a key-value configuration entry for the AI agent system.
type AgentConfig struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	ConfigKey   string    `gorm:"size:100;uniqueIndex;not null" json:"config_key"`
	ConfigValue string    `gorm:"type:jsonb" json:"config_value"`
	Description string    `gorm:"size:500" json:"description"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName returns the database table name for AgentConfig.
func (AgentConfig) TableName() string {
	return "agent_configs"
}
