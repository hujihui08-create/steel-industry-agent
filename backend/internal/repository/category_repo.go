package repository

import (
	"context"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

type CategoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

func (r *CategoryRepository) FindAll(ctx context.Context, typeFilter, statusFilter string, parentID *uint) ([]model.Category, error) {
	var categories []model.Category
	query := r.db.WithContext(ctx)
	if typeFilter != "" {
		query = query.Where("type = ?", typeFilter)
	}
	if statusFilter != "" {
		query = query.Where("status = ?", statusFilter)
	}
	if parentID != nil {
		query = query.Where("parent_id = ?", *parentID)
	}
	err := query.Order("sort_order ASC, id ASC").Find(&categories).Error
	return categories, err
}

func (r *CategoryRepository) FindByID(ctx context.Context, id uint) (*model.Category, error) {
	var category model.Category
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *CategoryRepository) FindByNameAndType(ctx context.Context, name, typ string, parentID *uint) (*model.Category, error) {
	var category model.Category
	query := r.db.WithContext(ctx).Where("name = ? AND type = ?", name, typ)
	if parentID != nil {
		query = query.Where("parent_id = ?", *parentID)
	} else {
		query = query.Where("parent_id IS NULL")
	}
	err := query.First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *CategoryRepository) FindEnabled(ctx context.Context) ([]model.Category, error) {
	var categories []model.Category
	err := r.db.WithContext(ctx).Where("status = ? AND parent_id IS NULL", "enabled").Preload("Children", "status = ?", "enabled").Order("sort_order ASC, id ASC").Find(&categories).Error
	return categories, err
}

func (r *CategoryRepository) FindEnabledNames(ctx context.Context) ([]string, error) {
	var names []string
	// 优先返回子品种名称 (parent_id IS NOT NULL)，用于实体提取和 Function Calling enum
	err := r.db.WithContext(ctx).Model(&model.Category{}).Where("status = ? AND parent_id IS NOT NULL", "enabled").Pluck("name", &names).Error
	if err != nil {
		return nil, err
	}
	// 如果没有子品种（旧数据），回退到返回所有启用品类
	if len(names) == 0 {
		err = r.db.WithContext(ctx).Model(&model.Category{}).Where("status = ?", "enabled").Pluck("name", &names).Error
	}
	return names, err
}

// FindRoots returns root categories (parent_id IS NULL) of the given type with children preloaded.
func (r *CategoryRepository) FindRoots(ctx context.Context, typ string) ([]model.Category, error) {
	var categories []model.Category
	err := r.db.WithContext(ctx).
		Where("parent_id IS NULL AND type = ? AND status = ?", typ, "enabled").
		Preload("Children", "status = ?", "enabled").
		Order("sort_order ASC, id ASC").
		Find(&categories).Error
	return categories, err
}

// HasChildren checks whether a category has any child records.
func (r *CategoryRepository) HasChildren(ctx context.Context, id uint) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.Category{}).Where("parent_id = ?", id).Count(&count).Error
	return count > 0, err
}

func (r *CategoryRepository) Create(ctx context.Context, category *model.Category) error {
	return r.db.WithContext(ctx).Create(category).Error
}

func (r *CategoryRepository) Update(ctx context.Context, category *model.Category) error {
	return r.db.WithContext(ctx).Save(category).Error
}

func (r *CategoryRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.Category{}).Error
}

func (r *CategoryRepository) ToggleStatus(ctx context.Context, id uint) (*model.Category, error) {
	category, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if category.Status == "enabled" {
		category.Status = "disabled"
	} else {
		category.Status = "enabled"
	}
	if err := r.Update(ctx, category); err != nil {
		return nil, err
	}
	return category, nil
}
