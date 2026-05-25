package model

import "time"

// BadCase represents a flagged poor-quality AI response for analysis and improvement.
type BadCase struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	CaseNo          string     `gorm:"size:20;uniqueIndex" json:"case_no"`
	UserQuery       string     `gorm:"type:text;not null" json:"user_query"`
	AIResponse      string     `gorm:"type:text;not null" json:"ai_response"`
	CorrectResponse *string    `gorm:"type:text" json:"correct_response"`
	ErrorType       string     `gorm:"size:50" json:"error_type"`
	Status          string     `gorm:"size:20;default:pending" json:"status"`
	FixSolution     string     `gorm:"type:text" json:"fix_solution"`
	ConversationID  *uint      `json:"conversation_id"`
	ReportedBy      *uint      `json:"reported_by"`
	CreatedAt       time.Time  `json:"created_at"`
	FixedAt         *time.Time `json:"fixed_at"`
	VerifiedAt      *time.Time `json:"verified_at"`
}

// TableName returns the database table name for BadCase.
func (BadCase) TableName() string {
	return "bad_cases"
}
