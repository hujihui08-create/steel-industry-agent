package model

import "time"

// ApiCallLog records each API request for monitoring and statistics.
type ApiCallLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	APIPath    string    `gorm:"size:200;not null;index" json:"api_path"`
	Method     string    `gorm:"size:10;not null" json:"method"`
	StatusCode int       `gorm:"not null" json:"status_code"`
	DurationMs int       `json:"duration_ms"`
	UserID     *uint     `json:"user_id"`
	IPAddress  string    `gorm:"size:50" json:"ip_address"`
	CreatedAt  time.Time `json:"created_at"`
}

// TableName returns the table name for ApiCallLog.
func (ApiCallLog) TableName() string {
	return "api_call_logs"
}

// ---------- Statistics DTOs ----------

// EndpointStat groups API call statistics by endpoint path.
type EndpointStat struct {
	APIPath      string  `json:"api_path"`
	CallCount    int64   `json:"call_count"`
	AvgDuration  float64 `json:"avg_duration_ms"`
	ErrorRate    float64 `json:"error_rate"`
}

// ModelStat groups token usage statistics by model name.
type ModelStat struct {
	Model       string `json:"model"`
	CallCount   int64  `json:"call_count"`
	TotalTokens int64  `json:"total_tokens"`
}

// UserStat groups API usage statistics by user.
type UserStat struct {
	UserID       uint   `json:"user_id"`
	CallCount    int64  `json:"call_count"`
	TotalTokens  int64  `json:"total_tokens"`
}

// TrendPoint represents a single day's API call statistics.
type TrendPoint struct {
	Date        string  `json:"date"`
	CallCount   int64   `json:"call_count"`
	AvgDuration float64 `json:"avg_duration_ms"`
}
