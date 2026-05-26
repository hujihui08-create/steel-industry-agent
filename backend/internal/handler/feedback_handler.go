package handler

import (
	"context"
	"strconv"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type feedbackService interface {
	SubmitFeedback(ctx context.Context, userID uint, feedbackType, content, contact string) (*model.UserFeedback, error)
}

type adminFeedbackService interface {
	ListFeedbacks(ctx context.Context, feedbackType string, limit, offset int) ([]model.UserFeedback, int64, error)
	GetFeedbackDetail(ctx context.Context, id uint) (*model.UserFeedback, error)
}

type FeedbackHandler struct {
	feedbackService      feedbackService
	adminFeedbackService adminFeedbackService
}

func NewFeedbackHandler(feedbackService *service.FeedbackService) *FeedbackHandler {
	return &FeedbackHandler{
		feedbackService:      feedbackService,
		adminFeedbackService: feedbackService,
	}
}

func (h *FeedbackHandler) SubmitFeedback(c *gin.Context) {
	var req struct {
		Type    string `json:"type" binding:"required"`
		Content string `json:"content" binding:"required"`
		Contact string `json:"contact"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：请填写反馈类型和内容")
		return
	}

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	f, err := h.feedbackService.SubmitFeedback(c.Request.Context(), userID, req.Type, req.Content, req.Contact)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, f)
}

func (h *FeedbackHandler) ListFeedbacks(c *gin.Context) {
	feedbackType := c.Query("type")
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	feedbacks, total, err := h.adminFeedbackService.ListFeedbacks(c.Request.Context(), feedbackType, limit, offset)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, map[string]interface{}{
		"list":  feedbacks,
		"total": total,
	})
}

func (h *FeedbackHandler) GetFeedbackDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	f, err := h.adminFeedbackService.GetFeedbackDetail(c.Request.Context(), uint(id))
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, f)
}
