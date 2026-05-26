package service

import (
	"context"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

// MenuService handles menu management business logic.
type MenuService struct {
	repo *repository.MenuRepository
}

// NewMenuService creates a new MenuService with the given menu repository.
func NewMenuService(repo *repository.MenuRepository) *MenuService {
	return &MenuService{repo: repo}
}

// GetMenuTree returns the full menu tree with parent-child hierarchy.
// Top-level menus (parent_id IS NULL) are returned with their children attached.
func (s *MenuService) GetMenuTree(ctx context.Context) ([]model.Menu, error) {
	menus, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	return buildMenuTree(menus), nil
}

// GetMenuTreeForRole returns the menu tree filtered by the given role.
// Only menus whose visible_roles contains the role AND status=1 are returned.
func (s *MenuService) GetMenuTreeForRole(ctx context.Context, role string) ([]model.Menu, error) {
	menus, err := s.repo.FindByRole(ctx, role)
	if err != nil {
		return nil, err
	}
	return buildMenuTree(menus), nil
}

// CreateMenu creates a new menu item.
func (s *MenuService) CreateMenu(ctx context.Context, menu *model.Menu) error {
	return s.repo.Create(ctx, menu)
}

// UpdateMenu updates an existing menu item.
func (s *MenuService) UpdateMenu(ctx context.Context, menu *model.Menu) error {
	return s.repo.Update(ctx, menu)
}

// DeleteMenu deletes a menu and all its children.
// Returns the total count of deleted items.
func (s *MenuService) DeleteMenu(ctx context.Context, id uint) (int, error) {
	// Collect all descendant IDs so we can return the total count.
	ids, err := s.collectDescendantIDs(ctx, id)
	if err != nil {
		return 0, err
	}
	// Include the root menu itself.
	ids = append([]uint{id}, ids...)

	deleted := 0
	for _, mid := range ids {
		if err := s.repo.Delete(ctx, mid); err != nil {
			return deleted, err
		}
		deleted++
	}
	return deleted, nil
}

// collectDescendantIDs recursively collects all child IDs for a given parent.
func (s *MenuService) collectDescendantIDs(ctx context.Context, parentID uint) ([]uint, error) {
	menus, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	var ids []uint
	for _, m := range menus {
		if m.ParentID != nil && *m.ParentID == parentID {
			ids = append(ids, m.ID)
			childIDs, _ := s.collectDescendantIDs(ctx, m.ID)
			ids = append(ids, childIDs...)
		}
	}
	return ids, nil
}

// buildMenuTree builds a parent-child tree from a flat list of menus.
// Menus with nil ParentID become top-level nodes; their children are populated
// from menus whose ParentID matches.
func buildMenuTree(menus []model.Menu) []model.Menu {
	// Index menus by ID for fast lookup.
	menuMap := make(map[uint]*model.Menu)
	for i := range menus {
		menuMap[menus[i].ID] = &menus[i]
	}

	var roots []model.Menu
	for i := range menus {
		m := &menus[i]
		if m.ParentID == nil {
			roots = append(roots, *m)
		} else {
			if parent, ok := menuMap[*m.ParentID]; ok {
				parent.Children = append(parent.Children, *m)
			}
		}
	}

	return roots
}
