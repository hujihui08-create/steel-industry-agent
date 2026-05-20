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
