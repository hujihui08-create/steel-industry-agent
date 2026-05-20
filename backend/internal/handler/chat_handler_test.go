package handler

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"steel-agent-backend/internal/model"

	"github.com/gin-gonic/gin"
)

type mockChatService struct {
	chatCompletionsFn    func(ctx context.Context, userID uint, sessionID uint, content string) (<-chan string, error)
	getSessionsFn        func(ctx context.Context, userID uint, limit, offset int) ([]model.ChatSession, error)
	stopGenerationFn     func(ctx context.Context, userID uint, sessionID uint) error
	continueGenerationFn func(ctx context.Context, userID uint, sessionID uint) (<-chan string, error)
	deleteSessionFn      func(ctx context.Context, userID uint, sessionID uint) error
	getMessagesFn        func(ctx context.Context, userID uint, sessionID uint) ([]model.ChatMessage, error)
	submitFeedbackFn     func(ctx context.Context, userID uint, messageID uint, isHelpful bool, comment string) error
}

func (m *mockChatService) ChatCompletions(ctx context.Context, userID uint, sessionID uint, content string) (<-chan string, error) {
	return m.chatCompletionsFn(ctx, userID, sessionID, content)
}

func (m *mockChatService) GetChatSessions(ctx context.Context, userID uint, limit, offset int) ([]model.ChatSession, error) {
	return m.getSessionsFn(ctx, userID, limit, offset)
}

func (m *mockChatService) StopGeneration(ctx context.Context, userID uint, sessionID uint) error {
	if m.stopGenerationFn != nil {
		return m.stopGenerationFn(ctx, userID, sessionID)
	}
	return nil
}

func (m *mockChatService) ContinueGeneration(ctx context.Context, userID uint, sessionID uint) (<-chan string, error) {
	if m.continueGenerationFn != nil {
		return m.continueGenerationFn(ctx, userID, sessionID)
	}
	return nil, nil
}

func (m *mockChatService) DeleteSession(ctx context.Context, userID uint, sessionID uint) error {
	if m.deleteSessionFn != nil {
		return m.deleteSessionFn(ctx, userID, sessionID)
	}
	return nil
}

func (m *mockChatService) GetSessionMessages(ctx context.Context, userID uint, sessionID uint) ([]model.ChatMessage, error) {
	if m.getMessagesFn != nil {
		return m.getMessagesFn(ctx, userID, sessionID)
	}
	return nil, nil
}

func (m *mockChatService) SubmitFeedback(ctx context.Context, userID uint, messageID uint, isHelpful bool, comment string) error {
	if m.submitFeedbackFn != nil {
		return m.submitFeedbackFn(ctx, userID, messageID, isHelpful, comment)
	}
	return nil
}

func setupChatRouter(mock *mockChatService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &ChatHandler{chatService: mock}
	router := gin.New()

	setUserID := func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	}

	router.POST("/api/v1/chat/completions", setUserID, handler.ChatCompletions)
	router.GET("/api/v1/chat/sessions", setUserID, handler.GetChatSessions)
	router.POST("/api/v1/chat/stop", setUserID, handler.StopGeneration)
	router.POST("/api/v1/chat/continue", setUserID, handler.ContinueGeneration)
	router.POST("/api/v1/chat/feedback", setUserID, handler.SubmitFeedback)
	router.DELETE("/api/v1/chat/sessions/:id", setUserID, handler.DeleteSession)
	router.GET("/api/v1/chat/sessions/:id/messages", setUserID, handler.GetSessionMessages)
	return router
}

func TestChatCompletions_ValidContent(t *testing.T) {
	mock := &mockChatService{
		chatCompletionsFn: func(ctx context.Context, userID uint, sessionID uint, content string) (<-chan string, error) {
			ch := make(chan string, 2)
			ch <- "data: {\"content\": \"您好\"}\n\n"
			ch <- "data: [DONE]\n\n"
			close(ch)
			return ch, nil
		},
	}
	router := setupChatRouter(mock)

	server := httptest.NewServer(router)
	defer server.Close()

	body := `{"content": "你好"}`
	resp, err := http.Post(server.URL+"/api/v1/chat/completions", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatalf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType != "text/event-stream" {
		t.Errorf("expected Content-Type 'text/event-stream', got '%s'", contentType)
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	bodyStr := string(respBody)
	if !strings.Contains(bodyStr, "您好") {
		t.Errorf("expected response to contain '您好', got '%s'", bodyStr)
	}
	if !strings.Contains(bodyStr, "[DONE]") {
		t.Errorf("expected response to contain '[DONE]', got '%s'", bodyStr)
	}
}

func TestGetChatSessions(t *testing.T) {
	mock := &mockChatService{
		getSessionsFn: func(ctx context.Context, userID uint, limit, offset int) ([]model.ChatSession, error) {
			return []model.ChatSession{
				{ID: 1, Title: "查询螺纹钢价格", MessageCount: 5},
				{ID: 2, Title: "热卷报价咨询", MessageCount: 3},
			}, nil
		},
	}
	router := setupChatRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/chat/sessions", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int                 `json:"code"`
		Message string              `json:"message"`
		Data    []model.ChatSession `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 sessions, got %d", len(resp.Data))
	}
}

// ---------- StopGeneration ----------

func TestStopGeneration_Success(t *testing.T) {
	mock := &mockChatService{
		stopGenerationFn: func(ctx context.Context, userID uint, sessionID uint) error {
			return nil
		},
	}
	router := setupChatRouter(mock)

	body := `{"session_id": 1}`
	req, _ := http.NewRequest("POST", "/api/v1/chat/stop", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestStopGeneration_NoBody(t *testing.T) {
	mock := &mockChatService{}
	router := setupChatRouter(mock)

	req, _ := http.NewRequest("POST", "/api/v1/chat/stop", nil)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Code != 40001 {
		t.Errorf("expected code 40001, got %d", resp.Code)
	}
}

// ---------- ContinueGeneration ----------

func TestContinueGeneration_Success(t *testing.T) {
	mock := &mockChatService{
		continueGenerationFn: func(ctx context.Context, userID uint, sessionID uint) (<-chan string, error) {
			ch := make(chan string, 2)
			ch <- "data: {\"content\": \"继续输出内容\"}\n\n"
			ch <- "data: [DONE]\n\n"
			close(ch)
			return ch, nil
		},
	}
	router := setupChatRouter(mock)

	server := httptest.NewServer(router)
	defer server.Close()

	body := `{"session_id": 1}`
	resp, err := http.Post(server.URL+"/api/v1/chat/continue", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatalf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType != "text/event-stream" {
		t.Errorf("expected Content-Type 'text/event-stream', got '%s'", contentType)
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	bodyStr := string(respBody)
	if !strings.Contains(bodyStr, "继续输出内容") {
		t.Errorf("expected response to contain '继续输出内容', got '%s'", bodyStr)
	}
	if !strings.Contains(bodyStr, "[DONE]") {
		t.Errorf("expected response to contain '[DONE]', got '%s'", bodyStr)
	}
}

// ---------- SubmitFeedback ----------

func TestSubmitFeedback_Helpful(t *testing.T) {
	mock := &mockChatService{
		submitFeedbackFn: func(ctx context.Context, userID uint, messageID uint, isHelpful bool, comment string) error {
			return nil
		},
	}
	router := setupChatRouter(mock)

	body := `{"message_id": 10, "is_helpful": true}`
	req, _ := http.NewRequest("POST", "/api/v1/chat/feedback", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestSubmitFeedback_NotHelpful(t *testing.T) {
	mock := &mockChatService{
		submitFeedbackFn: func(ctx context.Context, userID uint, messageID uint, isHelpful bool, comment string) error {
			return nil
		},
	}
	router := setupChatRouter(mock)

	body := `{"message_id": 11, "is_helpful": false, "comment": "数据不准确"}`
	req, _ := http.NewRequest("POST", "/api/v1/chat/feedback", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
}

// ---------- DeleteSession ----------

func TestDeleteSession_Success(t *testing.T) {
	mock := &mockChatService{
		deleteSessionFn: func(ctx context.Context, userID uint, sessionID uint) error {
			return nil
		},
	}
	router := setupChatRouter(mock)

	req, _ := http.NewRequest("DELETE", "/api/v1/chat/sessions/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
}

func TestDeleteSession_InvalidID(t *testing.T) {
	mock := &mockChatService{}
	router := setupChatRouter(mock)

	req, _ := http.NewRequest("DELETE", "/api/v1/chat/sessions/abc", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Code != 40001 {
		t.Errorf("expected code 40001, got %d", resp.Code)
	}
}

// ---------- GetSessionMessages ----------

func TestGetSessionMessages_Success(t *testing.T) {
	mock := &mockChatService{
		getMessagesFn: func(ctx context.Context, userID uint, sessionID uint) ([]model.ChatMessage, error) {
			return []model.ChatMessage{
				{ID: 1, SessionID: 1, Role: "user", Content: "螺纹钢价格", Tokens: 5},
				{ID: 2, SessionID: 1, Role: "assistant", Content: "当前螺纹钢价格...", Tokens: 50},
			}, nil
		},
	}
	router := setupChatRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/chat/sessions/1/messages", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp struct {
		Code    int                 `json:"code"`
		Message string              `json:"message"`
		Data    []model.ChatMessage `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 messages, got %d", len(resp.Data))
	}
}

func TestGetSessionMessages_InvalidID(t *testing.T) {
	mock := &mockChatService{}
	router := setupChatRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/chat/sessions/abc/messages", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Code != 40001 {
		t.Errorf("expected code 40001, got %d", resp.Code)
	}
}
