package repository

import (
	"context"
	"fmt"

	"steel-agent-backend/internal/model"

	"gorm.io/gorm"
)

// MenuRepository provides data access for menu items.
type MenuRepository struct {
	db *gorm.DB
}

// NewMenuRepository creates a new MenuRepository with the given database connection.
func NewMenuRepository(db *gorm.DB) *MenuRepository {
	return &MenuRepository{db: db}
}

// FindAll returns all menus ordered by sort_order.
func (r *MenuRepository) FindAll(ctx context.Context) ([]model.Menu, error) {
	var menus []model.Menu
	err := r.db.WithContext(ctx).Order("sort_order ASC").Find(&menus).Error
	return menus, err
}

// FindByID finds a menu by primary key ID.
func (r *MenuRepository) FindByID(ctx context.Context, id uint) (*model.Menu, error) {
	var menu model.Menu
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&menu).Error
	if err != nil {
		return nil, err
	}
	return &menu, nil
}

// Create inserts a new menu record.
func (r *MenuRepository) Create(ctx context.Context, menu *model.Menu) error {
	return r.db.WithContext(ctx).Create(menu).Error
}

// Update saves changes to an existing menu record.
func (r *MenuRepository) Update(ctx context.Context, menu *model.Menu) error {
	return r.db.WithContext(ctx).Save(menu).Error
}

// Delete removes a menu record by ID.
func (r *MenuRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.Menu{}).Error
}

// HasChildren checks whether a menu has child items.
func (r *MenuRepository) HasChildren(ctx context.Context, parentID uint) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.Menu{}).Where("parent_id = ?", parentID).Count(&count).Error
	return count > 0, err
}

// FindByRole returns menus where visible_roles contains the given role AND status=1,
// ordered by sort_order.
func (r *MenuRepository) FindByRole(ctx context.Context, role string) ([]model.Menu, error) {
	var menus []model.Menu
	// Use LIKE to match role within the comma-separated visible_roles string.
	// Pattern: role could be at the start, middle, or end of the comma-separated list.
	err := r.db.WithContext(ctx).
		Where("status = ? AND visible_roles LIKE ?", 1, fmt.Sprintf("%%%s%%", role)).
		Order("sort_order ASC").
		Find(&menus).Error
	return menus, err
}
