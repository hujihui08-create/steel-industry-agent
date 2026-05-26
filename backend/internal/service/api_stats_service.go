package service

import (
	"context"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

// ApiCallLogService provides business logic for API call statistics.
type ApiCallLogService struct {
	repo           *repository.ApiCallLogRepository
	tokenUsageRepo *repository.TokenUsageRepository
}

// NewApiCallLogService creates a new ApiCallLogService.
func NewApiCallLogService(repo *repository.ApiCallLogRepository, tokenUsageRepo *repository.TokenUsageRepository) *ApiCallLogService {
	return &ApiCallLogService{
		repo:           repo,
		tokenUsageRepo: tokenUsageRepo,
	}
}

// OverviewData holds the aggregated overview statistics.
type OverviewData struct {
	TodayTotal  int64   `json:"today_total"`
	AvgDuration float64 `json:"avg_duration_ms"`
	ErrorRate   float64 `json:"error_rate"`
}

// GetOverview returns today's API call overview statistics.
func (s *ApiCallLogService) GetOverview(ctx context.Context) (*OverviewData, error) {
	total, avg, errRate, err := s.repo.Overview(ctx)
	if err != nil {
		return nil, err
	}
	return &OverviewData{
		TodayTotal:  total,
		AvgDuration: avg,
		ErrorRate:   errRate,
	}, nil
}

// GetEndpointStats returns call statistics grouped by API endpoint.
func (s *ApiCallLogService) GetEndpointStats(ctx context.Context) ([]model.EndpointStat, error) {
	return s.repo.EndpointStats(ctx)
}

// GetModelStats returns token usage statistics grouped by model.
func (s *ApiCallLogService) GetModelStats(ctx context.Context) ([]model.ModelStat, error) {
	return s.repo.ModelStats(ctx)
}

// GetUserStats returns API usage statistics grouped by user.
func (s *ApiCallLogService) GetUserStats(ctx context.Context) ([]model.UserStat, error) {
	return s.repo.UserStats(ctx)
}

// GetTrend returns daily API call trends for the specified number of days.
func (s *ApiCallLogService) GetTrend(ctx context.Context, days int) ([]model.TrendPoint, error) {
	return s.repo.Trend(ctx, days)
}
