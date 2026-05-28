package repository

import (
	"context"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// UserRepository provides data access for user accounts.
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new UserRepository with the given database connection.
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create inserts a new user record.
func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

// FindByID finds a user by primary key ID.
func (r *UserRepository) FindByID(ctx context.Context, id uint) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByPhone finds a user by phone number.
func (r *UserRepository) FindByPhone(ctx context.Context, phone string) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).Where("phone = ?", phone).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Update saves changes to an existing user record.
func (r *UserRepository) Update(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

// FindAll returns a paginated list of all users with optional keyword and filter conditions.
func (r *UserRepository) FindAll(ctx context.Context, keyword, status string, roleID uint, dateStart, dateEnd string, limit, offset int) ([]model.User, int64, error) {
	var users []model.User
	var total int64

	query := r.db.WithContext(ctx).Model(&model.User{})
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("nickname ILIKE ? OR phone ILIKE ? OR company ILIKE ?", like, like, like)
	}
	if status != "" {
		switch status {
		case "active":
			query = query.Where("status = ?", 1)
		case "disabled":
			query = query.Where("status = ?", 0)
		default:
			query = query.Where("status = ?", status)
		}
	}
	if roleID > 0 {
		query = query.Where("role_id = ?", roleID)
	}
	if dateStart != "" {
		query = query.Where("created_at >= ?", dateStart)
	}
	if dateEnd != "" {
		query = query.Where("created_at <= ?", dateEnd)
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&users).Error; err != nil {
		return nil, 0, err
	}
	return users, total, nil
}

// UpdateStatus updates the status field of a user.
func (r *UserRepository) UpdateStatus(ctx context.Context, id uint, status int) error {
	return r.db.WithContext(ctx).Model(&model.User{}).Where("id = ?", id).Update("status", status).Error
}

func (r *UserRepository) UpdateIsVerified(ctx context.Context, id uint, verified bool) error {
	return r.db.WithContext(ctx).Model(&model.User{}).Where("id = ?", id).Update("is_verified", verified).Error
}
