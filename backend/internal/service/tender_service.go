package service

import (
	"context"
	"sort"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

// TenderService handles tender business logic.
type TenderService struct {
	tenderRepo         *repository.TenderRepository
	userFavoriteRepo   *repository.UserFavoriteRepository
}

// NewTenderService creates a new TenderService with the given tender and favorite repositories.
func NewTenderService(tenderRepo *repository.TenderRepository, userFavoriteRepo *repository.UserFavoriteRepository) *TenderService {
	return &TenderService{tenderRepo: tenderRepo, userFavoriteRepo: userFavoriteRepo}
}

// GetTenderList returns a paginated list of tenders with optional region, category, and status filters.
func (s *TenderService) GetTenderList(ctx context.Context, region, category, status string, limit, offset int) ([]model.Tender, error) {
	if region != "" {
		return s.tenderRepo.FindByRegion(ctx, region)
	}
	if category != "" {
		return s.tenderRepo.FindByCategory(ctx, category)
	}
	if status != "" {
		return s.tenderRepo.FindByStatus(ctx, status)
	}
	return s.tenderRepo.FindAll(ctx, limit, offset)
}

// GetTenderDetail returns detailed information for a specific tender.
func (s *TenderService) GetTenderDetail(ctx context.Context, id uint) (*model.Tender, error) {
	return s.tenderRepo.FindByID(ctx, id)
}

// AddFavorite adds a tender to the user's favorites.
func (s *TenderService) AddFavorite(ctx context.Context, userID, tenderID uint) error {
	fav := &model.UserFavorite{
		UserID:   userID,
		TenderID: tenderID,
	}
	return s.userFavoriteRepo.Create(ctx, fav)
}

// RemoveFavorite removes a tender from the user's favorites.
func (s *TenderService) RemoveFavorite(ctx context.Context, userID, tenderID uint) error {
	return s.userFavoriteRepo.Delete(ctx, userID, tenderID)
}

// GetRecommend returns personalized tender recommendations based on the user's favorites.
func (s *TenderService) GetRecommend(ctx context.Context, userID uint) ([]model.Tender, error) {
	favorites, err := s.userFavoriteRepo.FindByUserID(ctx, userID)
	if err != nil || len(favorites) == 0 {
		return s.tenderRepo.FindAll(ctx, 10, 0)
	}

	categorySet := make(map[string]bool)
	for _, fav := range favorites {
		tender, err := s.tenderRepo.FindByID(ctx, fav.TenderID)
		if err != nil {
			continue
		}
		if tender.Category != "" {
			categorySet[tender.Category] = true
		}
	}

	var recommended []model.Tender
	seen := make(map[uint]bool)

	for _, fav := range favorites {
		seen[fav.TenderID] = true
	}

	for cat := range categorySet {
		tenders, err := s.tenderRepo.FindByCategory(ctx, cat)
		if err != nil {
			continue
		}
		for _, t := range tenders {
			if len(recommended) >= 10 {
				break
			}
			if !seen[t.ID] {
				recommended = append(recommended, t)
				seen[t.ID] = true
			}
		}
		if len(recommended) >= 10 {
			break
		}
	}

	if len(recommended) == 0 {
		return s.tenderRepo.FindAll(ctx, 10, 0)
	}

	return recommended, nil
}

// GetFavorites returns the full tender details for all tenders favorited by the user.
func (s *TenderService) GetFavorites(ctx context.Context, userID uint) ([]model.Tender, error) {
	favorites, err := s.userFavoriteRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	tenders := make([]model.Tender, 0, len(favorites))
	for _, fav := range favorites {
		tender, err := s.tenderRepo.FindByID(ctx, fav.TenderID)
		if err != nil {
			continue
		}
		tenders = append(tenders, *tender)
	}

	return tenders, nil
}

// GetCalendar returns tenders with deadlines within the next 30 days.
func (s *TenderService) GetCalendar(ctx context.Context) (map[string]interface{}, error) {
	allTenders, err := s.tenderRepo.FindAll(ctx, 200, 0)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	thirtyDaysLater := now.AddDate(0, 0, 30)

	type CalendarItem struct {
		ID       uint      `json:"id"`
		Title    string    `json:"title"`
		Deadline time.Time `json:"deadline"`
		Status   string    `json:"status"`
	}

	dateMap := make(map[string][]CalendarItem)

	for _, t := range allTenders {
		if !t.Deadline.IsZero() && t.Deadline.After(now) && t.Deadline.Before(thirtyDaysLater) {
			dateKey := t.Deadline.Format("2006-01-02")
			dateMap[dateKey] = append(dateMap[dateKey], CalendarItem{
				ID:       t.ID,
				Title:    t.Title,
				Deadline: t.Deadline,
				Status:   t.Status,
			})
		}
	}

	type DateEntry struct {
		Date  string         `json:"date"`
		Items []CalendarItem `json:"items"`
	}

	var dates []DateEntry
	for dateKey, items := range dateMap {
		dates = append(dates, DateEntry{
			Date:  dateKey,
			Items: items,
		})
	}

	sort.Slice(dates, func(i, j int) bool {
		return dates[i].Date < dates[j].Date
	})

	return map[string]interface{}{
		"dates":  dates,
		"total":  len(dates),
	}, nil
}
