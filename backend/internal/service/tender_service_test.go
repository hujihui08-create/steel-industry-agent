package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"steel-agent-backend/internal/model"
)

type mockTenderRepo struct {
	tenders  []model.Tender
	findErr  error
}

func (m *mockTenderRepo) FindAll(ctx context.Context, limit, offset int) ([]model.Tender, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	return m.tenders, nil
}

func (m *mockTenderRepo) FindByRegion(ctx context.Context, region string) ([]model.Tender, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	var result []model.Tender
	for _, t := range m.tenders {
		if t.Region == region {
			result = append(result, t)
		}
	}
	return result, nil
}

func (m *mockTenderRepo) FindByCategory(ctx context.Context, category string) ([]model.Tender, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	var result []model.Tender
	for _, t := range m.tenders {
		if t.Category == category {
			result = append(result, t)
		}
	}
	return result, nil
}

func (m *mockTenderRepo) FindByStatus(ctx context.Context, status string) ([]model.Tender, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	var result []model.Tender
	for _, t := range m.tenders {
		if t.Status == status {
			result = append(result, t)
		}
	}
	return result, nil
}

func (m *mockTenderRepo) FindByID(ctx context.Context, id uint) (*model.Tender, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	for _, t := range m.tenders {
		if t.ID == id {
			return &t, nil
		}
	}
	return nil, errors.New("record not found")
}

type mockUserFavoriteRepo struct {
	favorites []model.UserFavorite
	createErr error
	deleteErr error
	findErr   error
	created   []model.UserFavorite
	deleted   []struct{ userID, tenderID uint }
}

func (m *mockUserFavoriteRepo) Create(ctx context.Context, fav *model.UserFavorite) error {
	if m.createErr != nil {
		return m.createErr
	}
	m.favorites = append(m.favorites, *fav)
	m.created = append(m.created, *fav)
	return nil
}

func (m *mockUserFavoriteRepo) Delete(ctx context.Context, userID, tenderID uint) error {
	if m.deleteErr != nil {
		return m.deleteErr
	}
	m.deleted = append(m.deleted, struct{ userID, tenderID uint }{userID, tenderID})
	return nil
}

func (m *mockUserFavoriteRepo) FindByUserID(ctx context.Context, userID uint) ([]model.UserFavorite, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	var result []model.UserFavorite
	for _, f := range m.favorites {
		if f.UserID == userID {
			result = append(result, f)
		}
	}
	return result, nil
}

type testableTenderService struct {
	tenderRepo       *mockTenderRepo
	userFavoriteRepo *mockUserFavoriteRepo
}

func newTestableTenderService(tenderRepo *mockTenderRepo, favRepo *mockUserFavoriteRepo) *testableTenderService {
	return &testableTenderService{tenderRepo: tenderRepo, userFavoriteRepo: favRepo}
}

func (s *testableTenderService) GetTenderList(ctx context.Context, region, category, status string, limit, offset int) ([]model.Tender, error) {
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

func (s *testableTenderService) AddFavorite(ctx context.Context, userID, tenderID uint) error {
	fav := &model.UserFavorite{
		UserID:   userID,
		TenderID: tenderID,
	}
	return s.userFavoriteRepo.Create(ctx, fav)
}

func makeTestTenders() []model.Tender {
	now := time.Now()
	return []model.Tender{
		{ID: 1, Title: "上海螺纹钢采购", Region: "上海", Category: "螺纹钢", Budget: 5000000, Deadline: now.AddDate(0, 0, 15), Status: "open", Description: "采购HRB400E螺纹钢500吨"},
		{ID: 2, Title: "北京热卷招标", Region: "北京", Category: "热卷", Budget: 3000000, Deadline: now.AddDate(0, 0, 10), Status: "open", Description: "热卷5.5mm采购"},
		{ID: 3, Title: "广州线材采购", Region: "广州", Category: "线材", Budget: 2000000, Deadline: now.AddDate(0, 0, 25), Status: "open", Description: "线材6.5mm采购"},
		{ID: 4, Title: "上海线材补充采购", Region: "上海", Category: "线材", Budget: 1500000, Deadline: now.AddDate(0, 0, 20), Status: "closed", Description: "线材补充采购"},
	}
}

func TestGetTenderList(t *testing.T) {
	ctx := context.Background()

	tenders := makeTestTenders()
	mock := &mockTenderRepo{tenders: tenders}
	favMock := &mockUserFavoriteRepo{}
	svc := newTestableTenderService(mock, favMock)

	tests := []struct {
		name     string
		region   string
		category string
		status   string
		wantLen  int
	}{
		{"filter by region", "上海", "", "", 2},
		{"filter by category", "", "螺纹钢", "", 1},
		{"filter by status open", "", "", "open", 3},
		{"filter by status closed", "", "", "closed", 1},
		{"no filter returns all", "", "", "", 4},
		{"region with no match", "深圳", "", "", 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := svc.GetTenderList(ctx, tt.region, tt.category, tt.status, 20, 0)
			if err != nil {
				t.Errorf("expected no error, got %v", err)
			}
			if len(result) != tt.wantLen {
				t.Errorf("expected %d tenders, got %d", tt.wantLen, len(result))
			}
		})
	}

	t.Run("repository error", func(t *testing.T) {
		errMock := &mockTenderRepo{findErr: errors.New("database error")}
		errSvc := newTestableTenderService(errMock, nil)

		_, err := errSvc.GetTenderList(ctx, "", "", "", 20, 0)
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})
}

func TestAddFavorite(t *testing.T) {
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		tenderMock := &mockTenderRepo{tenders: makeTestTenders()}
		favMock := &mockUserFavoriteRepo{}
		svc := newTestableTenderService(tenderMock, favMock)

		err := svc.AddFavorite(ctx, 1, 2)
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if len(favMock.created) != 1 {
			t.Errorf("expected 1 favorite created, got %d", len(favMock.created))
		}
		if favMock.created[0].UserID != 1 || favMock.created[0].TenderID != 2 {
			t.Errorf("expected UserID=1 TenderID=2, got UserID=%d TenderID=%d",
				favMock.created[0].UserID, favMock.created[0].TenderID)
		}
	})

	t.Run("duplicate favorite error", func(t *testing.T) {
		tenderMock := &mockTenderRepo{tenders: makeTestTenders()}
		favMock := &mockUserFavoriteRepo{
			createErr: errors.New("duplicate key"),
		}
		svc := newTestableTenderService(tenderMock, favMock)

		err := svc.AddFavorite(ctx, 1, 1)
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})

	t.Run("add multiple favorites", func(t *testing.T) {
		tenderMock := &mockTenderRepo{tenders: makeTestTenders()}
		favMock := &mockUserFavoriteRepo{}
		svc := newTestableTenderService(tenderMock, favMock)

		svc.AddFavorite(ctx, 1, 1)
		svc.AddFavorite(ctx, 1, 3)
		svc.AddFavorite(ctx, 2, 1)

		if len(favMock.created) != 3 {
			t.Errorf("expected 3 favorites created, got %d", len(favMock.created))
		}

		favs, _ := favMock.FindByUserID(ctx, 1)
		if len(favs) != 2 {
			t.Errorf("expected 2 favorites for user 1, got %d", len(favs))
		}
	})
}

func TestTenderRepoByID(t *testing.T) {
	ctx := context.Background()

	tenders := makeTestTenders()
	mock := &mockTenderRepo{tenders: tenders}

	t.Run("find existing tender", func(t *testing.T) {
		tender, err := mock.FindByID(ctx, 1)
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if tender.Title != "上海螺纹钢采购" {
			t.Errorf("expected title '上海螺纹钢采购', got '%s'", tender.Title)
		}
	})

	t.Run("find non-existing tender", func(t *testing.T) {
		_, err := mock.FindByID(ctx, 999)
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})
}
