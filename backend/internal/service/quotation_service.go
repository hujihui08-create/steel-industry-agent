package service

import (
	"bytes"
	"context"
	"fmt"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"

	"github.com/jung-kurt/gofpdf"
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

	pdf := buildQuotationPDF(q)
	return pdf, nil
}

func buildQuotationPDF(q *model.Quotation) []byte {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetAutoPageBreak(true, 15)
	pdf.AddPage()

	pdf.AddUTF8Font("simsun", "", "simsun.ttc")
	pdf.AddUTF8Font("simhei", "B", "simhei.ttf")

	pdf.SetFont("simhei", "B", 18)
	pdf.CellFormat(0, 12, fmt.Sprintf("报价单 #%d", q.ID), "", 1, "C", false, 0, "")
	pdf.Ln(4)

	pdf.SetLineWidth(0.5)
	pdf.SetDrawColor(229, 229, 229)
	y := pdf.GetY()
	pdf.Line(10, y, 200, y)
	pdf.Ln(6)

	pdf.SetFont("simsun", "", 11)
	colW := 95.0
	rowH := 8.0

	addRow := func(label, value string) {
		pdf.SetFont("simsun", "", 11)
		pdf.SetTextColor(115, 115, 115)
		pdf.CellFormat(colW, rowH, label, "", 0, "L", false, 0, "")
		pdf.SetTextColor(10, 10, 10)
		pdf.CellFormat(0, rowH, value, "", 1, "L", false, 0, "")
	}

	if q.CustomerName != "" {
		addRow("客户名称", q.CustomerName)
	}
	addRow("品类", q.Category)
	addRow("规格", q.Spec)
	addRow("数量", fmt.Sprintf("%.2f %s", q.Quantity, q.Unit))
	if q.DeliveryLocation != "" {
		addRow("收货地", q.DeliveryLocation)
	}
	addRow("状态", statusLabel(q.Status))

	pdf.Ln(4)
	pdf.SetLineWidth(0.3)
	pdf.SetDrawColor(229, 229, 229)
	y = pdf.GetY()
	pdf.Line(10, y, 200, y)
	pdf.Ln(6)

	pdf.SetFont("simhei", "B", 13)
	pdf.SetTextColor(10, 10, 10)
	pdf.CellFormat(0, 8, "费用明细", "", 1, "L", false, 0, "")
	pdf.Ln(2)

	addCostRow(pdf, "材料费", q.MaterialCost)
	addCostRow(pdf, "加工费", q.ProcessCost)
	addCostRow(pdf, "运费", q.FreightCost)
	addCostRow(pdf, "税费", q.TaxCost)

	pdf.Ln(2)
	pdf.SetLineWidth(0.5)
	pdf.SetDrawColor(10, 10, 10)
	y = pdf.GetY()
	pdf.Line(120, y, 200, y)
	pdf.Ln(4)

	pdf.SetFont("simhei", "B", 14)
	pdf.SetTextColor(10, 10, 10)
	pdf.CellFormat(colW, 10, "合计", "", 0, "L", false, 0, "")
	pdf.CellFormat(0, 10, formatPriceCN(q.TotalPrice), "", 1, "L", false, 0, "")
	pdf.Ln(6)

	pdf.SetFont("simsun", "", 9)
	pdf.SetTextColor(163, 163, 163)
	pdf.CellFormat(0, 6, fmt.Sprintf("生成时间: %s", time.Now().Format("2006-01-02 15:04:05")), "", 1, "C", false, 0, "")

	var buf bytes.Buffer
	_ = pdf.Output(&buf)
	return buf.Bytes()
}

func addCostRow(pdf *gofpdf.Fpdf, label string, value float64) {
	pdf.SetFont("simsun", "", 11)
	pdf.SetTextColor(115, 115, 115)
	pdf.CellFormat(95, 8, label, "", 0, "L", false, 0, "")
	pdf.SetTextColor(10, 10, 10)
	pdf.CellFormat(0, 8, formatPriceCN(value), "", 1, "L", false, 0, "")
}

func statusLabel(status string) string {
	switch status {
	case "draft":
		return "草稿"
	case "sent":
		return "已发送"
	case "accepted":
		return "已接受"
	case "rejected":
		return "已拒绝"
	default:
		return status
	}
}

func formatPriceCN(value float64) string {
	return fmt.Sprintf("¥%.2f", value)
}
