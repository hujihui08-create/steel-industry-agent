package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
	"steel-agent-backend/pkg/jwt"
	"steel-agent-backend/pkg/validate"

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

	// sessionTimeout can be passed from admin_settings; 0 falls back to env var
	token, err := jwt.GenerateAccessToken(admin.ID, "admin", 0)
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

// Dashboard returns aggregated dashboard statistics including user, quotation,
// tender, alert, activity, conversation and AI call counts.
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

	todayActive, err := s.adminRepo.CountTodayActiveUsers(ctx)
	if err != nil {
		return nil, err
	}

	totalConversations, err := s.adminRepo.CountChatSessions(ctx)
	if err != nil {
		return nil, err
	}

	aiCalls, err := s.adminRepo.CountApiCalls(ctx)
	if err != nil {
		return nil, err
	}

	return map[string]int64{
		"user_count":          userCount,
		"quotation_count":     quotationCount,
		"tender_count":        tenderCount,
		"alert_count":         alertCount,
		"today_active":        todayActive,
		"total_conversations": totalConversations,
		"ai_calls":            aiCalls,
	}, nil
}

// TrendDataPoint represents a single day's aggregated dashboard trend metrics.
type TrendDataPoint struct {
	Date          string `json:"date"`
	Users         int64  `json:"users"`
	Conversations int64  `json:"conversations"`
}

// DashboardTrend returns daily user and conversation counts for the given
// number of days (up to 30).
func (s *AdminService) DashboardTrend(ctx context.Context, days int) ([]TrendDataPoint, error) {
	if days <= 0 {
		days = 7
	}
	if days > 30 {
		days = 30
	}

	now := time.Now()
	points := make([]TrendDataPoint, 0, days)

	for i := days - 1; i >= 0; i-- {
		date := now.AddDate(0, 0, -i).Format("2006-01-02")

		users, err := s.adminRepo.CountDailyUsers(ctx, date)
		if err != nil {
			return nil, err
		}

		conversations, err := s.adminRepo.CountDailyConversations(ctx, date)
		if err != nil {
			return nil, err
		}

		points = append(points, TrendDataPoint{
			Date:          date[5:], // "MM-DD" format for chart display
			Users:         users,
			Conversations: conversations,
		})
	}

	return points, nil
}

func (s *AdminService) ListAdmins(ctx context.Context) ([]model.Admin, error) {
	return s.adminRepo.ListAll(ctx)
}

func (s *AdminService) CreateAdmin(ctx context.Context, username, nickname, password, role string, status int) (*model.Admin, error) {
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

	if status <= 0 {
		status = 1
	}

	admin := &model.Admin{
		Username:     username,
		PasswordHash: string(hashedPassword),
		Nickname:     nickname,
		Role:         role,
		Status:       status,
	}

	if err := s.adminRepo.Create(ctx, admin); err != nil {
		return nil, err
	}

	return admin, nil
}

func (s *AdminService) UpdateAdmin(ctx context.Context, id uint, nickname, role string, status int) error {
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
	if status > 0 {
		admin.Status = status
	}

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

// GetAdminDetail returns admin details by ID.
func (s *AdminService) GetAdminDetail(ctx context.Context, id uint) (*model.Admin, error) {
	admin, err := s.adminRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("管理员不存在")
		}
		return nil, err
	}
	return admin, nil
}

// DisableAdmin disables an admin account by setting status to 0.
func (s *AdminService) DisableAdmin(ctx context.Context, id uint) error {
	admin, err := s.adminRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("管理员不存在")
		}
		return err
	}

	if admin.Role == "super_admin" {
		return errors.New("超级管理员不可禁用")
	}

	admin.Status = 0
	return s.adminRepo.Update(ctx, admin)
}

// EnableAdmin enables an admin account by setting status to 1.
func (s *AdminService) EnableAdmin(ctx context.Context, id uint) error {
	admin, err := s.adminRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("管理员不存在")
		}
		return err
	}

	admin.Status = 1
	return s.adminRepo.Update(ctx, admin)
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

func (s *AdminService) ListMobileUsers(ctx context.Context, keyword, status string, roleID uint, dateStart, dateEnd string, page, pageSize int) ([]model.User, int64, error) {
	limit := pageSize
	offset := (page - 1) * pageSize
	return s.userRepo.FindAll(ctx, keyword, status, roleID, dateStart, dateEnd, limit, offset)
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

// CreateMobileUser creates a new mobile user with validation.
func (s *AdminService) CreateMobileUser(ctx context.Context, phone, nickname, company, password string, roleID uint, region string) (*model.User, error) {
	if !validate.ValidatePhone(phone) {
		return nil, errors.New("手机号格式不正确")
	}

	existing, err := s.adminRepo.FindUserByPhone(ctx, phone)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("该手机号已注册")
	}

	role, err := s.adminRepo.FindMobileRoleByID(ctx, roleID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("所选角色不存在")
		}
		return nil, err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Phone:        phone,
		PasswordHash: string(hashedPassword),
		Nickname:     nickname,
		Company:      company,
		Role:         role.Name,
		RoleID:       roleID,
		Region:       region,
		Status:       1,
	}

	if err := s.adminRepo.CreateMobileUser(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

// UpdateMobileUser updates an existing mobile user's fields.
func (s *AdminService) UpdateMobileUser(ctx context.Context, id uint, nickname, company string, roleID uint, region string, status int) (*model.User, error) {
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, err
	}

	user.Nickname = nickname
	user.Company = company
	user.Region = region
	user.Status = status

	if roleID > 0 {
		role, err := s.adminRepo.FindMobileRoleByID(ctx, roleID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("所选角色不存在")
			}
			return nil, err
		}
		user.RoleID = roleID
		user.Role = role.Name
	}

	if err := s.adminRepo.UpdateMobileUser(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

// DeleteMobileUser deletes a mobile user by ID.
func (s *AdminService) DeleteMobileUser(ctx context.Context, id uint) error {
	_, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("用户不存在")
		}
		return err
	}

	return s.adminRepo.DeleteMobileUser(ctx, id)
}
