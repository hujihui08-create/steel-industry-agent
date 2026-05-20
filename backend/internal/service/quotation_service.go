package service

import (
	"context"
	"fmt"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

// QuotationService handles quotation business logic.
type QuotationService struct {
	quotationRepo *repository.QuotationRepository
	priceRepo     *repository.SteelPriceRepository
}

// QuotationBreakdown represents the cost breakdown of a quotation.
type QuotationBreakdown struct {
	MaterialCost float64 `json:"material_cost"`
	ProcessCost  float64 `json:"process_cost"`
	FreightCost  float64 `json:"freight_cost"`
	TaxCost      float64 `json:"tax_cost"`
	TotalPrice   float64 `json:"total_price"`
	UnitPrice    float64 `json:"unit_price"`
}

// NewQuotationService creates a new QuotationService with the given quotation and price repositories.
func NewQuotationService(quotationRepo *repository.QuotationRepository, priceRepo *repository.SteelPriceRepository) *QuotationService {
	return &QuotationService{quotationRepo: quotationRepo, priceRepo: priceRepo}
}

// CalculateQuotation computes a quotation breakdown for the given material and quantity.
func (s *QuotationService) CalculateQuotation(ctx context.Context, category, spec string, quantity float64) (*QuotationBreakdown, error) {
	price, err := s.priceRepo.FindLatest(ctx, category)
	if err != nil {
		return nil, fmt.Errorf("获取最新价格失败: %v", err)
	}

	materialCost := price.Price * quantity
	processCost := materialCost * 0.08
	freightCost := 50.0 * quantity
	taxCost := (materialCost + processCost + freightCost) * 0.13
	totalPrice := materialCost + processCost + freightCost + taxCost

	return &QuotationBreakdown{
		MaterialCost: materialCost,
		ProcessCost:  processCost,
		FreightCost:  freightCost,
		TaxCost:      taxCost,
		TotalPrice:   totalPrice,
		UnitPrice:    price.Price,
	}, nil
}

// CreateQuotation creates a new quotation record.
func (s *QuotationService) CreateQuotation(ctx context.Context, q *model.Quotation) error {
	return s.quotationRepo.Create(ctx, q)
}

// GetQuotationList returns the user's quotation history.
func (s *QuotationService) GetQuotationList(ctx context.Context, userID uint, limit, offset int) ([]model.Quotation, error) {
	return s.quotationRepo.FindByUserID(ctx, userID)
}

// GetQuotationDetail returns detailed information for a specific quotation.
func (s *QuotationService) GetQuotationDetail(ctx context.Context, id uint) (*model.Quotation, error) {
	return s.quotationRepo.FindByID(ctx, id)
}

// UpdateQuotation updates an existing quotation.
func (s *QuotationService) UpdateQuotation(ctx context.Context, q *model.Quotation) error {
	return s.quotationRepo.Update(ctx, q)
}

// DeleteQuotation deletes a quotation by its ID.
func (s *QuotationService) DeleteQuotation(ctx context.Context, id uint) error {
	return s.quotationRepo.Delete(ctx, id)
}

// ExportQuotationPDF generates a simple PDF representation of a quotation.
func (s *QuotationService) ExportQuotationPDF(ctx context.Context, id uint) ([]byte, error) {
	q, err := s.quotationRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("报价单不存在: %v", err)
	}

	pdf := buildSimplePDF(q)
	return pdf, nil
}

func buildSimplePDF(q *model.Quotation) []byte {
	var content string
	content += fmt.Sprintf("报价单 #%d\n", q.ID)
	content += "========================\n\n"
	content += fmt.Sprintf("客户名称: %s\n", q.CustomerName)
	content += fmt.Sprintf("品类: %s\n", q.Category)
	content += fmt.Sprintf("规格: %s\n", q.Spec)
	content += fmt.Sprintf("数量: %.2f %s\n", q.Quantity, q.Unit)
	content += "\n--- 费用明细 ---\n"
	content += fmt.Sprintf("材料费: %.2f\n", q.MaterialCost)
	content += fmt.Sprintf("加工费: %.2f\n", q.ProcessCost)
	content += fmt.Sprintf("运费: %.2f\n", q.FreightCost)
	content += fmt.Sprintf("税费: %.2f\n", q.TaxCost)
	content += "------------------------\n"
	content += fmt.Sprintf("总价: %.2f\n", q.TotalPrice)
	content += "========================\n"
	content += fmt.Sprintf("生成时间: %s\n", time.Now().Format("2006-01-02 15:04:05"))

	return []byte(content)
}
