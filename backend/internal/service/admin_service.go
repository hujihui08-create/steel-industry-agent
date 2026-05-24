package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
	"steel-agent-backend/pkg/jwt"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var validAdminRoles = map[string]bool{
	"super_admin": true,
	"operator":    true,
	"data_admin":  true,
	"viewer":      true,
}

const maxLoginAttempts = 5
const lockDuration = 30 * time.Minute

// AdminService handles admin management business logic.
type AdminService struct {
	adminRepo *repository.AdminRepository
	userRepo  *repository.UserRepository
}

// NewAdminService creates a new AdminService with the given admin repository.
func NewAdminService(adminRepo *repository.AdminRepository, userRepo *repository.UserRepository) *AdminService {
	return &AdminService{adminRepo: adminRepo, userRepo: userRepo}
}

// Login authenticates an admin by username and password, returning a JWT token.
func (s *AdminService) Login(ctx context.Context, username, password string) (string, error) {
	admin, err := s.adminRepo.FindByUsername(ctx, username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", errors.New("用户名或密码错误")
		}
		return "", err
	}

	if admin.Status != 1 {
		return "", errors.New("账号已被禁用")
	}

	if admin.LockedUntil != nil && time.Now().Before(*admin.LockedUntil) {
		remaining := int(time.Until(*admin.LockedUntil).Minutes())
		if remaining < 1 {
			remaining = 1
		}
		return "", fmt.Errorf("账号已被锁定，请 %d 分钟后再试", remaining)
	}

	if admin.LockedUntil != nil && !time.Now().Before(*admin.LockedUntil) {
		_ = s.adminRepo.ResetLoginAttempts(ctx, admin.ID)
		admin.LoginAttempts = 0
		admin.LockedUntil = nil
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(password)); err != nil {
		if uErr := s.adminRepo.IncrementLoginAttempts(ctx, admin.ID); uErr != nil {
			return "", uErr
		}
		admin.LoginAttempts++

		if admin.LoginAttempts >= maxLoginAttempts {
			until := time.Now().Add(lockDuration)
			_ = s.adminRepo.LockAccount(ctx, admin.ID, until)
			return "", errors.New("密码错误次数过多，账号已被锁定 30 分钟")
		}

		remaining := maxLoginAttempts - admin.LoginAttempts
		return "", fmt.Errorf("用户名或密码错误，还剩 %d 次尝试机会", remaining)
	}

	_ = s.adminRepo.ResetLoginAttempts(ctx, admin.ID)

	token, err := jwt.GenerateAccessToken(admin.ID)
	if err != nil {
		return "", err
	}

	now := time.Now()
	admin.LastLoginAt = &now
	_ = s.adminRepo.Update(ctx, admin)

	return token, nil
}

// Logout clears the admin's authentication state.
func (s *AdminService) Logout(ctx context.Context) error {
	return nil
}

// GetInfo returns the admin's information by admin ID.
func (s *AdminService) GetInfo(ctx context.Context, adminID uint) (*model.Admin, error) {
	admin, err := s.adminRepo.FindByID(ctx, adminID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("管理员不存在")
		}
		return nil, err
	}
	return admin, nil
}

// UpdatePassword changes the admin's password after verifying the old password.
func (s *AdminService) UpdatePassword(ctx context.Context, adminID uint, oldPassword, newPassword string) error {
	admin, err := s.adminRepo.FindByID(ctx, adminID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("管理员不存在")
		}
		return err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(oldPassword)); err != nil {
		return errors.New("原密码错误")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	admin.PasswordHash = string(hashedPassword)
	return s.adminRepo.Update(ctx, admin)
}

// Dashboard returns aggregated dashboard statistics including user, quotation, tender, and alert counts.
func (s *AdminService) Dashboard(ctx context.Context) (map[string]int64, error) {
	userCount, err := s.adminRepo.CountUsers(ctx)
	if err != nil {
		return nil, err
	}

	quotationCount, err := s.adminRepo.CountQuotations(ctx)
	if err != nil {
		return nil, err
	}

	tenderCount, err := s.adminRepo.CountTenders(ctx)
	if err != nil {
		return nil, err
	}

	alertCount, err := s.adminRepo.CountAlerts(ctx)
	if err != nil {
		return nil, err
	}

	return map[string]int64{
		"user_count":      userCount,
		"quotation_count": quotationCount,
		"tender_count":    tenderCount,
		"alert_count":     alertCount,
	}, nil
}

func (s *AdminService) ListAdmins(ctx context.Context) ([]model.Admin, error) {
	return s.adminRepo.ListAll(ctx)
}

func (s *AdminService) CreateAdmin(ctx context.Context, username, nickname, password, role string) (*model.Admin, error) {
	if !validAdminRoles[role] {
		return nil, errors.New("无效的角色")
	}

	existing, err := s.adminRepo.FindByUsername(ctx, username)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("用户名已存在")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	admin := &model.Admin{
		Username:     username,
		PasswordHash: string(hashedPassword),
		Nickname:     nickname,
		Role:         role,
		Status:       1,
	}

	if err := s.adminRepo.Create(ctx, admin); err != nil {
		return nil, err
	}

	return admin, nil
}

func (s *AdminService) UpdateAdmin(ctx context.Context, id uint, nickname, role string) error {
	if !validAdminRoles[role] {
		return errors.New("无效的角色")
	}

	admin, err := s.adminRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("管理员不存在")
		}
		return err
	}

	if admin.Role == "super_admin" && role != "super_admin" {
		return errors.New("超级管理员角色不可变更")
	}

	admin.Nickname = nickname
	admin.Role = role

	return s.adminRepo.Update(ctx, admin)
}

func (s *AdminService) DeleteAdmin(ctx context.Context, id uint) error {
	admin, err := s.adminRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("管理员不存在")
		}
		return err
	}

	if admin.Role == "super_admin" {
		return errors.New("超级管理员不可删除")
	}

	return s.adminRepo.Delete(ctx, id)
}

func (s *AdminService) UpdateProfile(ctx context.Context, adminID uint, nickname string) error {
	admin, err := s.adminRepo.FindByID(ctx, adminID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("管理员不存在")
		}
		return err
	}

	return s.adminRepo.UpdateProfile(ctx, admin.ID, nickname)
}

func (s *AdminService) ListMobileUsers(ctx context.Context, keyword string, page, pageSize int) ([]model.User, int64, error) {
	limit := pageSize
	offset := (page - 1) * pageSize
	return s.userRepo.FindAll(ctx, keyword, limit, offset)
}

func (s *AdminService) GetMobileUserDetail(ctx context.Context, id uint) (*model.User, error) {
	return s.userRepo.FindByID(ctx, id)
}

func (s *AdminService) DisableMobileUser(ctx context.Context, id uint) error {
	return s.userRepo.UpdateStatus(ctx, id, 0)
}

func (s *AdminService) EnableMobileUser(ctx context.Context, id uint) error {
	return s.userRepo.UpdateStatus(ctx, id, 1)
}
