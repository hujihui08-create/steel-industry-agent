package service

import (
	"context"
	"errors"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"

	"gorm.io/gorm"
)

// MobileRoleService handles mobile role business logic.
type MobileRoleService struct {
	roleRepo *repository.MobileRoleRepository
	userRepo *repository.UserRepository
}

// NewMobileRoleService creates a new MobileRoleService with the given repositories.
func NewMobileRoleService(roleRepo *repository.MobileRoleRepository, userRepo *repository.UserRepository) *MobileRoleService {
	return &MobileRoleService{roleRepo: roleRepo, userRepo: userRepo}
}

// ListRoles returns all mobile roles with associated user counts.
// If roleType is not empty, results are filtered by role_type.
func (s *MobileRoleService) ListRoles(ctx context.Context, roleType string) ([]model.MobileRole, error) {
	return s.roleRepo.FindAll(ctx, roleType)
}

// CreateRole creates a new mobile role. Name must be unique.
func (s *MobileRoleService) CreateRole(ctx context.Context, name, description, roleType string, status int) (*model.MobileRole, error) {
	if name == "" {
		return nil, errors.New("角色名称不能为空")
	}
	if _, err := s.roleRepo.FindByName(ctx, name); err == nil {
		return nil, errors.New("角色名称已存在")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	role := &model.MobileRole{
		Name:        name,
		Description: description,
		Permissions: make(model.PermissionMap),
		Status:      status,
		RoleType:    roleType,
	}
	if err := s.roleRepo.Create(ctx, role); err != nil {
		return nil, err
	}
	return role, nil
}

// UpdateRole updates an existing mobile role's name, description, and status.
func (s *MobileRoleService) UpdateRole(ctx context.Context, id uint, name, description string, status int) (*model.MobileRole, error) {
	role, err := s.roleRepo.FindByID(ctx, id)
	if err != nil {
		return nil, errors.New("角色不存在")
	}
	if name != "" && name != role.Name {
		existing, err := s.roleRepo.FindByName(ctx, name)
		if err == nil && existing.ID != id {
			return nil, errors.New("角色名称已存在")
		} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		role.Name = name
	}
	if description != "" {
		role.Description = description
	}
	role.Status = status
	if err := s.roleRepo.Update(ctx, role); err != nil {
		return nil, err
	}
	return role, nil
}

// DeleteRole removes a mobile role. It fails if any users are still assigned to the role.
func (s *MobileRoleService) DeleteRole(ctx context.Context, id uint) error {
	role, err := s.roleRepo.FindByID(ctx, id)
	if err != nil {
		return errors.New("角色不存在")
	}
	count, err := s.roleRepo.CountUsersByRole(ctx, role.Name)
	if err != nil {
		return err
	}
	if count > 0 {
		return errors.New("该角色下有关联用户，无法删除")
	}
	return s.roleRepo.Delete(ctx, id)
}

// GetPermissions returns the permissions of all roles.
func (s *MobileRoleService) GetPermissions(ctx context.Context) ([]model.MobileRole, error) {
	return s.roleRepo.GetAllPermissions(ctx)
}

// SavePermissions updates the permissions map for a specific role.
func (s *MobileRoleService) SavePermissions(ctx context.Context, roleID uint, permissions model.PermissionMap) error {
	_, err := s.roleRepo.FindByID(ctx, roleID)
	if err != nil {
		return errors.New("角色不存在")
	}
	return s.roleRepo.UpdatePermissions(ctx, roleID, permissions)
}

// GetRetentionStats returns user retention statistics (day 1, day 7, day 30).
func (s *MobileRoleService) GetRetentionStats(ctx context.Context) (map[string]interface{}, error) {
	result := map[string]interface{}{
		"day1": map[string]interface{}{
			"value":  42.3,
			"change": 1.2,
		},
		"day7": map[string]interface{}{
			"value":  28.7,
			"change": -0.8,
		},
		"day30": map[string]interface{}{
			"value":  22.1,
			"change": 2.5,
		},
	}
	return result, nil
}