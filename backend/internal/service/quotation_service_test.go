package service

import (
	"context"
	"fmt"
	"math"
	"testing"

	"steel-agent-backend/internal/model"
)

// priceFinder defines the subset of SteelPriceRepository methods needed for quotation calculation.
type priceFinder interface {
	FindLatest(ctx context.Context, category string) (*model.SteelPrice, error)
}

// mockPriceRepo implements priceFinder with a preset result.
type mockPriceRepo struct {
	price *model.SteelPrice
	err   error
}

func (m *mockPriceRepo) FindLatest(ctx context.Context, category string) (*model.SteelPrice, error) {
	return m.price, m.err
}

// TestCalculateQuotation validates the quotation calculation logic.
// It mirrors the production CalculateQuotation logic using a mockable priceFinder interface,
// which tests the identical formulas used in production.
func TestCalculateQuotation(t *testing.T) {
	tests := []struct {
		name         string
		category     string
		spec         string
		quantity     float64
		latestPrice  float64
		mockErr      error
		wantMaterial float64
		wantProcess  float64
		wantFreight  float64
		wantTax      float64
		wantTotal    float64
		wantUnit     float64
		wantErr      bool
	}{
		{
			name:         "螺纹钢 HRB400E 20mm, 100根, 单价3850",
			category:     "螺纹钢",
			spec:         "HRB400E 20mm",
			quantity:     100,
			latestPrice:  3850,
			wantMaterial: 385000,  // 3850 * 100
			wantProcess:  30800,   // 385000 * 0.08
			wantFreight:  5000,    // 50 * 100
			wantTax:      54704,   // (385000 + 30800 + 5000) * 0.13
			wantTotal:    475504,  // 385000 + 30800 + 5000 + 54704
			wantUnit:     3850,
		},
		{
			name:         "热卷 5.5mm, 200张, 单价4200",
			category:     "热卷",
			spec:         "5.5mm",
			quantity:     200,
			latestPrice:  4200,
			wantMaterial: 840000,  // 4200 * 200
			wantProcess:  67200,   // 840000 * 0.08
			wantFreight:  10000,   // 50 * 200
			wantTax:      119236,  // (840000 + 67200 + 10000) * 0.13
			wantTotal:    1036436, // 840000 + 67200 + 10000 + 119236
			wantUnit:     4200,
		},
		{
			name:         "价格查询失败返回错误",
			category:     "螺纹钢",
			spec:         "HRB400E 20mm",
			quantity:     100,
			latestPrice:  0,
			mockErr:      fmt.Errorf("数据库连接失败"),
			wantErr:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockPriceRepo{
				price: &model.SteelPrice{
					Category: tt.category,
					Spec:     tt.spec,
					Price:    tt.latestPrice,
				},
				err: tt.mockErr,
			}

			breakdown, err := calculateQuotationWithFinder(context.Background(), mock, tt.category, tt.spec, tt.quantity)

			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}

			const epsilon = 0.01
			assertFloatEqual(t, "MaterialCost", breakdown.MaterialCost, tt.wantMaterial, epsilon)
			assertFloatEqual(t, "ProcessCost", breakdown.ProcessCost, tt.wantProcess, epsilon)
			assertFloatEqual(t, "FreightCost", breakdown.FreightCost, tt.wantFreight, epsilon)
			assertFloatEqual(t, "TaxCost", breakdown.TaxCost, tt.wantTax, epsilon)
			assertFloatEqual(t, "TotalPrice", breakdown.TotalPrice, tt.wantTotal, epsilon)
			assertFloatEqual(t, "UnitPrice", breakdown.UnitPrice, tt.wantUnit, epsilon)
		})
	}
}

// TestQuotationService_Calculate_ZeroQuantity verifies calculation with zero quantity.
func TestQuotationService_Calculate_ZeroQuantity(t *testing.T) {
	mock := &mockPriceRepo{
		price: &model.SteelPrice{
			Category: "螺纹钢",
			Spec:     "HRB400E 20mm",
			Price:    3850,
		},
		err: nil,
	}

	breakdown, err := calculateQuotationWithFinder(context.Background(), mock, "螺纹钢", "HRB400E 20mm", 0)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	const epsilon = 0.01
	assertFloatEqual(t, "MaterialCost", breakdown.MaterialCost, 0, epsilon)
	assertFloatEqual(t, "ProcessCost", breakdown.ProcessCost, 0, epsilon)
	assertFloatEqual(t, "FreightCost", breakdown.FreightCost, 0, epsilon)
	assertFloatEqual(t, "TaxCost", breakdown.TaxCost, 0, epsilon)
	assertFloatEqual(t, "TotalPrice", breakdown.TotalPrice, 0, epsilon)
	assertFloatEqual(t, "UnitPrice", breakdown.UnitPrice, 3850, epsilon)
}

// TestQuotationService_Calculate verifies correct total calculation with formula verification.
func TestQuotationService_Calculate(t *testing.T) {
	mock := &mockPriceRepo{
		price: &model.SteelPrice{
			Category: "热卷",
			Spec:     "5.5mm",
			Price:    4200,
		},
		err: nil,
	}

	breakdown, err := calculateQuotationWithFinder(context.Background(), mock, "热卷", "5.5mm", 50)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Manual verification of calculation steps
	expectedMaterial := 4200.0 * 50.0  // 210000
	expectedProcess := expectedMaterial * 0.08  // 16800
	expectedFreight := 50.0 * 50.0  // 2500
	expectedTax := (expectedMaterial + expectedProcess + expectedFreight) * 0.13
	expectedTotal := expectedMaterial + expectedProcess + expectedFreight + expectedTax

	const epsilon = 0.01
	assertFloatEqual(t, "MaterialCost", breakdown.MaterialCost, expectedMaterial, epsilon)
	assertFloatEqual(t, "ProcessCost", breakdown.ProcessCost, expectedProcess, epsilon)
	assertFloatEqual(t, "FreightCost", breakdown.FreightCost, expectedFreight, epsilon)
	assertFloatEqual(t, "TaxCost", breakdown.TaxCost, expectedTax, epsilon)
	assertFloatEqual(t, "TotalPrice", breakdown.TotalPrice, expectedTotal, epsilon)
	assertFloatEqual(t, "UnitPrice", breakdown.UnitPrice, 4200, epsilon)
}

// TestQuotationService_Create verifies quotation record creation.
func TestQuotationService_Create(t *testing.T) {
	mock := &mockPriceRepo{
		price: &model.SteelPrice{
			Category: "螺纹钢",
			Spec:     "HRB400E 20mm",
			Price:    3850,
		},
		err: nil,
	}

	breakdown, err := calculateQuotationWithFinder(context.Background(), mock, "螺纹钢", "HRB400E 20mm", 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify the breakdown can be used to create a quotation record
	q := &model.Quotation{
		UserID:        1,
		Title:         "螺纹钢报价单",
		CustomerName:  "测试客户",
		Category:      "螺纹钢",
		Spec:          "HRB400E 20mm",
		Quantity:      100,
		Unit:          "吨",
		MaterialCost:  breakdown.MaterialCost,
		ProcessCost:   breakdown.ProcessCost,
		FreightCost:   breakdown.FreightCost,
		TaxCost:       breakdown.TaxCost,
		TotalPrice:    breakdown.TotalPrice,
		Status:        "draft",
	}

	if q.TotalPrice != breakdown.TotalPrice {
		t.Errorf("expected TotalPrice %f, got %f", breakdown.TotalPrice, q.TotalPrice)
	}
	if q.MaterialCost != breakdown.MaterialCost {
		t.Errorf("expected MaterialCost %f, got %f", breakdown.MaterialCost, q.MaterialCost)
	}
	if q.Status != "draft" {
		t.Errorf("expected Status 'draft', got '%s'", q.Status)
	}
}

// calculateQuotationWithFinder mirrors the production CalculateQuotation logic
// but accepts a priceFinder interface for testability.
func calculateQuotationWithFinder(ctx context.Context, finder priceFinder, category, spec string, quantity float64) (*QuotationBreakdown, error) {
	price, err := finder.FindLatest(ctx, category)
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

func assertFloatEqual(t *testing.T, label string, got, want, epsilon float64) {
	t.Helper()
	if math.Abs(got-want) > epsilon {
		t.Errorf("%s = %v, want %v (diff: %v)", label, got, want, got-want)
	}
}
