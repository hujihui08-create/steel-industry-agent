package model

import (
	"encoding/json"
	"time"
)

// ChatSession represents an AI chat conversation session.
type ChatSession struct {
	ID           uint          `gorm:"primaryKey" json:"id"`
	UserID       uint          `gorm:"not null;index" json:"user_id"`
	Title        string        `gorm:"type:varchar(200)" json:"title"`
	Model        string        `gorm:"type:varchar(50);default:gpt-4o-mini" json:"model"`
	MessageCount int           `gorm:"default:0" json:"message_count"`
	Context      string        `gorm:"type:jsonb;default:'{}'" json:"context,omitempty"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
	Messages     []ChatMessage `gorm:"foreignKey:SessionID" json:"messages,omitempty"`
}

// TableName returns the database table name for ChatSession.
func (ChatSession) TableName() string {
	return "chat_sessions"
}

// ChatMessage represents a single message within a chat session.
type ChatMessage struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	SessionID uint      `gorm:"not null;index" json:"session_id"`
	Role      string    `gorm:"type:varchar(20);not null" json:"role"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	Tokens    int       `gorm:"default:0" json:"tokens"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName returns the database table name for ChatMessage.
func (ChatMessage) TableName() string {
	return "chat_messages"
}

// ChatContext stores the current conversation context as JSON in chat_sessions.context.
type ChatContext struct {
	Intent    string            `json:"intent"`
	Entities  map[string]string `json:"entities"`
	LastQuery string            `json:"last_query"`
	TurnCount int               `json:"turn_count"`
}

// GetContext parses the JSON context field into a ChatContext struct.
// Returns an empty ChatContext if the field is empty or invalid.
func (s *ChatSession) GetContext() ChatContext {
	var ctx ChatContext
	if s.Context == "" {
		return ctx
	}
	if err := json.Unmarshal([]byte(s.Context), &ctx); err != nil {
		return ChatContext{}
	}
	return ctx
}

// SetContext serializes a ChatContext struct into the Context JSON string field.
func (s *ChatSession) SetContext(ctx ChatContext) {
	data, err := json.Marshal(ctx)
	if err != nil {
		s.Context = "{}"
		return
	}
	s.Context = string(data)
}

// AIFeedback represents user feedback on an AI-generated message.
type AIFeedback struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	MessageID uint      `gorm:"not null;index" json:"message_id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	IsHelpful bool      `gorm:"not null" json:"is_helpful"`
	Comment   string    `gorm:"type:text" json:"comment,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName returns the database table name for AIFeedback.
func (AIFeedback) TableName() string {
	return "ai_feedbacks"
}
