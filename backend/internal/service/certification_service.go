package service

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

type CertificationService struct {
	certRepo *repository.UserCertificationRepository
	userRepo *repository.UserRepository
}

func NewCertificationService(certRepo *repository.UserCertificationRepository, userRepo *repository.UserRepository) *CertificationService {
	return &CertificationService{certRepo: certRepo, userRepo: userRepo}
}

func (s *CertificationService) SubmitCertification(ctx context.Context, userID uint, companyName, creditCode, contactName, contactPhone string) (*model.UserCertification, error) {
	existing, err := s.certRepo.FindLatestByUserID(ctx, userID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if existing != nil && (existing.Status == "pending" || existing.Status == "approved") {
		return nil, errors.New("您已有认证申请正在处理中")
	}

	cert := &model.UserCertification{
		UserID:       userID,
		CompanyName:  companyName,
		CreditCode:   creditCode,
		ContactName:  contactName,
		ContactPhone: contactPhone,
		Status:       "pending",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.certRepo.Create(ctx, cert); err != nil {
		return nil, err
	}
	return cert, nil
}

func (s *CertificationService) GetMyCertification(ctx context.Context, userID uint) (*model.UserCertification, error) {
	return s.certRepo.FindLatestByUserID(ctx, userID)
}

func (s *CertificationService) ListCertifications(ctx context.Context, status string, limit, offset int) ([]model.UserCertification, int64, error) {
	return s.certRepo.FindAll(ctx, status, limit, offset)
}

func (s *CertificationService) ApproveCertification(ctx context.Context, id uint, reviewedBy uint) error {
	if err := s.certRepo.UpdateStatus(ctx, id, "approved", "", reviewedBy); err != nil {
		return err
	}
	cert, err := s.certRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	return s.userRepo.UpdateIsVerified(ctx, cert.UserID, true)
}

func (s *CertificationService) RejectCertification(ctx context.Context, id uint, reviewedBy uint, remark string) error {
	return s.certRepo.UpdateStatus(ctx, id, "rejected", remark, reviewedBy)
}
