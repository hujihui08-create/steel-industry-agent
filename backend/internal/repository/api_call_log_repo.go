package repository

import (
	"context"
	"fmt"
	"time"

	"steel-agent-backend/internal/model"

	"gorm.io/gorm"
)

// ApiCallLogRepository provides data access for API call logs and statistics.
type ApiCallLogRepository struct {
	db *gorm.DB
}

// NewApiCallLogRepository creates a new ApiCallLogRepository.
func NewApiCallLogRepository(db *gorm.DB) *ApiCallLogRepository {
	return &ApiCallLogRepository{db: db}
}

// Create inserts a new API call log entry.
func (r *ApiCallLogRepository) Create(ctx context.Context, log *model.ApiCallLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

// Overview returns today's aggregate statistics: total calls, average duration, and error rate.
func (r *ApiCallLogRepository) Overview(ctx context.Context) (todayTotal int64, avgDuration float64, errorRate float64, err error) {
	today := time.Now().Format("2006-01-02")

	err = r.db.WithContext(ctx).Model(&model.ApiCallLog{}).
		Where("created_at >= ?", today).
		Count(&todayTotal).Error
	if err != nil {
		return 0, 0, 0, err
	}
	if todayTotal == 0 {
		return 0, 0, 0, nil
	}

	var avgResult struct {
		Avg float64 `gorm:"column:avg_duration"`
	}
	err = r.db.WithContext(ctx).Model(&model.ApiCallLog{}).
		Where("created_at >= ?", today).
		Select("COALESCE(AVG(duration_ms), 0) AS avg_duration").
		Scan(&avgResult).Error
	if err != nil {
		return 0, 0, 0, err
	}
	avgDuration = avgResult.Avg

	var errorCount int64
	err = r.db.WithContext(ctx).Model(&model.ApiCallLog{}).
		Where("created_at >= ? AND status_code >= 400", today).
		Count(&errorCount).Error
	if err != nil {
		return 0, 0, 0, err
	}
	errorRate = float64(errorCount) / float64(todayTotal) * 100

	return todayTotal, avgDuration, errorRate, nil
}

// EndpointStats returns call statistics grouped by API path.
func (r *ApiCallLogRepository) EndpointStats(ctx context.Context) ([]model.EndpointStat, error) {
	var stats []model.EndpointStat

	query := `
		SELECT
			api_path,
			COUNT(*) AS call_count,
			COALESCE(AVG(duration_ms), 0) AS avg_duration_ms,
			COALESCE(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 0) AS error_rate
		FROM api_call_logs
		GROUP BY api_path
		ORDER BY call_count DESC
	`
	if err := r.db.WithContext(ctx).Raw(query).Scan(&stats).Error; err != nil {
		return nil, fmt.Errorf("endpoint stats query: %w", err)
	}
	return stats, nil
}

// ModelStats returns token usage statistics grouped by model.
func (r *ApiCallLogRepository) ModelStats(ctx context.Context) ([]model.ModelStat, error) {
	var stats []model.ModelStat

	query := `
		SELECT
			model,
			COUNT(*) AS call_count,
			COALESCE(SUM(total_tokens), 0) AS total_tokens
		FROM token_usages
		GROUP BY model
		ORDER BY call_count DESC
	`
	if err := r.db.WithContext(ctx).Raw(query).Scan(&stats).Error; err != nil {
		return nil, fmt.Errorf("model stats query: %w", err)
	}
	return stats, nil
}

// UserStats returns API usage statistics grouped by user, combining both
// api_call_logs and token_usages tables.
func (r *ApiCallLogRepository) UserStats(ctx context.Context) ([]model.UserStat, error) {
	var stats []model.UserStat

	query := `
		SELECT
			COALESCE(a.user_id, t.user_id) AS user_id,
			COALESCE(a.call_count, 0) AS call_count,
			COALESCE(t.total_tokens, 0) AS total_tokens
		FROM (
			SELECT user_id, COUNT(*) AS call_count
			FROM api_call_logs
			WHERE user_id IS NOT NULL
			GROUP BY user_id
		) a
		FULL OUTER JOIN (
			SELECT user_id, SUM(total_tokens) AS total_tokens
			FROM token_usages
			GROUP BY user_id
		) t ON a.user_id = t.user_id
		ORDER BY call_count DESC
	`
	if err := r.db.WithContext(ctx).Raw(query).Scan(&stats).Error; err != nil {
		return nil, fmt.Errorf("user stats query: %w", err)
	}
	return stats, nil
}

// Trend returns daily API call counts and average duration for the last N days.
func (r *ApiCallLogRepository) Trend(ctx context.Context, days int) ([]model.TrendPoint, error) {
	if days <= 0 {
		days = 7
	}

	var points []model.TrendPoint

	query := `
		SELECT
			TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
			COUNT(*) AS call_count,
			COALESCE(AVG(duration_ms), 0) AS avg_duration_ms
		FROM api_call_logs
		WHERE created_at >= CURRENT_DATE - ($1) * INTERVAL '1 day'
		GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
		ORDER BY date ASC
	`
	if err := r.db.WithContext(ctx).Raw(query, days).Scan(&points).Error; err != nil {
		return nil, fmt.Errorf("trend query: %w", err)
	}
	return points, nil
}
