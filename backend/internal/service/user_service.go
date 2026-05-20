package service

import (
	"context"
	"errors"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

// UserService handles user profile business logic.
type UserService struct {
	userRepo *repository.UserRepository
}

// NewUserService creates a new UserService with the given user repository.
func NewUserService(userRepo *repository.UserRepository) *UserService {
	return &UserService{userRepo: userRepo}
}

// GetProfile returns the user's profile by user ID.
func (s *UserService) GetProfile(ctx context.Context, userID uint) (*model.User, error) {
	return s.userRepo.FindByID(ctx, userID)
}

// UpdateProfile updates the user's profile fields and returns the updated user.
func (s *UserService) UpdateProfile(ctx context.Context, userID uint, nickname, company, region string) (*model.User, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if nickname != "" {
		user.Nickname = nickname
	}
	if company != "" {
		user.Company = company
	}
	if region != "" {
		user.Region = region
	}
	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}

// UpdatePassword changes the user's password after verifying the old password.
func (s *UserService) UpdatePassword(ctx context.Context, userID uint, oldPassword, newPassword string) error {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return errors.New("旧密码不正确")
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.PasswordHash = string(hashedPassword)
	return s.userRepo.Update(ctx, user)
}
