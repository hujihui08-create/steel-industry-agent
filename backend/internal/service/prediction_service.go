package service

import (
	"context"
	"fmt"
	"math"
	"sort"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

// PredictionService provides steel price prediction and seasonal analysis.
type PredictionService struct {
	priceRepo *repository.SteelPriceRepository
}

// PredictionPoint represents a single data point in the prediction result.
type PredictionPoint struct {
	Date  string  `json:"date"`
	Price float64 `json:"price"`
	Type  string  `json:"type"`             // "historical" or "predict"
	Lower float64 `json:"lower,omitempty"`  // confidence lower bound, predict only
	Upper float64 `json:"upper,omitempty"`  // confidence upper bound, predict only
}

// PredictionResult contains the full prediction analysis output.
type PredictionResult struct {
	Category   string            `json:"category"`
	Spec       string            `json:"spec"`
	Region     string            `json:"region"`
	Points     []PredictionPoint `json:"points"`
	Trend      string            `json:"trend"`       // "up", "down", "stable"
	ChangePct  float64           `json:"change_pct"`  // overall predicted change percentage
	Confidence float64           `json:"confidence"`  // prediction confidence 0-1
	Disclaimer string            `json:"disclaimer"`
}

// SeasonalTip contains a seasonal pattern insight for a specific month.
type SeasonalTip struct {
	Month     int     `json:"month"`
	MonthName string  `json:"month_name"` // "1月"
	AvgChange float64 `json:"avg_change"` // average percentage change
	Tip       string  `json:"tip"`
	Years     int     `json:"years"` // number of years of data
}

// NewPredictionService creates a new PredictionService with the given price repository.
func NewPredictionService(priceRepo *repository.SteelPriceRepository) *PredictionService {
	return &PredictionService{priceRepo: priceRepo}
}

// Predict generates a price prediction for the given category/spec/region combination
// over the specified forecast horizon in days.
//
// Algorithm:
//  1. Fetch up to 90 days of historical data
//  2. Calculate 7-day simple moving average
//  3. Perform simple linear regression on the moving average
//  4. Extend the regression line for horizonDays into the future
//  5. Calculate 95% confidence interval (std dev * 1.96)
//  6. Return combined historical + prediction points
func (s *PredictionService) Predict(ctx context.Context, category, spec, region string, horizonDays int) (*PredictionResult, error) {
	const minDataPoints = 10

	// 1. Fetch historical data (up to 90 days)
	end := time.Now()
	start := end.AddDate(0, 0, -90)
	historical, err := s.priceRepo.FindByDateRange(ctx, category, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch historical prices: %w", err)
	}

	// Filter by spec and region if specified
	filtered := filterBySpecRegion(historical, spec, region)

	if len(filtered) < minDataPoints {
		return nil, fmt.Errorf("insufficient data: need at least %d data points, got %d", minDataPoints, len(filtered))
	}

	// Sort by date ascending
	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].PriceDate.Before(filtered[j].PriceDate)
	})

	// 2. Calculate 7-day simple moving average
	windowSize := 7
	movingAvg := simpleMovingAverage(filtered, windowSize)

	if len(movingAvg) < minDataPoints {
		return nil, fmt.Errorf("insufficient data after smoothing: need at least %d points, got %d", minDataPoints, len(movingAvg))
	}

	// 3. Linear regression: price = slope * dayIndex + intercept
	// x = day index (0, 1, 2, ...)
	// y = smoothed price
	slope, intercept := linearRegression(movingAvg)

	// 4. Generate prediction points
	// Determine the last date and the spec used
	lastData := filtered[len(filtered)-1]
	var resultSpec string
	if spec != "" {
		resultSpec = spec
	} else {
		resultSpec = lastData.Spec
	}

	var resultRegion string
	if region != "" {
		resultRegion = region
	} else {
		resultRegion = lastData.Region
	}

	// Build historical points (from moving average)
	var points []PredictionPoint
	n := len(movingAvg)
	for i := 0; i < n; i++ {
		points = append(points, PredictionPoint{
			Date:  movingAvg[i].PriceDate.Format("2006-01-02"),
			Price: math.Round(movingAvg[i].Price*100) / 100,
			Type:  "historical",
		})
	}

	// Generate prediction points
	lastHistDate := movingAvg[len(movingAvg)-1].PriceDate
	for i := 1; i <= horizonDays; i++ {
		predDate := lastHistDate.AddDate(0, 0, i)
		predX := float64(n + i - 1)
		predPrice := slope*predX + intercept
		if predPrice < 0 {
			predPrice = 0
		}
		points = append(points, PredictionPoint{
			Date:  predDate.Format("2006-01-02"),
			Price: math.Round(predPrice*100) / 100,
			Type:  "predict",
		})
	}

	// 5. Calculate confidence interval (standard deviation * 1.96 for 95% CI)
	stdDev := residualsStdDev(movingAvg, slope, intercept)
	margin := stdDev * 1.96

	// Apply confidence band to prediction points only
	for i := range points {
		if points[i].Type == "predict" {
			points[i].Lower = math.Round((points[i].Price-margin)*100) / 100
			points[i].Upper = math.Round((points[i].Price+margin)*100) / 100
			if points[i].Lower < 0 {
				points[i].Lower = 0
			}
		}
	}

	// 6. Determine trend and confidence
	trend := "stable"
	firstHistPrice := movingAvg[0].Price
	lastPredPrice := slope*float64(n+horizonDays-1) + intercept
	changePct := 0.0
	if firstHistPrice != 0 {
		changePct = (lastPredPrice - firstHistPrice) / firstHistPrice * 100
	}
	if changePct > 2 {
		trend = "up"
	} else if changePct < -2 {
		trend = "down"
	}

	// Confidence: lower is better when stdDev is low relative to price magnitude
	meanPrice := 0.0
	for _, p := range movingAvg {
		meanPrice += p.Price
	}
	meanPrice /= float64(len(movingAvg))
	confidence := 0.5
	if meanPrice > 0 {
		cv := stdDev / meanPrice // coefficient of variation
		// Map CV to confidence: CV < 1% -> 0.9+, CV > 10% -> 0.3-
		confidence = math.Max(0.1, math.Min(0.95, 1.0-cv*10))
	}

	return &PredictionResult{
		Category:   category,
		Spec:       resultSpec,
		Region:     resultRegion,
		Points:     points,
		Trend:      trend,
		ChangePct:  math.Round(changePct*100) / 100,
		Confidence: math.Round(confidence*100) / 100,
		Disclaimer: "基于历史数据推算，仅供参考，不构成投资建议",
	}, nil
}

// GetSeasonalTips analyzes historical price data for a category and returns
// seasonal patterns (monthly average changes) that may be useful for decision-making.
//
// Algorithm:
//  1. Fetch up to 3 years of data
//  2. Group by month, calculate average month-over-month change
//  3. Return tips for months with >2% average change
func (s *PredictionService) GetSeasonalTips(ctx context.Context, category string) ([]SeasonalTip, error) {
	// 1. Fetch up to 3 years of data
	end := time.Now()
	start := end.AddDate(-3, 0, 0)
	prices, err := s.priceRepo.FindByDateRange(ctx, category, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch historical prices: %w", err)
	}

	if len(prices) < 24 { // Need at least 2 years of monthly data
		return nil, fmt.Errorf("insufficient data for seasonal analysis: need at least 24 data points, got %d", len(prices))
	}

	// Sort by date
	sort.Slice(prices, func(i, j int) bool {
		return prices[i].PriceDate.Before(prices[j].PriceDate)
	})

	// 2. Group by month and calculate month-over-month changes
	// For each month (1-12), collect all month-over-month changes
	type monthStats struct {
		changes []float64 // percentage changes
		years   map[int]bool
	}
	monthly := make(map[time.Month]*monthStats)
	// Initialize map keys
	for m := time.January; m <= time.December; m++ {
		monthly[m] = &monthStats{years: make(map[int]bool)}
	}

	// Calculate month-over-month changes
	for i := 0; i < len(prices)-1; i++ {
		current := prices[i]
		next := prices[i+1]

		// Only consider pairs within reasonable date range
		diff := next.PriceDate.Sub(current.PriceDate)
		if diff <= 0 || diff > 60*24*time.Hour {
			continue
		}

		currentMonth := current.PriceDate.Month()

		if current.Price != 0 {
			pctChange := (next.Price - current.Price) / current.Price * 100
			monthly[currentMonth].changes = append(monthly[currentMonth].changes, pctChange)
			monthly[currentMonth].years[current.PriceDate.Year()] = true
		}
	}

	// 3. Build tips for months with significant patterns (>2% average change)
	monthNames := map[time.Month]string{
		time.January:   "1月",
		time.February:  "2月",
		time.March:     "3月",
		time.April:     "4月",
		time.May:       "5月",
		time.June:      "6月",
		time.July:      "7月",
		time.August:    "8月",
		time.September: "9月",
		time.October:   "10月",
		time.November:  "11月",
		time.December:  "12月",
	}

	var tips []SeasonalTip
	for m := time.January; m <= time.December; m++ {
		stats := monthly[m]
		if len(stats.changes) == 0 {
			continue
		}

		sum := 0.0
		for _, c := range stats.changes {
			sum += c
		}
		avgChange := sum / float64(len(stats.changes))

		if math.Abs(avgChange) >= 2.0 {
			tip := generateSeasonalTip(int(m), avgChange)
			tips = append(tips, SeasonalTip{
				Month:     int(m),
				MonthName: monthNames[m],
				AvgChange: math.Round(avgChange*100) / 100,
				Tip:       tip,
				Years:     len(stats.years),
			})
		}
	}

	// Sort by month
	sort.Slice(tips, func(i, j int) bool {
		return tips[i].Month < tips[j].Month
	})

	return tips, nil
}

// GetPredictionForTrend generates prediction data suitable for appending to a trend response.
// Returns only prediction points (not historical) for the given horizon.
func (s *PredictionService) GetPredictionForTrend(ctx context.Context, category string, horizonDays int) ([]PredictionPoint, error) {
	result, err := s.Predict(ctx, category, "", "", horizonDays)
	if err != nil {
		return nil, err
	}

	var predPoints []PredictionPoint
	for _, p := range result.Points {
		if p.Type == "predict" {
			predPoints = append(predPoints, p)
		}
	}
	return predPoints, nil
}

// --- Internal helpers ---

// filterBySpecRegion filters steel price records by spec and/or region.
func filterBySpecRegion(prices []model.SteelPrice, spec, region string) []model.SteelPrice {
	if spec == "" && region == "" {
		return prices
	}

	var filtered []model.SteelPrice
	for _, p := range prices {
		if spec != "" && p.Spec != spec {
			continue
		}
		if region != "" && p.Region != region {
			continue
		}
		filtered = append(filtered, p)
	}
	return filtered
}

// simpleMovingAverage computes a window-sized SMA over the price series.
// Each output point uses Price and PriceDate from the last element in the window.
func simpleMovingAverage(prices []model.SteelPrice, window int) []model.SteelPrice {
	if len(prices) < window {
		return prices
	}

	result := make([]model.SteelPrice, 0, len(prices)-window+1)
	for i := window - 1; i < len(prices); i++ {
		sum := 0.0
		for j := i - window + 1; j <= i; j++ {
			sum += prices[j].Price
		}
		result = append(result, model.SteelPrice{
			Price:     sum / float64(window),
			PriceDate: prices[i].PriceDate,
			Category:  prices[i].Category,
			Spec:      prices[i].Spec,
			Region:    prices[i].Region,
		})
	}
	return result
}

// linearRegression performs simple linear regression on the price data.
// x = index (0, 1, 2, ...), y = price.
// Returns (slope, intercept) for the line y = slope * x + intercept.
func linearRegression(prices []model.SteelPrice) (float64, float64) {
	n := float64(len(prices))
	if n == 0 {
		return 0, 0
	}
	if n == 1 {
		return 0, prices[0].Price
	}

	var sumX, sumY, sumXY, sumX2 float64
	for i, p := range prices {
		x := float64(i)
		y := p.Price
		sumX += x
		sumY += y
		sumXY += x * y
		sumX2 += x * x
	}

	denom := n*sumX2 - sumX*sumX
	if denom == 0 {
		return 0, sumY / n
	}

	slope := (n*sumXY - sumX*sumY) / denom
	intercept := (sumY - slope*sumX) / n
	return slope, intercept
}

// residualsStdDev calculates the standard deviation of residuals from the regression line.
func residualsStdDev(prices []model.SteelPrice, slope, intercept float64) float64 {
	n := len(prices)
	if n < 2 {
		return 0
	}

	var sumSq float64
	for i, p := range prices {
		predicted := slope*float64(i) + intercept
		residual := p.Price - predicted
		sumSq += residual * residual
	}

	return math.Sqrt(sumSq / float64(n-2)) // n-2 degrees of freedom
}

// generateSeasonalTip creates a human-readable tip based on the month and average change.
func generateSeasonalTip(month int, avgChange float64) string {
	monthNames := map[int]string{
		1: "1月", 2: "2月", 3: "3月", 4: "4月",
		5: "5月", 6: "6月", 7: "7月", 8: "8月",
		9: "9月", 10: "10月", 11: "11月", 12: "12月",
	}
	name := monthNames[month]

	if avgChange > 5 {
		return fmt.Sprintf("%s通常为需求旺季，历史均价环比上涨 %.1f%%，可关注补库节奏", name, avgChange)
	} else if avgChange > 2 {
		return fmt.Sprintf("%s历史均价环比上涨 %.1f%%，市场活跃度较高", name, avgChange)
	} else if avgChange < -5 {
		return fmt.Sprintf("%s通常为传统淡季，历史均价环比下跌 %.1f%%，建议控制库存", name, math.Abs(avgChange))
	} else if avgChange < -2 {
		return fmt.Sprintf("%s历史均价环比下跌 %.1f%%，市场需求偏弱", name, math.Abs(avgChange))
	}
	return fmt.Sprintf("%s价格波动较小，环比变化约 %.1f%%", name, avgChange)
}
