package repository

import (
	"context"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// IntentRepository provides data access for intent pattern configurations.
type IntentRepository struct {
	db *gorm.DB
}

// NewIntentRepository creates a new IntentRepository with the given database connection.
func NewIntentRepository(db *gorm.DB) *IntentRepository {
	return &IntentRepository{db: db}
}

// FindAll retrieves all intent configurations ordered by priority descending.
func (r *IntentRepository) FindAll(ctx context.Context) ([]model.Intent, error) {
	var intents []model.Intent
	err := r.db.WithContext(ctx).Order("priority DESC, id ASC").Find(&intents).Error
	return intents, err
}

// FindByCode finds an intent configuration by its unique intent code.
func (r *IntentRepository) FindByCode(ctx context.Context, code string) (*model.Intent, error) {
	var intent model.Intent
	err := r.db.WithContext(ctx).Where("intent_code = ?", code).First(&intent).Error
	if err != nil {
		return nil, err
	}
	return &intent, nil
}

// Create inserts a new intent configuration.
func (r *IntentRepository) Create(ctx context.Context, intent *model.Intent) error {
	return r.db.WithContext(ctx).Create(intent).Error
}

// Update saves changes to an existing intent configuration.
func (r *IntentRepository) Update(ctx context.Context, intent *model.Intent) error {
	return r.db.WithContext(ctx).Save(intent).Error
}

// FindByToolName finds an intent configuration by its tool_name and active status.
func (r *IntentRepository) FindByToolName(ctx context.Context, toolName string) (*model.Intent, error) {
	var intent model.Intent
	err := r.db.WithContext(ctx).Where("tool_name = ? AND is_active = ?", toolName, true).First(&intent).Error
	if err != nil {
		return nil, err
	}
	return &intent, nil
}

// Delete removes an intent configuration by its ID.
func (r *IntentRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.Intent{}).Error
}
