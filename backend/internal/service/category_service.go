package service

import (
	"context"
	"fmt"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"

	"gorm.io/gorm"
)

type CreateCategoryRequest struct {
	Name      string `json:"name"`
	Type      string `json:"type"`
	SortOrder int    `json:"sort_order"`
}

type UpdateCategoryRequest struct {
	Name      string `json:"name"`
	Type      string `json:"type"`
	Status    string `json:"status"`
	SortOrder int    `json:"sort_order"`
}

type PublicCategoriesResponse struct {
	Spot    []model.Category `json:"spot"`
	Futures []model.Category `json:"futures"`
}

type CategoryService struct {
	categoryRepo *repository.CategoryRepository
	priceRepo    *repository.SteelPriceRepository
}

func NewCategoryService(categoryRepo *repository.CategoryRepository, priceRepo *repository.SteelPriceRepository) *CategoryService {
	return &CategoryService{
		categoryRepo: categoryRepo,
		priceRepo:    priceRepo,
	}
}

func (s *CategoryService) ListCategories(ctx context.Context, typeFilter, statusFilter string) ([]model.Category, error) {
	return s.categoryRepo.FindAll(ctx, typeFilter, statusFilter)
}

func (s *CategoryService) CreateCategory(ctx context.Context, req CreateCategoryRequest) (*model.Category, error) {
	existing, err := s.categoryRepo.FindByNameAndType(ctx, req.Name, req.Type)
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("查询品种失败: %w", err)
	}
	if existing != nil {
		return nil, fmt.Errorf("品种名称已存在")
	}

	category := &model.Category{
		Name:      req.Name,
		Type:      req.Type,
		Status:    "enabled",
		SortOrder: req.SortOrder,
	}

	if err := s.categoryRepo.Create(ctx, category); err != nil {
		return nil, fmt.Errorf("创建品种失败: %w", err)
	}
	return category, nil
}

func (s *CategoryService) UpdateCategory(ctx context.Context, id uint, req UpdateCategoryRequest) (*model.Category, error) {
	category, err := s.categoryRepo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("品种不存在")
		}
		return nil, fmt.Errorf("查询品种失败: %w", err)
	}

	if req.Name != "" {
		category.Name = req.Name
	}
	if req.Type != "" {
		category.Type = req.Type
	}
	if req.Status != "" {
		category.Status = req.Status
	}
	category.SortOrder = req.SortOrder

	if err := s.categoryRepo.Update(ctx, category); err != nil {
		return nil, fmt.Errorf("更新品种失败: %w", err)
	}
	return category, nil
}

func (s *CategoryService) DeleteCategory(ctx context.Context, id uint) error {
	category, err := s.categoryRepo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("品种不存在")
		}
		return fmt.Errorf("查询品种失败: %w", err)
	}

	prices, err := s.priceRepo.FindByCategory(ctx, category.Name)
	if err != nil {
		return fmt.Errorf("查询价格数据失败: %w", err)
	}
	if len(prices) > 0 {
		return fmt.Errorf("该品种下存在价格数据，无法删除，请先禁用")
	}

	return s.categoryRepo.Delete(ctx, id)
}

func (s *CategoryService) ToggleCategory(ctx context.Context, id uint) (*model.Category, error) {
	return s.categoryRepo.ToggleStatus(ctx, id)
}

func (s *CategoryService) GetEnabledCategories(ctx context.Context) (*PublicCategoriesResponse, error) {
	categories, err := s.categoryRepo.FindEnabled(ctx)
	if err != nil {
		return nil, fmt.Errorf("查询启用的品种失败: %w", err)
	}

	resp := &PublicCategoriesResponse{
		Spot:    []model.Category{},
		Futures: []model.Category{},
	}

	for _, c := range categories {
		switch c.Type {
		case "spot":
			resp.Spot = append(resp.Spot, c)
		case "futures":
			resp.Futures = append(resp.Futures, c)
		}
	}

	return resp, nil
}

func (s *CategoryService) GetEnabledCategoryNames(ctx context.Context) ([]string, error) {
	return s.categoryRepo.FindEnabledNames(ctx)
}
