package service

import (
	"context"
	"math"
	"testing"
)

func TestConvertUnit(t *testing.T) {
	svc := NewKnowledgeService(nil, nil, nil)

	tests := []struct {
		name     string
		value    float64
		from     string
		to       string
		expected float64
		wantErr  bool
	}{
		{name: "ton to kg", value: 1, from: "ton", to: "kg", expected: 1000, wantErr: false},
		{name: "kg to ton", value: 1000, from: "kg", to: "ton", expected: 1, wantErr: false},
		{name: "kg to lb", value: 1, from: "kg", to: "lb", expected: 2.20462, wantErr: false},
		{name: "lb to kg", value: 2.20462, from: "lb", to: "kg", expected: 1, wantErr: false},
		{name: "ton to lb", value: 1, from: "ton", to: "lb", expected: 2204.62, wantErr: false},
		{name: "lb to ton", value: 2204.62, from: "lb", to: "ton", expected: 1, wantErr: false},
		{name: "same unit ton->ton", value: 5, from: "ton", to: "ton", expected: 5, wantErr: false},
		{name: "same unit kg->kg", value: 100, from: "kg", to: "kg", expected: 100, wantErr: false},
		{name: "unsupported m to km", value: 1, from: "m", to: "km", expected: 0, wantErr: true},
		{name: "unsupported g to kg", value: 500, from: "g", to: "kg", expected: 0, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := svc.ConvertUnit(context.Background(), tt.value, tt.from, tt.to)

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

			// Use epsilon comparison for floating point
			const epsilon = 0.001
			if math.Abs(result-tt.expected) > epsilon {
				t.Errorf("ConvertUnit(%v, %q, %q) = %v, want %v",
					tt.value, tt.from, tt.to, result, tt.expected)
			}
		})
	}
}

func TestCalculateWeight(t *testing.T) {
	svc := NewKnowledgeService(nil, nil, nil)

	tests := []struct {
		name     string
		category string
		spec     string
		quantity float64
		expected float64
	}{
		{
			name:     "螺纹钢 HRB400E 20mm, 1根",
			category: "螺纹钢",
			spec:     "HRB400E 20mm",
			quantity: 1,
			// 0.00617 * 20 * 20 * 12 * 1 = 29.616
			expected: 29.616,
		},
		{
			name:     "螺纹钢含'螺纹'关键词, 10根",
			category: "螺纹钢",
			spec:     "HRB400E 20mm",
			quantity: 10,
			// 0.00617 * 20 * 20 * 12 * 10 = 296.16
			expected: 296.16,
		},
		{
			name:     "rebar 英文也能识别螺纹",
			category: "rebar",
			spec:     "16mm",
			quantity: 1,
			// 0.00617 * 16 * 16 * 12 * 1 = 18.95424
			expected: 0.00617 * 16 * 16 * 12,
		},
		{
			name:     "钢筋 中文也能识别",
			category: "钢筋",
			spec:     "25mm",
			quantity: 5,
			// 0.00617 * 25 * 25 * 12 * 5
			expected: 0.00617 * 25 * 25 * 12 * 5,
		},
		{
			name:     "热卷 5.5mm, 1张",
			category: "热卷",
			spec:     "5.5mm",
			quantity: 1,
			// 7.85 * 5.5 * 1.5 * 10 * 1 = 647.625
			expected: 7.85 * 5.5 * 1.5 * 10,
		},
		{
			name:     "热轧卷 也能识别",
			category: "热轧卷",
			spec:     "3.0mm",
			quantity: 1,
			// 7.85 * 3.0 * 1.5 * 10 = 353.25
			expected: 7.85 * 3.0 * 1.5 * 10,
		},
		{
			name:     "HRC 英文也能识别",
			category: "HRC",
			spec:     "4.0mm",
			quantity: 1,
			// 7.85 * 4.0 * 1.5 * 10 = 471
			expected: 7.85 * 4.0 * 1.5 * 10,
		},
		{
			name:     "未知品类返回默认值",
			category: "未知品类",
			spec:     "some spec",
			quantity: 5,
			// 7.85 * 1 * quantity = 7.85 * 5 = 39.25
			expected: 7.85 * 5,
		},
		{
			name:     "螺纹钢规格无数字, 走默认",
			category: "螺纹钢",
			spec:     "no number here",
			quantity: 2,
			// diameter==0, falls through to default: 7.85 * 1 * 2 = 15.7
			expected: 7.85 * 2,
		},
		{
			name:     "热卷规格无数字, 走默认",
			category: "热卷",
			spec:     "no number",
			quantity: 3,
			// thickness==0, falls through to default: 7.85 * 1 * 3 = 23.55
			expected: 7.85 * 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := svc.CalculateWeight(context.Background(), tt.category, tt.spec, tt.quantity)

			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}

			const epsilon = 0.001
			if math.Abs(result-tt.expected) > epsilon {
				t.Errorf("CalculateWeight(%q, %q, %v) = %v, want %v",
					tt.category, tt.spec, tt.quantity, result, tt.expected)
			}
		})
	}
}
