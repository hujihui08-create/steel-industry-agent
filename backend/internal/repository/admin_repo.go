package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// AdminRepository provides data access for admin user accounts.
type AdminRepository struct {
	db *gorm.DB
}

// NewAdminRepository creates a new AdminRepository with the given database connection.
func NewAdminRepository(db *gorm.DB) *AdminRepository {
	return &AdminRepository{db: db}
}

// FindByUsername finds an admin by username.
func (r *AdminRepository) FindByUsername(ctx context.Context, username string) (*model.Admin, error) {
	var admin model.Admin
	err := r.db.WithContext(ctx).Where("username = ?", username).First(&admin).Error
	if err != nil {
		return nil, err
	}
	return &admin, nil
}

// FindByID finds an admin by primary key ID.
func (r *AdminRepository) FindByID(ctx context.Context, id uint) (*model.Admin, error) {
	var admin model.Admin
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&admin).Error
	if err != nil {
		return nil, err
	}
	return &admin, nil
}

// Update saves changes to an existing admin record.
func (r *AdminRepository) Update(ctx context.Context, admin *model.Admin) error {
	return r.db.WithContext(ctx).Save(admin).Error
}

// UpdatePassword updates the admin's password hash by admin ID.
func (r *AdminRepository) UpdatePassword(ctx context.Context, adminID uint, hash string) error {
	return r.db.WithContext(ctx).Model(&model.Admin{}).Where("id = ?", adminID).Update("password_hash", hash).Error
}

// CountUsers returns the total number of registered users.
func (r *AdminRepository) CountUsers(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.User{}).Count(&count).Error
	return count, err
}

// CountQuotations returns the total number of quotation records.
func (r *AdminRepository) CountQuotations(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.Quotation{}).Count(&count).Error
	return count, err
}

// CountTenders returns the total number of tender records.
func (r *AdminRepository) CountTenders(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.Tender{}).Count(&count).Error
	return count, err
}

// CountAlerts returns the total number of price alert records.
func (r *AdminRepository) CountAlerts(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.PriceAlert{}).Count(&count).Error
	return count, err
}

// CountTodayActiveUsers returns the number of distinct mobile users who have
// successfully logged in today.
func (r *AdminRepository) CountTodayActiveUsers(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.LoginLog{}).
		Where("user_type = ? AND login_type = ? AND created_at >= CURRENT_DATE", "mobile", "success").
		Distinct("user_id").
		Count(&count).Error
	return count, err
}

// CountChatSessions returns the total number of AI chat sessions.
func (r *AdminRepository) CountChatSessions(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.ChatSession{}).Count(&count).Error
	return count, err
}

// CountApiCalls returns the total number of API call log records.
func (r *AdminRepository) CountApiCalls(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.ApiCallLog{}).Count(&count).Error
	return count, err
}

// CountDailyUsers returns the number of distinct mobile users with successful
// logins on a given date (format: "2006-01-02").
func (r *AdminRepository) CountDailyUsers(ctx context.Context, date string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.LoginLog{}).
		Where("user_type = ? AND login_type = ? AND DATE(created_at) = ?", "mobile", "success", date).
		Distinct("user_id").
		Count(&count).Error
	return count, err
}

// CountDailyConversations returns the number of chat sessions created on a
// given date (format: "2006-01-02").
func (r *AdminRepository) CountDailyConversations(ctx context.Context, date string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.ChatSession{}).
		Where("DATE(created_at) = ?", date).
		Count(&count).Error
	return count, err
}

func (r *AdminRepository) ListAll(ctx context.Context) ([]model.Admin, error) {
	var admins []model.Admin
	err := r.db.WithContext(ctx).Select("id", "username", "nickname", "role", "status", "login_attempts", "locked_until", "last_login_at", "created_at", "updated_at").
		Order("created_at DESC").Find(&admins).Error
	return admins, err
}

func (r *AdminRepository) Create(ctx context.Context, admin *model.Admin) error {
	return r.db.WithContext(ctx).Create(admin).Error
}

func (r *AdminRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.Admin{}).Error
}

func (r *AdminRepository) IncrementLoginAttempts(ctx context.Context, adminID uint) error {
	return r.db.WithContext(ctx).Model(&model.Admin{}).Where("id = ?", adminID).
		UpdateColumn("login_attempts", gorm.Expr("login_attempts + 1")).Error
}

func (r *AdminRepository) ResetLoginAttempts(ctx context.Context, adminID uint) error {
	return r.db.WithContext(ctx).Model(&model.Admin{}).Where("id = ?", adminID).
		Updates(map[string]interface{}{"login_attempts": 0, "locked_until": nil}).Error
}

func (r *AdminRepository) LockAccount(ctx context.Context, adminID uint, until time.Time) error {
	return r.db.WithContext(ctx).Model(&model.Admin{}).Where("id = ?", adminID).
		Updates(map[string]interface{}{"locked_until": until, "login_attempts": 0}).Error
}

func (r *AdminRepository) UpdateProfile(ctx context.Context, adminID uint, nickname string) error {
	return r.db.WithContext(ctx).Model(&model.Admin{}).Where("id = ?", adminID).
		Update("nickname", nickname).Error
}
