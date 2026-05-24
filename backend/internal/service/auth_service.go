package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
	"steel-agent-backend/pkg/jwt"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const smsCodeTTL = 5 * time.Minute

// AuthService handles authentication and authorization business logic.
type AuthService struct {
	userRepo    *repository.UserRepository
	redisClient redis.UniversalClient
}

// NewAuthService creates a new AuthService with the given user repository and redis client.
func NewAuthService(userRepo *repository.UserRepository, redisClient redis.UniversalClient) *AuthService {
	return &AuthService{userRepo: userRepo, redisClient: redisClient}
}

// SendSMSCode sends a one-time SMS verification code to the given phone number
// and stores it in Redis with a 5-minute TTL.
func (s *AuthService) SendSMSCode(ctx context.Context, phone string) error {
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	code := fmt.Sprintf("%06d", rng.Intn(1000000))

	if s.redisClient != nil {
		key := fmt.Sprintf("sms_code:%s", phone)
		if err := s.redisClient.Set(ctx, key, code, smsCodeTTL).Err(); err != nil {
			return fmt.Errorf("failed to store verification code: %w", err)
		}
	}

	fmt.Printf("SMS code sent to %s: %s\n", phone, code)
	return nil
}

// Login authenticates a user by phone number and SMS code, returning access and refresh tokens.
func (s *AuthService) Login(ctx context.Context, phone, code string) (string, string, error) {
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

	user, err := s.userRepo.FindByPhone(ctx, phone)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", "", errors.New("用户不存在")
		}
		return "", "", err
	}

	accessToken, err := jwt.GenerateAccessToken(user.ID)
	if err != nil {
		return "", "", err
	}

	refreshToken, err := jwt.GenerateRefreshToken(user.ID)
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

	accessToken, err := jwt.GenerateAccessToken(user.ID)
	if err != nil {
		return "", "", err
	}

	refreshToken, err := jwt.GenerateRefreshToken(user.ID)
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

// Register creates a new user account and returns access and refresh tokens.
func (s *AuthService) Register(ctx context.Context, phone, password, code, nickname string) (string, string, error) {
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

	accessToken, err := jwt.GenerateAccessToken(user.ID)
	if err != nil {
		return "", "", err
	}

	refreshToken, err := jwt.GenerateRefreshToken(user.ID)
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

// RefreshToken validates the refresh token and issues a new access token.
func (s *AuthService) RefreshToken(ctx context.Context, oldToken string) (string, error) {
	// Check if the refresh token is blacklisted (skip if Redis unavailable)
	if s.redisClient != nil {
		hash := hashToken(oldToken)
		blacklistKey := fmt.Sprintf("refresh_token_blacklist:%s", hash)
		exists, err := s.redisClient.Exists(ctx, blacklistKey).Result()
		if err != nil {
			return "", fmt.Errorf("redis error: %w", err)
		}
		if exists > 0 {
			return "", errors.New("令牌已被撤销")
		}
	}

	claims, err := jwt.ParseTokenWithType(oldToken, "refresh")
	if err != nil {
		return "", errors.New("令牌无效或已过期")
	}

	accessToken, err := jwt.GenerateAccessToken(claims.UserID)
	if err != nil {
		return "", err
	}

	return accessToken, nil
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
