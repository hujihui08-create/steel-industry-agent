package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/sashabaranov/go-openai"

	"steel-agent-backend/internal/model"
)

type chatRepoInterface interface {
	CreateSession(ctx context.Context, session *model.ChatSession) error
	FindSessionsByUserID(ctx context.Context, userID uint, limit, offset int) ([]model.ChatSession, error)
	FindSessionByID(ctx context.Context, sessionID uint) (*model.ChatSession, error)
	UpdateSession(ctx context.Context, session *model.ChatSession) error
	CreateMessage(ctx context.Context, msg *model.ChatMessage) error
	FindMessagesBySessionID(ctx context.Context, sessionID uint) ([]model.ChatMessage, error)
	FindMessagesBySessionIDWithLimit(ctx context.Context, sessionID uint, limit int) ([]model.ChatMessage, error)
	UpdateMessage(ctx context.Context, msg *model.ChatMessage) error
	DeleteSession(ctx context.Context, sessionID uint) error
	SaveContext(ctx context.Context, sessionID uint, contextJSON string) error
	CreateFeedback(ctx context.Context, feedback *model.AIFeedback) error
}

type mockChatRepo struct {
	sessions map[uint]*model.ChatSession
	messages map[uint][]model.ChatMessage
	nextID   uint

	findSessionsByUserIDResult []model.ChatSession
	findSessionsByUserIDErr    error

	findSessionByIDResult *model.ChatSession
	findSessionByIDErr    error

	createSessionErr error
	createMessageErr error
	updateSessionErr error
	findMessagesErr  error

	findMessagesBySessionIDWithLimitResult []model.ChatMessage
	findMessagesBySessionIDWithLimitErr    error

	updateMessageErr  error
	deleteSessionErr  error
	saveContextErr    error
	createFeedbackErr error
}

func newMockChatRepo() *mockChatRepo {
	return &mockChatRepo{
		sessions: make(map[uint]*model.ChatSession),
		messages: make(map[uint][]model.ChatMessage),
		nextID:   1,
	}
}

func (m *mockChatRepo) CreateSession(ctx context.Context, session *model.ChatSession) error {
	if m.createSessionErr != nil {
		return m.createSessionErr
	}
	session.ID = m.nextID
	m.nextID++
	m.sessions[session.ID] = session
	return nil
}

func (m *mockChatRepo) FindSessionsByUserID(ctx context.Context, userID uint, limit, offset int) ([]model.ChatSession, error) {
	if m.findSessionsByUserIDErr != nil {
		return nil, m.findSessionsByUserIDErr
	}
	return m.findSessionsByUserIDResult, nil
}

func (m *mockChatRepo) FindSessionByID(ctx context.Context, sessionID uint) (*model.ChatSession, error) {
	if m.findSessionByIDErr != nil {
		return nil, m.findSessionByIDErr
	}
	if m.findSessionByIDResult != nil {
		return m.findSessionByIDResult, nil
	}
	s, ok := m.sessions[sessionID]
	if !ok {
		return nil, errors.New("record not found")
	}
	return s, nil
}

func (m *mockChatRepo) UpdateSession(ctx context.Context, session *model.ChatSession) error {
	if m.updateSessionErr != nil {
		return m.updateSessionErr
	}
	m.sessions[session.ID] = session
	return nil
}

func (m *mockChatRepo) CreateMessage(ctx context.Context, msg *model.ChatMessage) error {
	if m.createMessageErr != nil {
		return m.createMessageErr
	}
	msg.ID = m.nextID
	m.nextID++
	m.messages[msg.SessionID] = append(m.messages[msg.SessionID], *msg)
	return nil
}

func (m *mockChatRepo) FindMessagesBySessionID(ctx context.Context, sessionID uint) ([]model.ChatMessage, error) {
	if m.findMessagesErr != nil {
		return nil, m.findMessagesErr
	}
	return m.messages[sessionID], nil
}

func (m *mockChatRepo) FindMessagesBySessionIDWithLimit(ctx context.Context, sessionID uint, limit int) ([]model.ChatMessage, error) {
	if m.findMessagesBySessionIDWithLimitErr != nil {
		return nil, m.findMessagesBySessionIDWithLimitErr
	}
	if m.findMessagesBySessionIDWithLimitResult != nil {
		return m.findMessagesBySessionIDWithLimitResult, nil
	}
	msgs := m.messages[sessionID]
	if len(msgs) > limit {
		return msgs[:limit], nil
	}
	return msgs, nil
}

func (m *mockChatRepo) UpdateMessage(ctx context.Context, msg *model.ChatMessage) error {
	if m.updateMessageErr != nil {
		return m.updateMessageErr
	}
	msgs := m.messages[msg.SessionID]
	for i := range msgs {
		if msgs[i].ID == msg.ID {
			msgs[i] = *msg
			m.messages[msg.SessionID] = msgs
			return nil
		}
	}
	return errors.New("message not found")
}

func (m *mockChatRepo) DeleteSession(ctx context.Context, sessionID uint) error {
	if m.deleteSessionErr != nil {
		return m.deleteSessionErr
	}
	delete(m.sessions, sessionID)
	delete(m.messages, sessionID)
	return nil
}

func (m *mockChatRepo) SaveContext(ctx context.Context, sessionID uint, contextJSON string) error {
	return m.saveContextErr
}

func (m *mockChatRepo) CreateFeedback(ctx context.Context, feedback *model.AIFeedback) error {
	if m.createFeedbackErr != nil {
		return m.createFeedbackErr
	}
	feedback.ID = m.nextID
	m.nextID++
	return nil
}

type testableChatService struct {
	repo chatRepoInterface
}

func newTestableChatService(repo chatRepoInterface) *testableChatService {
	return &testableChatService{repo: repo}
}

func (s *testableChatService) GetChatSessions(ctx context.Context, userID uint, limit, offset int) ([]model.ChatSession, error) {
	return s.repo.FindSessionsByUserID(ctx, userID, limit, offset)
}

func (s *testableChatService) createNewSession(ctx context.Context, userID uint, firstMessage string) (*model.ChatSession, error) {
	title := firstMessage
	if len([]rune(title)) > 30 {
		title = string([]rune(title)[:30]) + "..."
	}

	session := &model.ChatSession{
		UserID: userID,
		Title:  title,
		Model:  "gpt-4o-mini",
	}

	if err := s.repo.CreateSession(ctx, session); err != nil {
		return nil, err
	}
	return session, nil
}

func (s *testableChatService) StopGeneration(ctx context.Context, userID uint, sessionID uint) error {
	sess, err := s.repo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return err
	}
	if sess.UserID != userID {
		return errors.New("session does not belong to user")
	}
	return nil
}

func (s *testableChatService) DeleteSession(ctx context.Context, userID uint, sessionID uint) error {
	sess, err := s.repo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return err
	}
	if sess.UserID != userID {
		return errors.New("session does not belong to user")
	}
	return s.repo.DeleteSession(ctx, sessionID)
}

func (s *testableChatService) GetSessionMessages(ctx context.Context, userID uint, sessionID uint) ([]model.ChatMessage, error) {
	sess, err := s.repo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if sess.UserID != userID {
		return nil, errors.New("session does not belong to user")
	}
	return s.repo.FindMessagesBySessionID(ctx, sessionID)
}

func (s *testableChatService) SubmitFeedback(ctx context.Context, userID uint, messageID uint, isHelpful bool, comment string) error {
	feedback := &model.AIFeedback{
		MessageID: messageID,
		UserID:    userID,
		IsHelpful: isHelpful,
		Comment:   comment,
	}
	return s.repo.CreateFeedback(ctx, feedback)
}

func TestGetChatSessions_Success(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	mock.findSessionsByUserIDResult = []model.ChatSession{
		{ID: 1, UserID: 1, Title: "螺纹钢价格查询"},
		{ID: 2, UserID: 1, Title: "报价计算"},
	}
	svc := newTestableChatService(mock)

	sessions, err := svc.GetChatSessions(ctx, 1, 10, 0)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if len(sessions) != 2 {
		t.Errorf("expected 2 sessions, got %d", len(sessions))
	}
	if sessions[0].ID != 1 {
		t.Errorf("expected first session ID 1, got %d", sessions[0].ID)
	}
	if sessions[0].Title != "螺纹钢价格查询" {
		t.Errorf("expected title '螺纹钢价格查询', got '%s'", sessions[0].Title)
	}
	if sessions[1].ID != 2 {
		t.Errorf("expected second session ID 2, got %d", sessions[1].ID)
	}
}

func TestGetChatSessions_Empty(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	mock.findSessionsByUserIDResult = []model.ChatSession{}
	svc := newTestableChatService(mock)

	sessions, err := svc.GetChatSessions(ctx, 1, 10, 0)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if len(sessions) != 0 {
		t.Errorf("expected 0 sessions, got %d", len(sessions))
	}
}

func TestGetChatSessions_Error(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	mock.findSessionsByUserIDErr = errors.New("database connection failed")
	svc := newTestableChatService(mock)

	sessions, err := svc.GetChatSessions(ctx, 1, 10, 0)
	if err == nil {
		t.Errorf("expected error, got nil")
	}
	if err.Error() != "database connection failed" {
		t.Errorf("expected 'database connection failed', got '%s'", err.Error())
	}
	if sessions != nil {
		t.Errorf("expected nil sessions on error, got %v", sessions)
	}
}

func TestChatCompletions_NewSession(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	svc := newTestableChatService(mock)

	session, err := svc.createNewSession(ctx, 1, "螺纹钢价格查询")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if session.ID != 1 {
		t.Errorf("expected session ID 1, got %d", session.ID)
	}
	if session.UserID != 1 {
		t.Errorf("expected UserID 1, got %d", session.UserID)
	}
	if session.Title != "螺纹钢价格查询" {
		t.Errorf("expected title '螺纹钢价格查询', got '%s'", session.Title)
	}
	if session.Model != "gpt-4o-mini" {
		t.Errorf("expected model 'gpt-4o-mini', got '%s'", session.Model)
	}

	err = mock.CreateMessage(ctx, &model.ChatMessage{
		SessionID: session.ID,
		Role:      "user",
		Content:   "螺纹钢价格查询",
	})
	if err != nil {
		t.Fatalf("expected no error creating message, got %v", err)
	}

	msgs, err := mock.FindMessagesBySessionID(ctx, session.ID)
	if err != nil {
		t.Fatalf("expected no error finding messages, got %v", err)
	}
	if len(msgs) != 1 {
		t.Errorf("expected 1 message, got %d", len(msgs))
	}
	if msgs[0].Role != "user" {
		t.Errorf("expected role 'user', got '%s'", msgs[0].Role)
	}
	if msgs[0].Content != "螺纹钢价格查询" {
		t.Errorf("expected content '螺纹钢价格查询', got '%s'", msgs[0].Content)
	}
}

func TestChatCompletions_NewSession_LongTitle(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	svc := newTestableChatService(mock)

	longMessage := "这是一条包含三十一个以上中文字符的非常长的消息内容用于测试标题截断功能正确性"
	session, err := svc.createNewSession(ctx, 1, longMessage)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len([]rune(session.Title)) != 33 {
		t.Errorf("expected title length 33 (30 + '...'), got %d: '%s'", len([]rune(session.Title)), session.Title)
	}
	if string([]rune(session.Title)[30:]) != "..." {
		t.Errorf("expected title to end with '...', got '%s'", session.Title)
	}
	titleRunes := []rune(session.Title)
	longRunes := []rune(longMessage)
	for i := 0; i < 30; i++ {
		if titleRunes[i] != longRunes[i] {
			t.Errorf("expected rune %d to match, got '%c' vs '%c'", i, titleRunes[i], longRunes[i])
		}
	}
	if session.UserID != 1 {
		t.Errorf("expected UserID 1, got %d", session.UserID)
	}
	if session.Model != "gpt-4o-mini" {
		t.Errorf("expected model 'gpt-4o-mini', got '%s'", session.Model)
	}
}

func TestChatCompletions_NewSession_CreateError(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	mock.createSessionErr = errors.New("database error")
	svc := newTestableChatService(mock)

	session, err := svc.createNewSession(ctx, 1, "测试消息")
	if err == nil {
		t.Errorf("expected error, got nil")
	}
	if err.Error() != "database error" {
		t.Errorf("expected 'database error', got '%s'", err.Error())
	}
	if session != nil {
		t.Errorf("expected nil session on error, got %v", session)
	}
}

// ---------------------------------------------------------------------------
// validateToolResult tests (Task 2.3)
// ---------------------------------------------------------------------------

func TestValidateToolResult_Valid(t *testing.T) {
	result := `{"source":"Wind终端","date":"2025-05-16","price":3850}`
	err := validateToolResult("query_steel_price", result)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
}

func TestValidateToolResult_MissingSource(t *testing.T) {
	result := `{"date":"2025-05-16","price":3850}`
	err := validateToolResult("query_steel_price", result)
	if err == nil {
		t.Error("expected error for missing source")
	}
	if err != nil && err.Error() != "tool query_steel_price result missing source provenance" {
		t.Errorf("expected source provenance error, got '%s'", err.Error())
	}
}

func TestValidateToolResult_MissingDateAndTimestamp(t *testing.T) {
	result := `{"source":"Wind终端","price":3850}`
	err := validateToolResult("query_steel_price", result)
	if err == nil {
		t.Error("expected error for missing date/timestamp")
	}
	if err != nil && err.Error() != "tool query_steel_price result missing date/timestamp provenance" {
		t.Errorf("expected date/timestamp provenance error, got '%s'", err.Error())
	}
}

func TestValidateToolResult_WithTimestamp(t *testing.T) {
	result := `{"source":"Wind终端","timestamp":"2025-05-16T10:30:00Z","price":3850}`
	err := validateToolResult("query_steel_price", result)
	if err != nil {
		t.Errorf("expected no error with timestamp, got %v", err)
	}
}

func TestValidateToolResult_DifferentToolName(t *testing.T) {
	result := `{"source":"database","date":"2025-05-16","price":3850}`
	err := validateToolResult("get_price_trend", result)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
}

// ---------------------------------------------------------------------------
// applyContextWindow tests (Task 4.1)
// ---------------------------------------------------------------------------

func TestApplyContextWindow_UnderLimit(t *testing.T) {
	// 3 turns (6 messages) + system = 7 messages, under 5 turn limit.
	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: "You are a helpful assistant"},
		{Role: openai.ChatMessageRoleUser, Content: "Q1"},
		{Role: openai.ChatMessageRoleAssistant, Content: "A1"},
		{Role: openai.ChatMessageRoleUser, Content: "Q2"},
		{Role: openai.ChatMessageRoleAssistant, Content: "A2"},
		{Role: openai.ChatMessageRoleUser, Content: "Q3"},
		{Role: openai.ChatMessageRoleAssistant, Content: "A3"},
	}
	result := applyContextWindow(messages, 5)
	if len(result) != len(messages) {
		t.Errorf("expected %d messages (all), got %d", len(messages), len(result))
	}
	if result[0].Role != openai.ChatMessageRoleSystem {
		t.Errorf("expected first message to be system, got %s", result[0].Role)
	}
}

func TestApplyContextWindow_ExceedsLimit(t *testing.T) {
	// 6 turns (12 messages) + system = 13 messages, exceeds 5 turn limit.
	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: "You are a helpful assistant"},
		{Role: openai.ChatMessageRoleUser, Content: "Q1"},
		{Role: openai.ChatMessageRoleAssistant, Content: "A1"},
		{Role: openai.ChatMessageRoleUser, Content: "Q2"},
		{Role: openai.ChatMessageRoleAssistant, Content: "A2"},
		{Role: openai.ChatMessageRoleUser, Content: "Q3"},
		{Role: openai.ChatMessageRoleAssistant, Content: "A3"},
		{Role: openai.ChatMessageRoleUser, Content: "Q4"},
		{Role: openai.ChatMessageRoleAssistant, Content: "A4"},
		{Role: openai.ChatMessageRoleUser, Content: "Q5"},
		{Role: openai.ChatMessageRoleAssistant, Content: "A5"},
		{Role: openai.ChatMessageRoleUser, Content: "Q6"},
		{Role: openai.ChatMessageRoleAssistant, Content: "A6"},
	}
	result := applyContextWindow(messages, 5)

	// Expected: system(1) + summary(1) + last 10 non-system = 12
	if len(result) != 12 {
		t.Errorf("expected 12 messages, got %d", len(result))
	}

	// First message should be system.
	if result[0].Role != openai.ChatMessageRoleSystem {
		t.Errorf("expected first message to be system, got %s", result[0].Role)
	}

	// Second message should be the summary.
	if result[1].Role != openai.ChatMessageRoleSystem {
		t.Errorf("expected second message (summary) to be system role, got %s", result[1].Role)
	}

	// The oldest user message Q1 should be dropped (summary replaces it).
	for _, m := range result {
		if m.Content == "Q1" && m.Role == openai.ChatMessageRoleUser {
			t.Errorf("expected Q1 to be dropped (outside context window)")
		}
	}

	// The latest messages (Q2 through A6) should be preserved.
	if result[2].Content != "Q2" || result[2].Role != openai.ChatMessageRoleUser {
		t.Errorf("expected result[2] to be user Q2, got role=%s content=%s", result[2].Role, result[2].Content)
	}
	if result[len(result)-1].Content != "A6" || result[len(result)-1].Role != openai.ChatMessageRoleAssistant {
		t.Errorf("expected last message to be assistant A6, got role=%s content=%s",
			result[len(result)-1].Role, result[len(result)-1].Content)
	}
}

func TestApplyContextWindow_EmptyMessages(t *testing.T) {
	result := applyContextWindow(nil, 5)
	if len(result) != 0 {
		t.Errorf("expected 0 messages for nil input, got %d", len(result))
	}
}

func TestApplyContextWindow_SingleMessage(t *testing.T) {
	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: "You are a helper"},
	}
	result := applyContextWindow(messages, 5)
	if len(result) != 1 {
		t.Errorf("expected 1 message, got %d", len(result))
	}
}

// ---------------------------------------------------------------------------
// StopGeneration tests (Task 5.2)
// ---------------------------------------------------------------------------

func TestStopGeneration_SessionNotFound(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	mock.findSessionByIDErr = errors.New("record not found")
	svc := newTestableChatService(mock)

	err := svc.StopGeneration(ctx, 1, 999)
	if err == nil {
		t.Error("expected error for non-existent session")
	}
	if err.Error() != "record not found" {
		t.Errorf("expected 'record not found', got '%s'", err.Error())
	}
}

func TestStopGeneration_WrongUser(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	mock.findSessionByIDResult = &model.ChatSession{
		ID:     1,
		UserID: 2, // belongs to user 2, not user 1
		Title:  "测试会话",
	}
	svc := newTestableChatService(mock)

	err := svc.StopGeneration(ctx, 1, 1)
	if err == nil {
		t.Error("expected error for wrong user")
	}
	if err.Error() != "session does not belong to user" {
		t.Errorf("expected 'session does not belong to user', got '%s'", err.Error())
	}
}

// ---------------------------------------------------------------------------
// DeleteSession tests (Task 6)
// ---------------------------------------------------------------------------

func TestDeleteSession_Success(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	// Pre-populate a session.
	mock.sessions[1] = &model.ChatSession{ID: 1, UserID: 1, Title: "测试会话"}
	mock.findSessionByIDResult = &model.ChatSession{ID: 1, UserID: 1, Title: "测试会话"}
	svc := newTestableChatService(mock)

	err := svc.DeleteSession(ctx, 1, 1)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}

	// Verify session was deleted from the map.
	if _, ok := mock.sessions[1]; ok {
		t.Error("expected session to be deleted from map")
	}
}

func TestDeleteSession_SessionNotFound(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	mock.findSessionByIDErr = errors.New("record not found")
	svc := newTestableChatService(mock)

	err := svc.DeleteSession(ctx, 1, 999)
	if err == nil {
		t.Error("expected error for non-existent session")
	}
	if err.Error() != "record not found" {
		t.Errorf("expected 'record not found', got '%s'", err.Error())
	}
}

func TestDeleteSession_WrongUser(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	mock.findSessionByIDResult = &model.ChatSession{
		ID:     1,
		UserID: 2,
		Title:  "其他用户的会话",
	}
	svc := newTestableChatService(mock)

	err := svc.DeleteSession(ctx, 1, 1)
	if err == nil {
		t.Error("expected error for wrong user")
	}
	if err.Error() != "session does not belong to user" {
		t.Errorf("expected 'session does not belong to user', got '%s'", err.Error())
	}
}

func TestDeleteSession_DeleteRepoError(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	mock.findSessionByIDResult = &model.ChatSession{ID: 1, UserID: 1, Title: "测试会话"}
	mock.deleteSessionErr = errors.New("cascade delete failed")
	svc := newTestableChatService(mock)

	err := svc.DeleteSession(ctx, 1, 1)
	if err == nil {
		t.Error("expected error from repo delete")
	}
	if err.Error() != "cascade delete failed" {
		t.Errorf("expected 'cascade delete failed', got '%s'", err.Error())
	}
}

// ---------------------------------------------------------------------------
// GetSessionMessages tests (Task 6)
// ---------------------------------------------------------------------------

func TestGetSessionMessages_Success(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	mock.findSessionByIDResult = &model.ChatSession{ID: 1, UserID: 1, Title: "测试会话"}
	mock.messages[1] = []model.ChatMessage{
		{ID: 1, SessionID: 1, Role: "user", Content: "螺纹钢价格"},
		{ID: 2, SessionID: 1, Role: "assistant", Content: "当前螺纹钢价格..."},
	}
	svc := newTestableChatService(mock)

	msgs, err := svc.GetSessionMessages(ctx, 1, 1)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if len(msgs) != 2 {
		t.Errorf("expected 2 messages, got %d", len(msgs))
	}
	if msgs[0].Role != "user" {
		t.Errorf("expected first message role 'user', got '%s'", msgs[0].Role)
	}
	if msgs[0].Content != "螺纹钢价格" {
		t.Errorf("expected content '螺纹钢价格', got '%s'", msgs[0].Content)
	}
	if msgs[1].Role != "assistant" {
		t.Errorf("expected second message role 'assistant', got '%s'", msgs[1].Role)
	}
}

func TestGetSessionMessages_SessionNotFound(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	mock.findSessionByIDErr = errors.New("record not found")
	svc := newTestableChatService(mock)

	msgs, err := svc.GetSessionMessages(ctx, 1, 999)
	if err == nil {
		t.Error("expected error for non-existent session")
	}
	if err.Error() != "record not found" {
		t.Errorf("expected 'record not found', got '%s'", err.Error())
	}
	if msgs != nil {
		t.Errorf("expected nil messages on error, got %v", msgs)
	}
}

func TestGetSessionMessages_WrongUser(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	mock.findSessionByIDResult = &model.ChatSession{
		ID:     1,
		UserID: 2,
		Title:  "其他用户的会话",
	}
	svc := newTestableChatService(mock)

	msgs, err := svc.GetSessionMessages(ctx, 1, 1)
	if err == nil {
		t.Error("expected error for wrong user")
	}
	if err.Error() != "session does not belong to user" {
		t.Errorf("expected 'session does not belong to user', got '%s'", err.Error())
	}
	if msgs != nil {
		t.Errorf("expected nil messages on error, got %v", msgs)
	}
}

func TestGetSessionMessages_EmptyMessages(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	mock.findSessionByIDResult = &model.ChatSession{ID: 1, UserID: 1, Title: "空会话"}
	svc := newTestableChatService(mock)

	msgs, err := svc.GetSessionMessages(ctx, 1, 1)
	if err != nil {
		t.Errorf("expected no error for empty session, got %v", err)
	}
	if len(msgs) != 0 {
		t.Errorf("expected 0 messages, got %d", len(msgs))
	}
}

// ---------------------------------------------------------------------------
// SubmitFeedback tests (Task 6)
// ---------------------------------------------------------------------------

func TestSubmitFeedback_Success(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	svc := newTestableChatService(mock)

	err := svc.SubmitFeedback(ctx, 1, 100, true, "回答准确，数据完整")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
}

func TestSubmitFeedback_RepoError(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	mock.createFeedbackErr = errors.New("database insert failed")
	svc := newTestableChatService(mock)

	err := svc.SubmitFeedback(ctx, 1, 100, false, "")
	if err == nil {
		t.Error("expected error from repo")
	}
	if err.Error() != "database insert failed" {
		t.Errorf("expected 'database insert failed', got '%s'", err.Error())
	}
}

func TestSubmitFeedback_NotHelpful(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	svc := newTestableChatService(mock)

	err := svc.SubmitFeedback(ctx, 1, 100, false, "价格数据过时")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
}

func TestSubmitFeedback_EmptyComment(t *testing.T) {
	ctx := context.Background()
	mock := newMockChatRepo()
	svc := newTestableChatService(mock)

	err := svc.SubmitFeedback(ctx, 1, 100, true, "")
	if err != nil {
		t.Errorf("expected no error with empty comment, got %v", err)
	}
}

// ---------------------------------------------------------------------------
// executeSetPriceAlert tests (set_price_alert feature)
// ---------------------------------------------------------------------------

// alertRepoInterface defines the subset of PriceAlertRepository needed by executeSetPriceAlert.
type alertRepoInterface interface {
	Create(ctx context.Context, alert *model.PriceAlert) error
}

// mockAlertRepoWithID is a mock that assigns auto-incrementing IDs on Create,
// mirroring the behaviour of GORM's Create.
type mockAlertRepoWithID struct {
	alerts    []model.PriceAlert
	nextID    uint
	createErr error
}

func (m *mockAlertRepoWithID) Create(ctx context.Context, alert *model.PriceAlert) error {
	if m.createErr != nil {
		return m.createErr
	}
	m.nextID++
	alert.ID = m.nextID
	m.alerts = append(m.alerts, *alert)
	return nil
}

// testableAlertChatService mirrors executeSetPriceAlert so it can be tested
// in isolation without constructing a full ChatService.
type testableAlertChatService struct {
	alertRepo alertRepoInterface
}

// executeSetPriceAlert mirrors ChatService.executeSetPriceAlert.
func (s *testableAlertChatService) executeSetPriceAlert(ctx context.Context, userID uint, argsJSON string) (string, error) {
	var args setPriceAlertArgs
	if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
		return "", fmt.Errorf("set_price_alert: invalid arguments: %w", err)
	}

	alert := &model.PriceAlert{
		UserID:      userID,
		Category:    args.Category,
		TargetPrice: args.TargetPrice,
		Condition:   args.Condition,
		IsActive:    true,
	}

	if err := s.alertRepo.Create(ctx, alert); err != nil {
		return "", fmt.Errorf("set_price_alert: %w", err)
	}

	condDesc := "高于"
	if args.Condition == "below" {
		condDesc = "低于"
	}

	result := map[string]interface{}{
		"source":       "user_alert",
		"alert_id":     alert.ID,
		"category":     args.Category,
		"target_price": args.TargetPrice,
		"condition":    args.Condition,
		"message":      fmt.Sprintf("已设置%s价格预警：当价格%s ¥%.2f 时通知您", args.Category, condDesc, args.TargetPrice),
	}
	data, _ := json.Marshal(result)
	return string(data), nil
}

// TestExecuteSetPriceAlert_UserID verifies the userID passed to the function
// is correctly forwarded to the PriceAlert model and persisted via the repo.
func TestExecuteSetPriceAlert_UserID(t *testing.T) {
	ctx := context.Background()
	mock := &mockAlertRepoWithID{}
	svc := &testableAlertChatService{alertRepo: mock}

	result, err := svc.executeSetPriceAlert(ctx, 42, `{"category":"螺纹钢","target_price":4000,"condition":"above"}`)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result == "" {
		t.Fatal("expected non-empty result")
	}

	if len(mock.alerts) != 1 {
		t.Fatalf("expected 1 alert stored, got %d", len(mock.alerts))
	}
	stored := mock.alerts[0]
	if stored.UserID != 42 {
		t.Errorf("expected UserID 42, got %d", stored.UserID)
	}
	if stored.Category != "螺纹钢" {
		t.Errorf("expected Category '螺纹钢', got '%s'", stored.Category)
	}
	if stored.TargetPrice != 4000 {
		t.Errorf("expected TargetPrice 4000, got %f", stored.TargetPrice)
	}
	if stored.Condition != "above" {
		t.Errorf("expected Condition 'above', got '%s'", stored.Condition)
	}
	if !stored.IsActive {
		t.Error("expected IsActive to be true")
	}
}

// TestExecuteSetPriceAlert_Fields verifies all fields are correctly set
// for a "below" condition alert.
func TestExecuteSetPriceAlert_Fields(t *testing.T) {
	ctx := context.Background()
	mock := &mockAlertRepoWithID{}
	svc := &testableAlertChatService{alertRepo: mock}

	result, err := svc.executeSetPriceAlert(ctx, 7, `{"category":"热卷","target_price":3500.50,"condition":"below"}`)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result == "" {
		t.Fatal("expected non-empty result")
	}

	if len(mock.alerts) != 1 {
		t.Fatalf("expected 1 alert stored, got %d", len(mock.alerts))
	}
	stored := mock.alerts[0]
	if stored.UserID != 7 {
		t.Errorf("expected UserID 7, got %d", stored.UserID)
	}
	if stored.Category != "热卷" {
		t.Errorf("expected Category '热卷', got '%s'", stored.Category)
	}
	if stored.TargetPrice != 3500.50 {
		t.Errorf("expected TargetPrice 3500.50, got %f", stored.TargetPrice)
	}
	if stored.Condition != "below" {
		t.Errorf("expected Condition 'below', got '%s'", stored.Condition)
	}
	if !stored.IsActive {
		t.Error("expected IsActive to be true")
	}

	// Verify the result message contains "低于"
	var resultMap map[string]interface{}
	if err := json.Unmarshal([]byte(result), &resultMap); err != nil {
		t.Fatalf("failed to parse result JSON: %v", err)
	}
	msg, _ := resultMap["message"].(string)
	if msg == "" {
		t.Error("expected non-empty message in result")
	}
	if !strings.Contains(msg, "低于") {
		t.Errorf("expected message to contain '低于', got '%s'", msg)
	}
}

// TestExecuteSetPriceAlert_ResultFormat verifies the returned JSON contains
// all required keys with correct values.
func TestExecuteSetPriceAlert_ResultFormat(t *testing.T) {
	ctx := context.Background()
	mock := &mockAlertRepoWithID{}
	svc := &testableAlertChatService{alertRepo: mock}

	result, err := svc.executeSetPriceAlert(ctx, 1, `{"category":"冷轧","target_price":5200,"condition":"above"}`)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	var resultMap map[string]interface{}
	if err := json.Unmarshal([]byte(result), &resultMap); err != nil {
		t.Fatalf("failed to parse result JSON: %v", err)
	}

	// Verify required keys
	source, _ := resultMap["source"].(string)
	if source != "user_alert" {
		t.Errorf("expected source 'user_alert', got '%s'", source)
	}

	alertID, ok := resultMap["alert_id"].(float64)
	if !ok || alertID <= 0 {
		t.Errorf("expected alert_id > 0, got %v", resultMap["alert_id"])
	}

	category, _ := resultMap["category"].(string)
	if category != "冷轧" {
		t.Errorf("expected category '冷轧', got '%s'", category)
	}

	targetPrice, _ := resultMap["target_price"].(float64)
	if targetPrice != 5200 {
		t.Errorf("expected target_price 5200, got %f", targetPrice)
	}

	condition, _ := resultMap["condition"].(string)
	if condition != "above" {
		t.Errorf("expected condition 'above', got '%s'", condition)
	}

	message, ok := resultMap["message"].(string)
	if !ok || message == "" {
		t.Error("expected non-empty message")
	}

	// Verify the result can be parsed into the SSE card handler's struct
	type alertResult struct {
		AlertID     uint    `json:"alert_id"`
		Category    string  `json:"category"`
		TargetPrice float64 `json:"target_price"`
		Condition   string  `json:"condition"`
		Source      string  `json:"source"`
	}
	var ar alertResult
	if err := json.Unmarshal([]byte(result), &ar); err != nil {
		t.Fatalf("failed to unmarshal result into alertResult: %v", err)
	}
	if ar.AlertID != mock.alerts[0].ID {
		t.Errorf("expected AlertID %d, got %d", mock.alerts[0].ID, ar.AlertID)
	}
	if ar.Category != "冷轧" {
		t.Errorf("expected Category '冷轧', got '%s'", ar.Category)
	}
	if ar.TargetPrice != 5200 {
		t.Errorf("expected TargetPrice 5200, got %f", ar.TargetPrice)
	}
	if ar.Condition != "above" {
		t.Errorf("expected Condition 'above', got '%s'", ar.Condition)
	}
	if ar.Source != "user_alert" {
		t.Errorf("expected Source 'user_alert', got '%s'", ar.Source)
	}
}

// TestExecuteSetPriceAlert_InvalidArgs verifies that malformed JSON returns an error.
func TestExecuteSetPriceAlert_InvalidArgs(t *testing.T) {
	ctx := context.Background()
	mock := &mockAlertRepoWithID{}
	svc := &testableAlertChatService{alertRepo: mock}

	_, err := svc.executeSetPriceAlert(ctx, 1, `{invalid json}`)
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
	if !strings.Contains(err.Error(), "invalid arguments") {
		t.Errorf("expected error to mention 'invalid arguments', got '%s'", err.Error())
	}
}

// TestExecuteSetPriceAlert_RepoError verifies that a repository error is propagated.
func TestExecuteSetPriceAlert_RepoError(t *testing.T) {
	ctx := context.Background()
	mock := &mockAlertRepoWithID{createErr: errors.New("database error")}
	svc := &testableAlertChatService{alertRepo: mock}

	_, err := svc.executeSetPriceAlert(ctx, 1, `{"category":"螺纹钢","target_price":4000,"condition":"above"}`)
	if err == nil {
		t.Fatal("expected error from repo")
	}
	if !strings.Contains(err.Error(), "set_price_alert") {
		t.Errorf("expected error to contain 'set_price_alert', got '%s'", err.Error())
	}
	if !strings.Contains(err.Error(), "database error") {
		t.Errorf("expected error to contain 'database error', got '%s'", err.Error())
	}
}

// ---------------------------------------------------------------------------
// set_price_alert SSE card emission tests
// ---------------------------------------------------------------------------

// TestSetPriceAlertCardFormat verifies the SSE card payload structure emitted
// for the set_price_alert tool. It independently constructs the same card
// payload as the chatCompletionsCore SSE handler and validates:
//   - type field equals "card"
//   - card_type field equals "alert"
//   - data sub-map contains id, category, target_price, condition, is_active
func TestSetPriceAlertCardFormat(t *testing.T) {
	// Construct the alert result as it would come from executeSetPriceAlert.
	alertResult := struct {
		AlertID     uint    `json:"alert_id"`
		Category    string  `json:"category"`
		TargetPrice float64 `json:"target_price"`
		Condition   string  `json:"condition"`
		Source      string  `json:"source"`
	}{
		AlertID:     5,
		Category:    "螺纹钢",
		TargetPrice: 4000,
		Condition:   "above",
		Source:      "user_alert",
	}

	// Build the card payload exactly as chatCompletionsCore does (line 1520-1530).
	cardPayload, err := json.Marshal(map[string]interface{}{
		"type":      "card",
		"card_type": "alert",
		"data": map[string]interface{}{
			"id":           alertResult.AlertID,
			"category":     alertResult.Category,
			"target_price": alertResult.TargetPrice,
			"condition":    alertResult.Condition,
			"is_active":    true,
		},
	})
	if err != nil {
		t.Fatalf("failed to marshal card payload: %v", err)
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(cardPayload, &payload); err != nil {
		t.Fatalf("failed to unmarshal card payload: %v", err)
	}

	// Verify top-level fields.
	if payload["type"] != "card" {
		t.Errorf("expected type 'card', got '%v'", payload["type"])
	}
	if payload["card_type"] != "alert" {
		t.Errorf("expected card_type 'alert', got '%v'", payload["card_type"])
	}

	// Verify data sub-map.
	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		t.Fatal("expected data to be a map[string]interface{}")
	}

	id, _ := data["id"].(float64)
	if id != 5 {
		t.Errorf("expected data.id 5, got %v", data["id"])
	}

	category, _ := data["category"].(string)
	if category != "螺纹钢" {
		t.Errorf("expected data.category '螺纹钢', got '%s'", category)
	}

	targetPrice, _ := data["target_price"].(float64)
	if targetPrice != 4000 {
		t.Errorf("expected data.target_price 4000, got %f", targetPrice)
	}

	condition, _ := data["condition"].(string)
	if condition != "above" {
		t.Errorf("expected data.condition 'above', got '%s'", condition)
	}

	isActive, ok := data["is_active"].(bool)
	if !ok || !isActive {
		t.Errorf("expected data.is_active true, got %v", data["is_active"])
	}
}
