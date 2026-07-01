// Package subagent provides domain-specific SubAgent implementations for the
// multi-agent orchestrator. Each SubAgent wraps existing service-layer logic
// and is responsible for executing plan steps within its domain.
//
// Full business logic integration will be completed in Phase 2.
package subagent

import (
	"context"
	"encoding/json"
	"fmt"

	"steel-agent-backend/internal/service"
)

// ============================================================================
// PriceAgent — handles price queries, trends, and predictions.
// ============================================================================

// PriceAgent handles steel price queries, trend analysis, and predictions.
type PriceAgent struct {
	priceService *service.PriceService
}

// NewPriceAgent creates a new PriceAgent wrapping the given PriceService.
func NewPriceAgent(priceService *service.PriceService) *PriceAgent {
	return &PriceAgent{priceService: priceService}
}

// Name returns the agent identifier used in PlanStep.SubAgentName routing.
func (a *PriceAgent) Name() string { return "price_agent" }

// Execute handles price-related steps: query_steel_price, get_price_trend.
// Full business logic will be wired in Phase 2; currently returns stub results.
func (a *PriceAgent) Execute(ctx context.Context, step service.PlanStep, workMemory map[string]string) (*service.StepResult, error) {
	switch step.ToolName {
	case "query_steel_price":
		return a.executePriceQuery(ctx, step, workMemory)
	case "get_price_trend":
		return a.executePriceTrend(ctx, step, workMemory)
	default:
		return &service.StepResult{
			StepIndex: step.Step,
			Success:   true,
			Result:    fmt.Sprintf(`{"agent":"price_agent","tool":"%s","message":"stub result - full logic in Phase 2"}`, step.ToolName),
		}, nil
	}
}

func (a *PriceAgent) executePriceQuery(ctx context.Context, step service.PlanStep, workMemory map[string]string) (*service.StepResult, error) {
	category, _ := step.Params["category"].(string)
	spec, _ := step.Params["spec"].(string)
	region, _ := step.Params["region"].(string)

	// Stub: In Phase 2, delegate to a.priceService.GetLatestPrice(ctx, category)
	_ = a.priceService

	result := map[string]interface{}{
		"agent":    "price_agent",
		"tool":     "query_steel_price",
		"source":   "stub",
		"category": category,
		"spec":     spec,
		"region":   region,
		"price":    3850.00,
		"message":  "stub result - full logic in Phase 2",
	}
	resultJSON, _ := json.Marshal(result)

	return &service.StepResult{
		StepIndex: step.Step,
		Success:   true,
		Result:    string(resultJSON),
	}, nil
}

func (a *PriceAgent) executePriceTrend(ctx context.Context, step service.PlanStep, workMemory map[string]string) (*service.StepResult, error) {
	category, _ := step.Params["category"].(string)
	days := 7
	if d, ok := step.Params["days"].(float64); ok {
		days = int(d)
	}

	_ = a.priceService

	result := map[string]interface{}{
		"agent":    "price_agent",
		"tool":     "get_price_trend",
		"source":   "stub",
		"category": category,
		"days":     days,
		"trend":    "stable",
		"message":  "stub result - full logic in Phase 2",
	}
	resultJSON, _ := json.Marshal(result)

	return &service.StepResult{
		StepIndex: step.Step,
		Success:   true,
		Result:    string(resultJSON),
	}, nil
}

// ============================================================================
// QuotationAgent — handles PDF parsing, quotation calculation, PDF generation.
// ============================================================================

// QuotationAgent handles quotation calculation, PDF parsing, and PDF generation.
type QuotationAgent struct {
	quotationService *service.QuotationService
}

// NewQuotationAgent creates a new QuotationAgent wrapping the given QuotationService.
func NewQuotationAgent(quotationService *service.QuotationService) *QuotationAgent {
	return &QuotationAgent{quotationService: quotationService}
}

// Name returns the agent identifier used in PlanStep.SubAgentName routing.
func (a *QuotationAgent) Name() string { return "quotation_agent" }

// Execute handles quotation-related steps: calculate_quotation, create_quotation.
// Full business logic will be wired in Phase 2; currently returns stub results.
func (a *QuotationAgent) Execute(ctx context.Context, step service.PlanStep, workMemory map[string]string) (*service.StepResult, error) {
	switch step.ToolName {
	case "calculate_quotation":
		return a.executeCalculateQuotation(ctx, step, workMemory)
	default:
		return &service.StepResult{
			StepIndex: step.Step,
			Success:   true,
			Result:    fmt.Sprintf(`{"agent":"quotation_agent","tool":"%s","message":"stub result - full logic in Phase 2"}`, step.ToolName),
		}, nil
	}
}

func (a *QuotationAgent) executeCalculateQuotation(ctx context.Context, step service.PlanStep, workMemory map[string]string) (*service.StepResult, error) {
	category, _ := step.Params["category"].(string)
	spec, _ := step.Params["spec"].(string)
	var quantity float64 = 1
	if q, ok := step.Params["quantity"].(float64); ok {
		quantity = q
	}

	// Stub: In Phase 2, delegate to a.quotationService.CalculateQuotation(ctx, category, spec, quantity)
	_ = a.quotationService

	result := map[string]interface{}{
		"agent":         "quotation_agent",
		"tool":          "calculate_quotation",
		"source":        "stub",
		"category":      category,
		"spec":          spec,
		"quantity":      quantity,
		"material_cost": 385000.00,
		"process_cost":  30800.00,
		"freight_cost":  5000.00,
		"tax_cost":      54694.00,
		"total_price":   475494.00,
		"message":       "stub result - full logic in Phase 2",
	}
	resultJSON, _ := json.Marshal(result)

	return &service.StepResult{
		StepIndex: step.Step,
		Success:   true,
		Result:    string(resultJSON),
	}, nil
}

// ============================================================================
// TenderAgent — handles tender search, matching, and recommendations.
// ============================================================================

// TenderAgent handles tender search, matching, and recommendation logic.
type TenderAgent struct {
	tenderService *service.TenderService
}

// NewTenderAgent creates a new TenderAgent wrapping the given TenderService.
func NewTenderAgent(tenderService *service.TenderService) *TenderAgent {
	return &TenderAgent{tenderService: tenderService}
}

// Name returns the agent identifier used in PlanStep.SubAgentName routing.
func (a *TenderAgent) Name() string { return "tender_agent" }

// Execute handles tender-related steps: query_tender.
// Full business logic will be wired in Phase 2; currently returns stub results.
func (a *TenderAgent) Execute(ctx context.Context, step service.PlanStep, workMemory map[string]string) (*service.StepResult, error) {
	keyword, _ := step.Params["keyword"].(string)
	region, _ := step.Params["region"].(string)
	status, _ := step.Params["status"].(string)

	// Stub: In Phase 2, delegate to a.tenderService.GetTenderList
	_ = a.tenderService

	result := map[string]interface{}{
		"agent":   "tender_agent",
		"tool":    step.ToolName,
		"source":  "stub",
		"keyword": keyword,
		"region":  region,
		"status":  status,
		"tenders": []map[string]interface{}{
			{
				"title":    "stub tender - 螺纹钢采购招标",
				"region":   region,
				"budget":   5000000.00,
				"deadline": "2026-07-15",
			},
		},
		"message": "stub result - full logic in Phase 2",
	}
	resultJSON, _ := json.Marshal(result)

	return &service.StepResult{
		StepIndex: step.Step,
		Success:   true,
		Result:    string(resultJSON),
	}, nil
}

// ============================================================================
// KnowledgeAgent — handles standard queries, grade comparison, terminology.
// ============================================================================

// KnowledgeAgent handles knowledge base queries, standard comparison, and terminology.
type KnowledgeAgent struct {
	knowledgeService *service.KnowledgeService
}

// NewKnowledgeAgent creates a new KnowledgeAgent wrapping the given KnowledgeService.
func NewKnowledgeAgent(knowledgeService *service.KnowledgeService) *KnowledgeAgent {
	return &KnowledgeAgent{knowledgeService: knowledgeService}
}

// Name returns the agent identifier used in PlanStep.SubAgentName routing.
func (a *KnowledgeAgent) Name() string { return "knowledge_agent" }

// Execute handles knowledge-related steps: search_knowledge.
// Full business logic will be wired in Phase 2; currently returns stub results.
func (a *KnowledgeAgent) Execute(ctx context.Context, step service.PlanStep, workMemory map[string]string) (*service.StepResult, error) {
	query, _ := step.Params["query"].(string)
	knowledgeType, _ := step.Params["type"].(string)

	// Stub: In Phase 2, delegate to a.knowledgeService.Search
	_ = a.knowledgeService

	result := map[string]interface{}{
		"agent":   "knowledge_agent",
		"tool":    step.ToolName,
		"source":  "stub",
		"query":   query,
		"type":    knowledgeType,
		"results": []map[string]interface{}{
			{
				"title":   "stub knowledge - GB/T 1499.2-2018 钢筋混凝土用钢",
				"type":    "standard",
				"snippet": "热轧带肋钢筋的技术要求...",
			},
		},
		"message": "stub result - full logic in Phase 2",
	}
	resultJSON, _ := json.Marshal(result)

	return &service.StepResult{
		StepIndex: step.Step,
		Success:   true,
		Result:    string(resultJSON),
	}, nil
}

// ============================================================================
// AlertAgent — handles price alerts, unit conversion, weight calculation.
// ============================================================================

// AlertAgent handles price alerts, unit conversion, and weight calculation.
type AlertAgent struct {
	alertService *service.AlertService
}

// NewAlertAgent creates a new AlertAgent wrapping the given AlertService.
func NewAlertAgent(alertService *service.AlertService) *AlertAgent {
	return &AlertAgent{alertService: alertService}
}

// Name returns the agent identifier used in PlanStep.SubAgentName routing.
func (a *AlertAgent) Name() string { return "alert_agent" }

// Execute handles alert/utility-related steps: set_price_alert, convert_unit, calculate_weight.
// Full business logic will be wired in Phase 2; currently returns stub results.
func (a *AlertAgent) Execute(ctx context.Context, step service.PlanStep, workMemory map[string]string) (*service.StepResult, error) {
	switch step.ToolName {
	case "set_price_alert":
		return a.executeSetPriceAlert(ctx, step, workMemory)
	case "convert_unit":
		return a.executeConvertUnit(ctx, step, workMemory)
	case "calculate_weight":
		return a.executeCalculateWeight(ctx, step, workMemory)
	default:
		return &service.StepResult{
			StepIndex: step.Step,
			Success:   true,
			Result:    fmt.Sprintf(`{"agent":"alert_agent","tool":"%s","message":"stub result - full logic in Phase 2"}`, step.ToolName),
		}, nil
	}
}

func (a *AlertAgent) executeSetPriceAlert(ctx context.Context, step service.PlanStep, workMemory map[string]string) (*service.StepResult, error) {
	category, _ := step.Params["category"].(string)
	targetPrice, _ := step.Params["target_price"].(float64)
	condition, _ := step.Params["condition"].(string)

	_ = a.alertService

	result := map[string]interface{}{
		"agent":        "alert_agent",
		"tool":         "set_price_alert",
		"category":     category,
		"target_price": targetPrice,
		"condition":    condition,
		"alert_id":     1,
		"message":      "stub result - full logic in Phase 2",
	}
	resultJSON, _ := json.Marshal(result)

	return &service.StepResult{
		StepIndex: step.Step,
		Success:   true,
		Result:    string(resultJSON),
	}, nil
}

func (a *AlertAgent) executeConvertUnit(ctx context.Context, step service.PlanStep, workMemory map[string]string) (*service.StepResult, error) {
	value, _ := step.Params["value"].(float64)
	fromUnit, _ := step.Params["from_unit"].(string)
	toUnit, _ := step.Params["to_unit"].(string)

	result := map[string]interface{}{
		"agent":     "alert_agent",
		"tool":      "convert_unit",
		"value":     value,
		"from_unit": fromUnit,
		"to_unit":   toUnit,
		"result":    value, // stub: identity conversion
		"message":   "stub result - full logic in Phase 2",
	}
	resultJSON, _ := json.Marshal(result)

	return &service.StepResult{
		StepIndex: step.Step,
		Success:   true,
		Result:    string(resultJSON),
	}, nil
}

func (a *AlertAgent) executeCalculateWeight(ctx context.Context, step service.PlanStep, workMemory map[string]string) (*service.StepResult, error) {
	spec, _ := step.Params["spec"].(string)
	length, _ := step.Params["length"].(float64)
	quantity, _ := step.Params["quantity"].(float64)

	result := map[string]interface{}{
		"agent":    "alert_agent",
		"tool":     "calculate_weight",
		"spec":     spec,
		"length":   length,
		"quantity": quantity,
		"weight":   length * quantity * 7.85, // stub: rough estimate
		"unit":     "kg",
		"message":  "stub result - full logic in Phase 2",
	}
	resultJSON, _ := json.Marshal(result)

	return &service.StepResult{
		StepIndex: step.Step,
		Success:   true,
		Result:    string(resultJSON),
	}, nil
}
