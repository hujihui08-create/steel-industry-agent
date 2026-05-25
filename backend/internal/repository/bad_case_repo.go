package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

type BadCaseRepository struct {
	db *gorm.DB
}

func NewBadCaseRepository(db *gorm.DB) *BadCaseRepository {
	return &BadCaseRepository{db: db}
}

func (r *BadCaseRepository) FindPage(ctx context.Context, page, pageSize int, errorType, status, startDate, endDate, keyword string) ([]model.BadCase, int64, error) {
	var cases []model.BadCase
	var total int64

	query := r.db.WithContext(ctx).Model(&model.BadCase{})

	if errorType != "" {
		query = query.Where("error_type = ?", errorType)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("created_at <= ?", endDate+" 23:59:59")
	}
	if keyword != "" {
		query = query.Where("user_query ILIKE ?", "%"+keyword+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&cases).Error
	return cases, total, err
}

func (r *BadCaseRepository) FindAll(ctx context.Context) ([]model.BadCase, error) {
	var cases []model.BadCase
	err := r.db.WithContext(ctx).Order("created_at DESC").Find(&cases).Error
	return cases, err
}

func (r *BadCaseRepository) FindByID(ctx context.Context, id uint) (*model.BadCase, error) {
	var badCase model.BadCase
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&badCase).Error
	if err != nil {
		return nil, err
	}
	return &badCase, nil
}

func (r *BadCaseRepository) Create(ctx context.Context, badCase *model.BadCase) error {
	return r.db.WithContext(ctx).Create(badCase).Error
}

func (r *BadCaseRepository) Update(ctx context.Context, badCase *model.BadCase) error {
	return r.db.WithContext(ctx).Save(badCase).Error
}

func (r *BadCaseRepository) UpdateStatus(ctx context.Context, id uint, status string) error {
	updates := map[string]interface{}{
		"status": status,
	}
	switch status {
	case "fixed":
		now := time.Now()
		updates["fixed_at"] = now
	case "verified":
		now := time.Now()
		updates["verified_at"] = now
	case "fixing":
		updates["fixed_at"] = nil
	}
	return r.db.WithContext(ctx).Model(&model.BadCase{}).Where("id = ?", id).Updates(updates).Error
}

func (r *BadCaseRepository) BatchCreate(ctx context.Context, cases []model.BadCase) error {
	return r.db.WithContext(ctx).Create(&cases).Error
}

type StatusCount struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

func (r *BadCaseRepository) GetStatusCounts(ctx context.Context) (map[string]int64, error) {
	var results []StatusCount
	err := r.db.WithContext(ctx).Model(&model.BadCase{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&results).Error
	if err != nil {
		return nil, err
	}

	counts := map[string]int64{
		"pending":  0,
		"fixing":   0,
		"fixed":    0,
		"verified": 0,
	}
	for _, r := range results {
		counts[r.Status] = r.Count
	}
	return counts, nil
}

type DailyTrend struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

func (r *BadCaseRepository) GetDailyTrend(ctx context.Context) ([]DailyTrend, error) {
	var results []DailyTrend
	err := r.db.WithContext(ctx).Model(&model.BadCase{}).
		Select("DATE(created_at) as date, COUNT(*) as count").
		Where("created_at >= ?", time.Now().AddDate(0, 0, -30)).
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&results).Error
	return results, err
}

func (r *BadCaseRepository) GetAvgFixDays(ctx context.Context) (float64, error) {
	var avg float64
	err := r.db.WithContext(ctx).Model(&model.BadCase{}).
		Select("COALESCE(AVG(EXTRACT(EPOCH FROM fixed_at - created_at)/86400), 0)").
		Where("status IN ?", []string{"fixed", "verified"}).
		Where("fixed_at IS NOT NULL").
		Scan(&avg).Error
	return avg, err
}

func (r *BadCaseRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.BadCase{}).Error
}

func (r *BadCaseRepository) FindMaxCaseNoByPrefix(ctx context.Context, prefix string) (string, error) {
	var badCase model.BadCase
	err := r.db.WithContext(ctx).Where("case_no LIKE ?", prefix+"%").
		Order("case_no DESC").
		First(&badCase).Error
	if err != nil {
		return "", err
	}
	return badCase.CaseNo, nil
}
