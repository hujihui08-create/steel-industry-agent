package repository

import (
	"context"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// UserFavoriteRepository provides data access for user favorites.
type UserFavoriteRepository struct {
	db *gorm.DB
}

// NewUserFavoriteRepository creates a new UserFavoriteRepository with the given database connection.
func NewUserFavoriteRepository(db *gorm.DB) *UserFavoriteRepository {
	return &UserFavoriteRepository{db: db}
}

// Create inserts a new user favorite record.
func (r *UserFavoriteRepository) Create(ctx context.Context, fav *model.UserFavorite) error {
	return r.db.WithContext(ctx).Create(fav).Error
}

// Delete removes a user favorite by user ID and tender ID.
func (r *UserFavoriteRepository) Delete(ctx context.Context, userID, tenderID uint) error {
	return r.db.WithContext(ctx).Where("user_id = ? AND tender_id = ?", userID, tenderID).Delete(&model.UserFavorite{}).Error
}

// FindByUserID finds all favorites for the given user.
func (r *UserFavoriteRepository) FindByUserID(ctx context.Context, userID uint) ([]model.UserFavorite, error) {
	var favorites []model.UserFavorite
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Find(&favorites).Error
	return favorites, err
}
