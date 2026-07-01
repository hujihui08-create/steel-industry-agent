package model

import (
	"time"
)

// AgentMemory represents a long-term memory entry for the agent system.
// Each entry stores a key-value pair scoped to a user and optionally a session,
// enabling cross-session memory recall and retrieval.
type AgentMemory struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserID     uint      `gorm:"not null;index" json:"user_id"`
	SessionID  uint      `gorm:"not null;index" json:"session_id"`
	Key        string    `gorm:"type:varchar(200);not null" json:"key"`
	Value      string    `gorm:"type:text;not null;default:''" json:"value"`
	CreatedAt  time.Time `json:"created_at"`
	AccessedAt time.Time `gorm:"index" json:"accessed_at"`
}

// TableName returns the database table name for AgentMemory.
func (AgentMemory) TableName() string {
	return "agent_memories"
}
