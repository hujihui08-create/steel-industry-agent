package repository

import (
	"context"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// ChatRepository provides data access for chat sessions and messages.
type ChatRepository struct {
	db *gorm.DB
}

// NewChatRepository creates a new ChatRepository with the given database connection.
func NewChatRepository(db *gorm.DB) *ChatRepository {
	return &ChatRepository{db: db}
}

// CreateSession inserts a new chat session.
func (r *ChatRepository) CreateSession(ctx context.Context, session *model.ChatSession) error {
	return r.db.WithContext(ctx).Create(session).Error
}

// FindSessionsByUserID finds chat sessions belonging to the given user.
func (r *ChatRepository) FindSessionsByUserID(ctx context.Context, userID uint, limit, offset int) ([]model.ChatSession, error) {
	var sessions []model.ChatSession
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("updated_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&sessions).Error
	if err != nil {
		return nil, err
	}
	return sessions, nil
}

// FindRecentSessions returns the most recently updated chat sessions across all users.
func (r *ChatRepository) FindRecentSessions(ctx context.Context, limit int) ([]model.ChatSession, error) {
	var sessions []model.ChatSession
	err := r.db.WithContext(ctx).
		Order("updated_at DESC").
		Limit(limit).
		Find(&sessions).Error
	if err != nil {
		return nil, err
	}
	return sessions, nil
}

// FindSessionByID finds a chat session by its primary key ID.
func (r *ChatRepository) FindSessionByID(ctx context.Context, sessionID uint) (*model.ChatSession, error) {
	var session model.ChatSession
	err := r.db.WithContext(ctx).Where("id = ?", sessionID).First(&session).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

// UpdateSession saves changes to an existing chat session.
func (r *ChatRepository) UpdateSession(ctx context.Context, session *model.ChatSession) error {
	return r.db.WithContext(ctx).Save(session).Error
}

// CreateMessage inserts a new chat message into the database.
func (r *ChatRepository) CreateMessage(ctx context.Context, msg *model.ChatMessage) error {
	return r.db.WithContext(ctx).Create(msg).Error
}

// FindMessagesBySessionID finds all messages belonging to a chat session ordered by creation time.
func (r *ChatRepository) FindMessagesBySessionID(ctx context.Context, sessionID uint) ([]model.ChatMessage, error) {
	var messages []model.ChatMessage
	err := r.db.WithContext(ctx).
		Where("session_id = ?", sessionID).
		Order("created_at ASC").
		Find(&messages).Error
	if err != nil {
		return nil, err
	}
	return messages, nil
}

// FindMessagesBySessionIDWithLimit finds up to limit messages belonging to a chat session,
// ordered by creation time ASC (oldest first).
func (r *ChatRepository) FindMessagesBySessionIDWithLimit(ctx context.Context, sessionID uint, limit int) ([]model.ChatMessage, error) {
	var messages []model.ChatMessage
	err := r.db.WithContext(ctx).
		Where("session_id = ?", sessionID).
		Order("created_at ASC").
		Limit(limit).
		Find(&messages).Error
	if err != nil {
		return nil, err
	}
	return messages, nil
}

// UpdateMessage saves changes to an existing chat message.
func (r *ChatRepository) UpdateMessage(ctx context.Context, msg *model.ChatMessage) error {
	return r.db.WithContext(ctx).Save(msg).Error
}

// DeleteSession soft-deletes a chat session by its ID (sets deleted_at if using gorm.DeletedAt,
// or simply removes the record if no soft-delete is configured on the model).
// For a hard delete, use r.db.WithContext(ctx).Delete(&model.ChatSession{}, sessionID).
func (r *ChatRepository) DeleteSession(ctx context.Context, sessionID uint) error {
	return r.db.WithContext(ctx).Delete(&model.ChatSession{}, sessionID).Error
}

// SaveContext updates only the context JSON field on a chat session.
func (r *ChatRepository) SaveContext(ctx context.Context, sessionID uint, contextJSON string) error {
	return r.db.WithContext(ctx).
		Model(&model.ChatSession{}).
		Where("id = ?", sessionID).
		Update("context", contextJSON).Error
}

// CreateFeedback inserts a new AI feedback record.
func (r *ChatRepository) CreateFeedback(ctx context.Context, feedback *model.AIFeedback) error {
	return r.db.WithContext(ctx).Create(feedback).Error
}
