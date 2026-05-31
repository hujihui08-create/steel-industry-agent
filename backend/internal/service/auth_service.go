package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"strings"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
	"steel-agent-backend/pkg/jwt"
	"steel-agent-backend/pkg/sms"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type smsConfig struct {
	enabled      bool
	accessKey    string
	accessSecret string
}

const smsCodeTTL = 5 * time.Minute

type AuthService struct {
	userRepo          *repository.UserRepository
	redisClient       redis.UniversalClient
	adminSettingsRepo *repository.AdminSettingsRepository
}

func NewAuthService(userRepo *repository.UserRepository, redisClient redis.UniversalClient, adminSettingsRepo *repository.AdminSettingsRepository) *AuthService {
	return &AuthService{userRepo: userRepo, redisClient: redisClient, adminSettingsRepo: adminSettingsRepo}
}

func (s *AuthService) getSMSConfig(ctx context.Context) *smsConfig {
	if s.adminSettingsRepo == nil {
		return nil
	}
	settings, err := s.adminSettingsRepo.Get(ctx)
	if err != nil || settings == nil {
		return nil
	}

	var enabled bool
	switch v := settings.SettingsData["smsEnabled"].(type) {
	case bool:
		enabled = v
	case float64:
		enabled = v != 0
	case int:
		enabled = v != 0
	}

	accessKey, _ := settings.SettingsData["smsAccessKey"].(string)
	accessSecret, _ := settings.SettingsData["smsAccessSecret"].(string)

	return &smsConfig{
		enabled:      enabled,
		accessKey:    strings.TrimSpace(accessKey),
		accessSecret: strings.TrimSpace(accessSecret),
	}
}

// SendSMSCode sends a one-time SMS verification code to the given phone number
// and stores it in Redis with a 5-minute TTL.
func (s *AuthService) SendSMSCode(ctx context.Context, phone string) error {
	if s.adminSettingsRepo == nil {
		rng := rand.New(rand.NewSource(time.Now().UnixNano()))
		code := fmt.Sprintf("%06d", rng.Intn(1000000))
		fmt.Printf("SMS code (no settings access) for %s: %s\n", phone, code)
		if s.redisClient != nil {
			key := fmt.Sprintf("sms_code:%s", phone)
			_ = s.redisClient.Set(ctx, key, code, smsCodeTTL)
		}
		return nil
	}

	settings, err := s.adminSettingsRepo.Get(ctx)
	if err != nil || settings == nil {
		rng := rand.New(rand.NewSource(time.Now().UnixNano()))
		code := fmt.Sprintf("%06d", rng.Intn(1000000))
		fmt.Printf("SMS code (settings unavailable) for %s: %s\n", phone, code)
		if s.redisClient != nil {
			key := fmt.Sprintf("sms_code:%s", phone)
			_ = s.redisClient.Set(ctx, key, code, smsCodeTTL)
		}
		return nil
	}

	enabled := false
	switch v := settings.SettingsData["smsEnabled"].(type) {
	case bool:
		enabled = v
	case float64:
		enabled = v != 0
	case int:
		enabled = v != 0
	}

	accessKey, _ := settings.SettingsData["smsAccessKey"].(string)
	accessSecret, _ := settings.SettingsData["smsAccessSecret"].(string)
	accessKey = strings.TrimSpace(accessKey)
	accessSecret = strings.TrimSpace(accessSecret)
	signName, _ := settings.SettingsData["smsSignName"].(string)
	templateCode, _ := settings.SettingsData["smsTemplateCode"].(string)

	if !enabled || accessKey == "" || accessSecret == "" || signName == "" || templateCode == "" {
		rng := rand.New(rand.NewSource(time.Now().UnixNano()))
		code := fmt.Sprintf("%06d", rng.Intn(1000000))
		fmt.Printf("SMS config incomplete (enabled=%v), code for %s: %s\n", enabled, phone, code)
		if s.redisClient != nil {
			key := fmt.Sprintf("sms_code:%s", phone)
			_ = s.redisClient.Set(ctx, key, code, smsCodeTTL)
		}
		return nil
	}

	smsClient, err := sms.NewSMSService(accessKey, accessSecret)
	if err != nil {
		return fmt.Errorf("短信服务初始化失败: %w", err)
	}

	_, err = smsClient.SendVerificationCode(phone, signName, templateCode)
	if err != nil {
		return err
	}

	return nil
}

// Login authenticates a user by phone number and SMS code, returning access and refresh tokens.
func (s *AuthService) Login(ctx context.Context, phone, code string) (string, string, error) {
	cfg := s.getSMSConfig(ctx)
	if cfg != nil && cfg.enabled && cfg.accessKey != "" && cfg.accessSecret != "" {
		smsClient, err := sms.NewSMSService(cfg.accessKey, cfg.accessSecret)
		if err != nil {
			log.Printf("[SMS] Login: failed to create SMS client: %v", err)
		} else {
			result, err := smsClient.CheckSmsVerifyCode(phone, code)
			if err != nil {
				return "", "", fmt.Errorf("验证码核验失败，请稍后重试")
			}
			if !result.Passed {
				return "", "", errors.New("验证码错误")
			}
			goto findUser
		}
	}

	if s.redisClient != nil {
		key := fmt.Sprintf("sms_code:%s", phone)
		storedCode, err := s.redisClient.Get(ctx, key).Result()
		if err != nil {
			return "", "", errors.New("验证码无效或已过期")
		}
		if storedCode != code {
			return "", "", errors.New("验证码错误")
		}
		s.redisClient.Del(ctx, key)
	}

findUser:
	user, err := s.userRepo.FindByPhone(ctx, phone)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			nickname := "用户" + phone[7:]
			user = &model.User{
				Phone:        phone,
				PasswordHash: "",
				Nickname:     nickname,
				Role:         "user",
			}
			if err := s.userRepo.Create(ctx, user); err != nil {
				return "", "", fmt.Errorf("自动注册失败: %w", err)
			}
		} else {
			return "", "", err
		}
	}

	accessToken, err := jwt.GenerateAccessToken(user.ID, "user", 0)
	if err != nil {
		return "", "", err
	}

	refreshToken, err := jwt.GenerateRefreshToken(user.ID, "user")
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

// LoginPassword authenticates a user by phone number and password, returning access and refresh tokens.
func (s *AuthService) LoginPassword(ctx context.Context, phone, password string) (string, string, error) {
	user, err := s.userRepo.FindByPhone(ctx, phone)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", "", errors.New("用户不存在或密码错误")
		}
		return "", "", err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", "", errors.New("用户不存在或密码错误")
	}

	// sessionTimeout can be passed from admin_settings; 0 falls back to env var
	accessToken, err := jwt.GenerateAccessToken(user.ID, "user", 0)
	if err != nil {
		return "", "", err
	}

	refreshToken, err := jwt.GenerateRefreshToken(user.ID, "user")
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

// Register creates a new user account and returns access and refresh tokens.
func (s *AuthService) Register(ctx context.Context, phone, password, code, nickname string) (string, string, error) {
	cfg := s.getSMSConfig(ctx)
	if cfg != nil && cfg.enabled && cfg.accessKey != "" && cfg.accessSecret != "" {
		smsClient, err := sms.NewSMSService(cfg.accessKey, cfg.accessSecret)
		if err != nil {
			log.Printf("[SMS] Register: failed to create SMS client: %v", err)
		} else {
			result, err := smsClient.CheckSmsVerifyCode(phone, code)
			if err != nil {
				return "", "", fmt.Errorf("验证码核验失败，请稍后重试")
			}
			if !result.Passed {
				return "", "", errors.New("验证码错误")
			}
			goto createUser
		}
	}

	if s.redisClient != nil {
		key := fmt.Sprintf("sms_code:%s", phone)
		storedCode, err := s.redisClient.Get(ctx, key).Result()
		if err != nil {
			return "", "", errors.New("验证码无效或已过期")
		}
		if storedCode != code {
			return "", "", errors.New("验证码错误")
		}
		s.redisClient.Del(ctx, key)
	}

createUser:

	_, err := s.userRepo.FindByPhone(ctx, phone)
	if err == nil {
		return "", "", errors.New("手机号已注册")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", "", err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", "", err
	}

	user := &model.User{
		Phone:        phone,
		PasswordHash: string(hashedPassword),
		Nickname:     nickname,
		Role:         "user",
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return "", "", err
	}

	// sessionTimeout can be passed from admin_settings; 0 falls back to env var
	accessToken, err := jwt.GenerateAccessToken(user.ID, "user", 0)
	if err != nil {
		return "", "", err
	}

	refreshToken, err := jwt.GenerateRefreshToken(user.ID, "user")
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

// RefreshToken validates the refresh token and issues new access and refresh tokens.
func (s *AuthService) RefreshToken(ctx context.Context, oldToken string) (string, string, error) {
	// Check if the refresh token is blacklisted (skip if Redis unavailable)
	if s.redisClient != nil {
		hash := hashToken(oldToken)
		blacklistKey := fmt.Sprintf("refresh_token_blacklist:%s", hash)
		exists, err := s.redisClient.Exists(ctx, blacklistKey).Result()
		if err != nil {
			return "", "", fmt.Errorf("redis error: %w", err)
		}
		if exists > 0 {
			return "", "", errors.New("令牌已被撤销")
		}
	}

	claims, err := jwt.ParseTokenWithType(oldToken, "refresh")
	if err != nil {
		return "", "", errors.New("令牌无效或已过期")
	}

	// ============ KEY FIX: SIMPLER APPROACH ============
	// The frontend's Axios interceptor (client.ts:L128-L139) expects the refresh
	// endpoint to return BOTH access_token AND refresh_token. However, the old
	// backend code only returned access_token, causing the frontend to fail with
	// "Refresh response missing tokens" and clear auth state.
	//
	// Fix: also generate a new refresh token and return both tokens.
	// This implements refresh token rotation for better security.
	_ = s.RevokeRefreshToken(ctx, oldToken)

	accessToken, err := jwt.GenerateAccessToken(claims.UserID, claims.Role, 0)
	if err != nil {
		return "", "", err
	}

	refreshToken, err := jwt.GenerateRefreshToken(claims.UserID, claims.Role)
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

// RevokeRefreshToken adds a refresh token to the blacklist in Redis.
func (s *AuthService) RevokeRefreshToken(ctx context.Context, tokenString string) error {
	if s.redisClient == nil {
		return nil
	}
	hash := hashToken(tokenString)
	blacklistKey := fmt.Sprintf("refresh_token_blacklist:%s", hash)
	// TTL = 7 days, matching refresh token expiry
	return s.redisClient.Set(ctx, blacklistKey, "1", 7*24*time.Hour).Err()
}

// Logout invalidates a refresh token by adding it to the blacklist.
func (s *AuthService) Logout(ctx context.Context, tokenString string) error {
	return s.RevokeRefreshToken(ctx, tokenString)
}

// hashToken creates a SHA-256 hash of the token for use as a blacklist key.
func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
