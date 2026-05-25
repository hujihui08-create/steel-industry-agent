package repository

import (
	"context"

	"steel-agent-backend/internal/model"

	"gorm.io/gorm"
)

// MobileRoleRepository provides data access for mobile role records.
type MobileRoleRepository struct {
	db *gorm.DB
}

// NewMobileRoleRepository creates a new MobileRoleRepository with the given database connection.
func NewMobileRoleRepository(db *gorm.DB) *MobileRoleRepository {
	return &MobileRoleRepository{db: db}
}

// FindAll returns all mobile roles ordered by ID, with user counts populated.
func (r *MobileRoleRepository) FindAll(ctx context.Context) ([]model.MobileRole, error) {
	var roles []model.MobileRole
	if err := r.db.WithContext(ctx).Order("id ASC").Find(&roles).Error; err != nil {
		return nil, err
	}
	for i := range roles {
		var count int64
		r.db.WithContext(ctx).Model(&model.User{}).Where("role = ?", roles[i].Name).Count(&count)
		roles[i].UserCount = int(count)
	}
	return roles, nil
}

// FindByID finds a mobile role by primary key ID.
func (r *MobileRoleRepository) FindByID(ctx context.Context, id uint) (*model.MobileRole, error) {
	var role model.MobileRole
	if err := r.db.WithContext(ctx).First(&role, id).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

// FindByName finds a mobile role by its unique name.
func (r *MobileRoleRepository) FindByName(ctx context.Context, name string) (*model.MobileRole, error) {
	var role model.MobileRole
	if err := r.db.WithContext(ctx).Where("name = ?", name).First(&role).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

// Create inserts a new mobile role record.
func (r *MobileRoleRepository) Create(ctx context.Context, role *model.MobileRole) error {
	return r.db.WithContext(ctx).Create(role).Error
}

// Update saves changes to an existing mobile role record.
func (r *MobileRoleRepository) Update(ctx context.Context, role *model.MobileRole) error {
	return r.db.WithContext(ctx).Save(role).Error
}

// Delete removes a mobile role by primary key ID.
func (r *MobileRoleRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&model.MobileRole{}, id).Error
}

// CountUsersByRole returns the number of users assigned to the given role name.
func (r *MobileRoleRepository) CountUsersByRole(ctx context.Context, roleName string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.User{}).Where("role = ?", roleName).Count(&count).Error
	return count, err
}

// GetAllPermissions returns all roles with their id, name, and permissions fields.
func (r *MobileRoleRepository) GetAllPermissions(ctx context.Context) ([]model.MobileRole, error) {
	var roles []model.MobileRole
	if err := r.db.WithContext(ctx).Select("id", "name", "permissions").Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}

// UpdatePermissions updates the permissions JSONB field for a given role.
func (r *MobileRoleRepository) UpdatePermissions(ctx context.Context, id uint, permissions model.PermissionMap) error {
	return r.db.WithContext(ctx).Model(&model.MobileRole{}).Where("id = ?", id).Update("permissions", permissions).Error
}
