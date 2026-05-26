package service

import (
	"context"
	"errors"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

var validFeedbackTypes = map[string]bool{
	"bug":        true,
	"suggestion": true,
	"question":   true,
	"other":      true,
}

type FeedbackService struct {
	feedbackRepo *repository.UserFeedbackRepository
}

func NewFeedbackService(feedbackRepo *repository.UserFeedbackRepository) *FeedbackService {
	return &FeedbackService{feedbackRepo: feedbackRepo}
}

func (s *FeedbackService) SubmitFeedback(ctx context.Context, userID uint, feedbackType, content, contact string) (*model.UserFeedback, error) {
	if !validFeedbackTypes[feedbackType] {
		return nil, errors.New("反馈类型无效")
	}
	if content == "" {
		return nil, errors.New("反馈内容不能为空")
	}

	f := &model.UserFeedback{
		UserID:    userID,
		Type:      feedbackType,
		Content:   content,
		Contact:   contact,
		Status:    "unread",
		CreatedAt: time.Now(),
	}

	if err := s.feedbackRepo.Create(ctx, f); err != nil {
		return nil, err
	}
	return f, nil
}

func (s *FeedbackService) ListFeedbacks(ctx context.Context, feedbackType string, limit, offset int) ([]model.UserFeedback, int64, error) {
	return s.feedbackRepo.FindAll(ctx, feedbackType, limit, offset)
}

func (s *FeedbackService) GetFeedbackDetail(ctx context.Context, id uint) (*model.UserFeedback, error) {
	return s.feedbackRepo.FindByID(ctx, id)
}
