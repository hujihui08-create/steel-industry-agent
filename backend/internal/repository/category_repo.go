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

func (r *CategoryRepository) FindAll(ctx context.Context, typeFilter, statusFilter string) ([]model.Category, error) {
	var categories []model.Category
	query := r.db.WithContext(ctx)
	if typeFilter != "" {
		query = query.Where("type = ?", typeFilter)
	}
	if statusFilter != "" {
		query = query.Where("status = ?", statusFilter)
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

func (r *CategoryRepository) FindByNameAndType(ctx context.Context, name, typ string) (*model.Category, error) {
	var category model.Category
	err := r.db.WithContext(ctx).Where("name = ? AND type = ?", name, typ).First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *CategoryRepository) FindEnabled(ctx context.Context) ([]model.Category, error) {
	var categories []model.Category
	err := r.db.WithContext(ctx).Where("status = ?", "enabled").Order("sort_order ASC, id ASC").Find(&categories).Error
	return categories, err
}

func (r *CategoryRepository) FindEnabledNames(ctx context.Context) ([]string, error) {
	var names []string
	err := r.db.WithContext(ctx).Model(&model.Category{}).Where("status = ?", "enabled").Pluck("name", &names).Error
	return names, err
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
