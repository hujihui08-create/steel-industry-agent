package handler

import (
	"context"
	"fmt"
	"io"
	"strconv"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type chatService interface {
	ChatCompletions(ctx context.Context, userID uint, sessionID uint, content string) (<-chan string, error)
	GetChatSessions(ctx context.Context, userID uint, limit, offset int) ([]model.ChatSession, error)
	StopGeneration(ctx context.Context, userID uint, sessionID uint) error
	ContinueGeneration(ctx context.Context, userID uint, sessionID uint) (<-chan string, error)
	DeleteSession(ctx context.Context, userID uint, sessionID uint) error
	GetSessionMessages(ctx context.Context, userID uint, sessionID uint) ([]model.ChatMessage, error)
	SubmitFeedback(ctx context.Context, userID uint, messageID uint, isHelpful bool, comment string, errorType string) error
}

// ChatHandler handles AI chat-related HTTP requests.
type ChatHandler struct {
	chatService chatService
}

// NewChatHandler creates a new ChatHandler with the given chat service.
func NewChatHandler(chatService *service.ChatService) *ChatHandler {
	return &ChatHandler{chatService: chatService}
}

// ChatCompletions handles streaming AI chat conversations using SSE.
func (h *ChatHandler) ChatCompletions(c *gin.Context) {
	var req struct {
		SessionID uint   `json:"session_id"`
		Content   string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	chunks, err := h.chatService.ChatCompletions(c.Request.Context(), userID, req.SessionID, req.Content)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	c.Stream(func(w io.Writer) bool {
		chunk, ok := <-chunks
		if !ok {
			return false
		}
		fmt.Fprint(w, chunk)
		return true
	})
}

// GetChatSessions returns the authenticated user's chat session history.
func (h *ChatHandler) GetChatSessions(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	sessions, err := h.chatService.GetChatSessions(c.Request.Context(), userID, limit, offset)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, sessions)
}

// StopGeneration stops an in-progress AI generation.
func (h *ChatHandler) StopGeneration(c *gin.Context) {
	var req struct {
		SessionID uint `json:"session_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}
	userIDVal, _ := c.Get("user_id")
	if err := h.chatService.StopGeneration(c.Request.Context(), userIDVal.(uint), req.SessionID); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, nil)
}

// ContinueGeneration continues a previously stopped AI generation.
func (h *ChatHandler) ContinueGeneration(c *gin.Context) {
	var req struct {
		SessionID uint `json:"session_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}
	userIDVal, _ := c.Get("user_id")
	chunks, err := h.chatService.ContinueGeneration(c.Request.Context(), userIDVal.(uint), req.SessionID)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	c.Stream(func(w io.Writer) bool {
		chunk, ok := <-chunks
		if !ok {
			return false
		}
		fmt.Fprint(w, chunk)
		return true
	})
}

// SubmitFeedback handles AI response feedback.
func (h *ChatHandler) SubmitFeedback(c *gin.Context) {
	var req struct {
		MessageID uint   `json:"message_id" binding:"required"`
		IsHelpful bool   `json:"is_helpful"`
		Comment   string `json:"comment"`
		ErrorType string `json:"error_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}
	userIDVal, _ := c.Get("user_id")
	if err := h.chatService.SubmitFeedback(c.Request.Context(), userIDVal.(uint), req.MessageID, req.IsHelpful, req.Comment, req.ErrorType); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, nil)
}

// DeleteSession deletes a chat session.
func (h *ChatHandler) DeleteSession(c *gin.Context) {
	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}
	userIDVal, _ := c.Get("user_id")
	if err := h.chatService.DeleteSession(c.Request.Context(), userIDVal.(uint), uint(sessionID)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, nil)
}

// GetSessionMessages returns messages for a session.
func (h *ChatHandler) GetSessionMessages(c *gin.Context) {
	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}
	userIDVal, _ := c.Get("user_id")
	messages, err := h.chatService.GetSessionMessages(c.Request.Context(), userIDVal.(uint), uint(sessionID))
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, messages)
}
