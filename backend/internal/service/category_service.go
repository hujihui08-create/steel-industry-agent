package service

import (
	"context"
	"fmt"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"

	"gorm.io/gorm"
)

type CreateCategoryRequest struct {
	Name         string  `json:"name" binding:"required"`
	Type         string  `json:"type" binding:"required"`
	SortOrder    int     `json:"sort_order"`
	ParentID     *uint   `json:"parent_id"`
	ContractCode *string `json:"contract_code"`
	Exchange     *string `json:"exchange"`
}

type UpdateCategoryRequest struct {
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	Status       string  `json:"status"`
	SortOrder    int     `json:"sort_order"`
	ParentID     *uint   `json:"parent_id"`
	ContractCode *string `json:"contract_code"`
	Exchange     *string `json:"exchange"`
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
	return s.categoryRepo.FindAll(ctx, typeFilter, statusFilter, nil)
}

func (s *CategoryService) CreateCategory(ctx context.Context, req CreateCategoryRequest) (*model.Category, error) {
	// Treat 0 as no parent
	if req.ParentID != nil && *req.ParentID == 0 {
		req.ParentID = nil
	}
	// If ParentID provided, verify parent exists with matching type
	if req.ParentID != nil {
		parent, err := s.categoryRepo.FindByID(ctx, *req.ParentID)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, fmt.Errorf("父品种不存在")
			}
			return nil, fmt.Errorf("查询父品种失败: %w", err)
		}
		if parent.Type != req.Type {
			return nil, fmt.Errorf("子品种类型必须与父品种一致")
		}
	}

	existing, err := s.categoryRepo.FindByNameAndType(ctx, req.Name, req.Type, req.ParentID)
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
		ParentID:  req.ParentID,
	}

	if req.ContractCode != nil {
		category.ContractCode = *req.ContractCode
	}
	if req.Exchange != nil {
		category.Exchange = *req.Exchange
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
	if req.ContractCode != nil {
		category.ContractCode = *req.ContractCode
	}
	if req.Exchange != nil {
		category.Exchange = *req.Exchange
	}

	// Treat 0 as no parent
	if req.ParentID != nil && *req.ParentID == 0 {
		req.ParentID = nil
	}

	// If ParentID provided, verify parent exists with matching type
	finalType := category.Type
	if req.ParentID != nil {
		parent, err := s.categoryRepo.FindByID(ctx, *req.ParentID)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, fmt.Errorf("父品种不存在")
			}
			return nil, fmt.Errorf("查询父品种失败: %w", err)
		}
		if parent.Type != finalType {
			return nil, fmt.Errorf("子品种类型必须与父品种一致")
		}
		if parent.ID == id {
			return nil, fmt.Errorf("不能将自己设为父品类")
		}
	}

	category.ParentID = req.ParentID

	// Check for duplicate name (exclude current category)
	existing, err := s.categoryRepo.FindByNameAndType(ctx, category.Name, category.Type, category.ParentID)
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("查询品种失败: %w", err)
	}
	if existing != nil && existing.ID != id {
		return nil, fmt.Errorf("品种名称已存在")
	}

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

	hasChildren, err := s.categoryRepo.HasChildren(ctx, id)
	if err != nil {
		return fmt.Errorf("查询子品种失败: %w", err)
	}
	if hasChildren {
		return fmt.Errorf("该品类下有子品种，请先删除子品种")
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
	// Get root categories (parent_id IS NULL) with children preloaded
	spots, err := s.categoryRepo.FindRoots(ctx, "spot")
	if err != nil {
		return nil, fmt.Errorf("查询启用品种失败: %w", err)
	}
	futures, err := s.categoryRepo.FindRoots(ctx, "futures")
	if err != nil {
		return nil, fmt.Errorf("查询启用品种失败: %w", err)
	}

	return &PublicCategoriesResponse{Spot: spots, Futures: futures}, nil
}

func (s *CategoryService) GetEnabledCategoryNames(ctx context.Context) ([]string, error) {
	return s.categoryRepo.FindEnabledNames(ctx)
}