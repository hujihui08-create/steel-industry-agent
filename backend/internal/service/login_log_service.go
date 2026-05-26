package service

import (
	"context"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

// LoginLogService handles login log recording and querying business logic.
type LoginLogService struct {
	loginLogRepo *repository.LoginLogRepository
}

// NewLoginLogService creates a new LoginLogService with the given login log repository.
func NewLoginLogService(loginLogRepo *repository.LoginLogRepository) *LoginLogService {
	return &LoginLogService{loginLogRepo: loginLogRepo}
}

// RecordLoginSuccess records a successful login attempt.
func (s *LoginLogService) RecordLoginSuccess(ctx context.Context, userType string, adminID, userID *uint, ip, userAgent string) {
	log := &model.LoginLog{
		UserType:  userType,
		AdminID:   adminID,
		UserID:    userID,
		LoginType: "success",
		IPAddress: ip,
		UserAgent: userAgent,
	}
	_ = s.loginLogRepo.Create(ctx, log)
}

// RecordLoginFailure records a failed login attempt with the given reason.
func (s *LoginLogService) RecordLoginFailure(ctx context.Context, userType string, adminID, userID *uint, ip, userAgent, reason string) {
	log := &model.LoginLog{
		UserType:   userType,
		AdminID:    adminID,
		UserID:     userID,
		LoginType:  "failure",
		FailReason: reason,
		IPAddress:  ip,
		UserAgent:  userAgent,
	}
	_ = s.loginLogRepo.Create(ctx, log)
}

// List returns paginated login logs filtered by user type.
func (s *LoginLogService) List(ctx context.Context, userType string, page, pageSize int) ([]model.LoginLog, int64, error) {
	return s.loginLogRepo.FindRecent(ctx, userType, page, pageSize)
}

// Stats returns today's login statistics.
func (s *LoginLogService) Stats(ctx context.Context) (todayTotal, todaySuccess, todayFailure int64, err error) {
	return s.loginLogRepo.Stats(ctx)
}
