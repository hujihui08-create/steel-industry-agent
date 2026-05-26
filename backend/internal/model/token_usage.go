package model

import "time"

type TokenUsage struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	UserID           uint      `gorm:"index" json:"user_id"`
	SessionID        string    `gorm:"size:64" json:"session_id"`
	Model            string    `gorm:"size:50" json:"model"`
	PromptTokens     int       `json:"prompt_tokens"`
	CompletionTokens int       `json:"completion_tokens"`
	TotalTokens      int       `json:"total_tokens"`
	APIPath          string    `gorm:"size:100" json:"api_path"`
	StatusCode       int       `json:"status_code"`
	DurationMs       int       `json:"duration_ms"`
	CreatedAt        time.Time `json:"created_at"`
}
