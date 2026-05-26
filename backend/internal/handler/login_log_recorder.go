package handler

import "context"

// loginLogRecorder defines the interface for recording login success and failure events.
type loginLogRecorder interface {
	RecordLoginSuccess(ctx context.Context, userType string, adminID, userID *uint, ip, userAgent string)
	RecordLoginFailure(ctx context.Context, userType string, adminID, userID *uint, ip, userAgent, reason string)
}
