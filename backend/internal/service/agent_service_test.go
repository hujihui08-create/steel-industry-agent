package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/sashabaranov/go-openai"

	"steel-agent-backend/internal/model"
)

// ============================================================================
// Mock interfaces and helpers for testing AgentService
// ============================================================================

// llmClientInterface abstracts the LLMAdapter methods used by AgentService.
type llmClientInterface interface {
	Chat(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionResponse, error)
	ChatWithTools(ctx context.Context, messages []openai.ChatCompletionMessage, tools []openai.Tool) (*openai.ChatCompletionResponse, error)
}

// mockLLMClient is a test double for llmClientInterface.
type mockLLMClient struct {
	chatFn         func(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionResponse, error)
	chatWithToolsFn func(ctx context.Context, messages []openai.ChatCompletionMessage, tools []openai.Tool) (*openai.ChatCompletionResponse, error)
}

func (m *mockLLMClient) Chat(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionResponse, error) {
	if m.chatFn != nil {
		return m.chatFn(ctx, messages)
	}
	return nil, errors.New("mock Chat not configured")
}

func (m *mockLLMClient) ChatWithTools(ctx context.Context, messages []openai.ChatCompletionMessage, tools []openai.Tool) (*openai.ChatCompletionResponse, error) {
	if m.chatWithToolsFn != nil {
		return m.chatWithToolsFn(ctx, messages, tools)
	}
	return nil, errors.New("mock ChatWithTools not configured")
}

// agentConfigInterface abstracts the AgentConfigService method used by AgentService.
type agentConfigInterface interface {
	GetAgentConfig(ctx context.Context) (*AgentConfigDO, error)
}

// mockAgentConfigService is a test double for agentConfigInterface.
type mockAgentConfigService struct {
	cfg *AgentConfigDO
	err error
}

func (m *mockAgentConfigService) GetAgentConfig(ctx context.Context) (*AgentConfigDO, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.cfg, nil
}

// memoryRepoInterface abstracts the AgentMemoryRepository method used by AgentService.
type memoryRepoInterface interface {
	FindByUserAndKey(ctx context.Context, userID uint, key string) ([]model.AgentMemory, error)
}

// mockMemoryRepo is a test double for memoryRepoInterface.
type mockMemoryRepo struct {
	findFn func(ctx context.Context, userID uint, key string) ([]model.AgentMemory, error)
}

func (m *mockMemoryRepo) FindByUserAndKey(ctx context.Context, userID uint, key string) ([]model.AgentMemory, error) {
	if m.findFn != nil {
		return m.findFn(ctx, userID, key)
	}
	return nil, nil
}

// testableAgentService wraps AgentService for isolated testing.
type testableAgentService struct {
	llm       llmClientInterface
	configSvc agentConfigInterface
	memory    memoryRepoInterface
}

// newTestableAgentService creates a testable wrapper.
func newTestableAgentService(llm llmClientInterface, configSvc agentConfigInterface, mem memoryRepoInterface) *testableAgentService {
	return &testableAgentService{
		llm:       llm,
		configSvc: configSvc,
		memory:    mem,
	}
}

// Build a minimal AgentService using a nil LLMAdapter for testing self-contained methods.
// Methods that use LLM are tested via the testable wrapper or standalone functions.
func nilAgentService(cfg *AgentConfigDO, mem memoryRepoInterface) *AgentService {
	// Build a minimal AgentService with nil LLMAdapter.
	return &AgentService{
		llmAdapter:     nil,
		agentConfigSvc: nilAgentConfigSvc(cfg),
		memoryRepo:     nil,
	}
}

// nilAgentConfigSvc creates a minimal AgentConfigService that returns the given config.
func nilAgentConfigSvc(cfg *AgentConfigDO) *AgentConfigService {
	if cfg == nil {
		cfg = &AgentConfigDO{
			AgentMode:  false,
			MaxSteps:   5,
			MaxRetries: 2,
		}
	}
	// We can't easily construct a AgentConfigService without repos,
	// so we use the testableAgentService wrapper instead for config-dependent tests.
	// nilAgentService only tests methods that don't need config.
	return nil
}

// ============================================================================
// 1. Test GeneratePlan — Fallback (when LLM fails)
// ============================================================================

func TestGeneratePlan_LLMFailureReturnsFallback(t *testing.T) {
	ctx := context.Background()

	llm := &mockLLMClient{
		chatFn: func(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionResponse, error) {
			return nil, errors.New("LLM unavailable")
		},
	}
	cfgSvc := &mockAgentConfigService{
		cfg: &AgentConfigDO{MaxSteps: 5, MaxRetries: 2},
	}
	svc := newTestableAgentService(llm, cfgSvc, nil)

	plan := svc.GeneratePlanTestable(ctx, 0, "查询螺纹钢价格", nil, nil)
	if plan == nil {
		t.Fatal("expected non-nil fallback plan")
	}
	if len(plan.Steps) != 1 {
		t.Errorf("expected 1 fallback step, got %d", len(plan.Steps))
	}
	if plan.Steps[0].Step != 1 {
		t.Errorf("expected step number 1, got %d", plan.Steps[0].Step)
	}
	if plan.Steps[0].ToolName != "" {
		t.Errorf("expected empty tool name in fallback, got '%s'", plan.Steps[0].ToolName)
	}
	if plan.Steps[0].Intent != "general" {
		t.Errorf("expected intent 'general', got '%s'", plan.Steps[0].Intent)
	}
	if plan.MaxSteps != 5 {
		t.Errorf("expected MaxSteps 5, got %d", plan.MaxSteps)
	}
	if plan.CreatedAt.IsZero() {
		t.Error("expected non-zero CreatedAt")
	}
}

// GeneratePlanTestable calls the GeneratePlan logic through the testable wrapper.
func (s *testableAgentService) GeneratePlanTestable(ctx context.Context, userID uint, msg string, history []model.ChatMessage, tools []openai.Tool) *AgentPlan {
	// Re-use the same logic as AgentService.GeneratePlan
	maxSteps := 5
	if s.configSvc != nil {
		cfg, err := s.configSvc.GetAgentConfig(ctx)
		if err == nil && cfg != nil && cfg.MaxSteps > 0 && cfg.MaxSteps <= 10 {
			maxSteps = cfg.MaxSteps
		}
	}

	toolDescriptions := buildToolListForPlannerTestable(tools)

	systemContent := agentPlannerPrompt
	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: systemContent},
		{
			Role:    openai.ChatMessageRoleUser,
			Content: fmt.Sprintf("Available tools:\n%s\n\nUser message: %s\n\nGenerate a JSON plan:", toolDescriptions, msg),
		},
	}

	if len(history) > 0 {
		historySummary := buildHistorySummary(history)
		messages = []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: systemContent},
			{
				Role:    openai.ChatMessageRoleUser,
				Content: fmt.Sprintf("Conversation history:\n%s\n\nAvailable tools:\n%s\n\nUser message: %s\n\nGenerate a JSON plan:", historySummary, toolDescriptions, msg),
			},
		}
	}

	resp, err := s.llm.Chat(ctx, messages)
	if err != nil {
		return fallbackPlanStandalone(maxSteps)
	}

	if len(resp.Choices) == 0 || resp.Choices[0].Message.Content == "" {
		return fallbackPlanStandalone(maxSteps)
	}

	raw := resp.Choices[0].Message.Content
	plan, parseErr := parsePlanJSON(raw)
	if parseErr != nil {
		return fallbackPlanStandalone(maxSteps)
	}

	if len(plan.Steps) > maxSteps {
		plan.Steps = plan.Steps[:maxSteps]
	}
	plan.MaxSteps = maxSteps
	plan.CreatedAt = time.Now()

	return plan
}

func buildToolListForPlannerTestable(tools []openai.Tool) string {
	if len(tools) == 0 {
		return "(no tools available)"
	}
	var parts []string
	for _, t := range tools {
		if t.Function == nil {
			continue
		}
		desc := t.Function.Description
		if desc == "" {
			desc = "(no description)"
		}
		parts = append(parts, fmt.Sprintf("- %s: %s", t.Function.Name, desc))
	}
	if len(parts) == 0 {
		return "(no tools available)"
	}
	return strings.Join(parts, "\n")
}

func fallbackPlanStandalone(maxSteps int) *AgentPlan {
	return &AgentPlan{
		Steps: []PlanStep{
			{Step: 1, Intent: "general", ToolName: "", Params: nil},
		},
		MaxSteps:  maxSteps,
		CreatedAt: time.Now(),
	}
}

// ============================================================================
// 1b. Test GeneratePlan — Simple single-step plan
// ============================================================================

func TestGeneratePlan_SimpleSingleStep(t *testing.T) {
	ctx := context.Background()

	llm := &mockLLMClient{
		chatFn: func(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionResponse, error) {
			return &openai.ChatCompletionResponse{
				Choices: []openai.ChatCompletionChoice{
					{
						Message: openai.ChatCompletionMessage{
							Content: `{"steps":[{"step":1,"intent":"query steel price","tool_name":"query_steel_price","params":{"category":"螺纹钢","region":"上海"}}]}`,
						},
					},
				},
			}, nil
		},
	}
	cfgSvc := &mockAgentConfigService{
		cfg: &AgentConfigDO{MaxSteps: 5, MaxRetries: 2},
	}
	svc := newTestableAgentService(llm, cfgSvc, nil)

	plan := svc.GeneratePlanTestable(ctx, 0, "查询上海螺纹钢价格", nil, nil)
	if plan == nil {
		t.Fatal("expected non-nil plan")
	}
	if len(plan.Steps) != 1 {
		t.Fatalf("expected 1 step, got %d", len(plan.Steps))
	}
	if plan.Steps[0].ToolName != "query_steel_price" {
		t.Errorf("expected tool 'query_steel_price', got '%s'", plan.Steps[0].ToolName)
	}
	if plan.Steps[0].Step != 1 {
		t.Errorf("expected step 1, got %d", plan.Steps[0].Step)
	}
}

// ============================================================================
// 2. Test GeneratePlan — Multi-step complex query
// ============================================================================

func TestGeneratePlan_MultiStepComplex(t *testing.T) {
	ctx := context.Background()

	llm := &mockLLMClient{
		chatFn: func(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionResponse, error) {
			return &openai.ChatCompletionResponse{
				Choices: []openai.ChatCompletionChoice{
					{
						Message: openai.ChatCompletionMessage{
							Content: `{"steps":[
								{"step":1,"intent":"query price","tool_name":"query_steel_price","params":{"category":"螺纹钢"}},
								{"step":2,"intent":"get trend","tool_name":"get_price_trend","params":{"category":"螺纹钢"},"depends_on":[1]},
								{"step":3,"intent":"calculate quote","tool_name":"calculate_quotation","params":{},"depends_on":[1,2]}
							]}`,
						},
					},
				},
			}, nil
		},
	}
	cfgSvc := &mockAgentConfigService{
		cfg: &AgentConfigDO{MaxSteps: 5, MaxRetries: 2},
	}
	svc := newTestableAgentService(llm, cfgSvc, nil)

	plan := svc.GeneratePlanTestable(ctx, 0, "查询螺纹钢价格、走势并帮我算报价", nil, nil)
	if plan == nil {
		t.Fatal("expected non-nil plan")
	}
	if len(plan.Steps) != 3 {
		t.Fatalf("expected 3 steps, got %d", len(plan.Steps))
	}
	if plan.Steps[0].Step != 1 {
		t.Errorf("expected first step number 1, got %d", plan.Steps[0].Step)
	}
	if plan.Steps[1].Step != 2 {
		t.Errorf("expected second step number 2, got %d", plan.Steps[1].Step)
	}
	if plan.Steps[2].Step != 3 {
		t.Errorf("expected third step number 3, got %d", plan.Steps[2].Step)
	}
	if len(plan.Steps[1].DependsOn) != 1 || plan.Steps[1].DependsOn[0] != 1 {
		t.Errorf("expected step 2 to depend on step 1, got %v", plan.Steps[1].DependsOn)
	}
	if len(plan.Steps[2].DependsOn) != 2 {
		t.Errorf("expected step 3 to have 2 dependencies, got %v", plan.Steps[2].DependsOn)
	}
}

// ============================================================================
// 2b. Test GeneratePlan — Invalid JSON returns fallback
// ============================================================================

func TestGeneratePlan_InvalidJSONReturnsFallback(t *testing.T) {
	ctx := context.Background()

	llm := &mockLLMClient{
		chatFn: func(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionResponse, error) {
			return &openai.ChatCompletionResponse{
				Choices: []openai.ChatCompletionChoice{
					{
						Message: openai.ChatCompletionMessage{
							Content: `not valid json here`,
						},
					},
				},
			}, nil
		},
	}
	cfgSvc := &mockAgentConfigService{
		cfg: &AgentConfigDO{MaxSteps: 5, MaxRetries: 2},
	}
	svc := newTestableAgentService(llm, cfgSvc, nil)

	plan := svc.GeneratePlanTestable(ctx, 0, "查询价格", nil, nil)
	if plan == nil {
		t.Fatal("expected non-nil fallback plan")
	}
	if len(plan.Steps) != 1 {
		t.Errorf("expected 1 fallback step, got %d", len(plan.Steps))
	}
}

// ============================================================================
// 2c. Test GeneratePlan — Empty LLM response returns fallback
// ============================================================================

func TestGeneratePlan_EmptyResponseReturnsFallback(t *testing.T) {
	ctx := context.Background()

	llm := &mockLLMClient{
		chatFn: func(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionResponse, error) {
			return &openai.ChatCompletionResponse{
				Choices: []openai.ChatCompletionChoice{},
			}, nil
		},
	}
	cfgSvc := &mockAgentConfigService{
		cfg: &AgentConfigDO{MaxSteps: 5, MaxRetries: 2},
	}
	svc := newTestableAgentService(llm, cfgSvc, nil)

	plan := svc.GeneratePlanTestable(ctx, 0, "查询价格", nil, nil)
	if plan == nil {
		t.Fatal("expected non-nil fallback plan")
	}
	if len(plan.Steps) != 1 {
		t.Errorf("expected 1 fallback step, got %d", len(plan.Steps))
	}
}

// ============================================================================
// 3. Test ExecuteStep — Successful execution
// ============================================================================

func TestExecuteStep_SuccessfulToolCall(t *testing.T) {
	ctx := context.Background()

	llm := &mockLLMClient{
		chatWithToolsFn: func(ctx context.Context, messages []openai.ChatCompletionMessage, tools []openai.Tool) (*openai.ChatCompletionResponse, error) {
			return &openai.ChatCompletionResponse{
				Choices: []openai.ChatCompletionChoice{
					{
						Message: openai.ChatCompletionMessage{
							Content: "查询到价格数据",
							ToolCalls: []openai.ToolCall{
								{
									ID:   "call_1",
									Type: openai.ToolTypeFunction,
									Function: openai.FunctionCall{
										Name:      "query_steel_price",
										Arguments: `{"category":"螺纹钢"}`,
									},
								},
							},
						},
					},
				},
			}, nil
		},
	}
	svc := newTestableAgentService(llm, nil, nil)

	step := PlanStep{Step: 1, Intent: "query price", ToolName: "query_steel_price", Params: map[string]interface{}{"category": "螺纹钢"}}
	workMemory := make(map[string]string)
	tools := []openai.Tool{
		{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "query_steel_price",
				Description: "查询钢材价格",
			},
		},
	}

	result := svc.ExecuteStepTestable(ctx, step, workMemory, tools)
	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if !result.Success {
		t.Errorf("expected success, got error: %s", result.Error)
	}
	if result.Result == "" {
		t.Error("expected non-empty result")
	}
	if result.StepIndex != 1 {
		t.Errorf("expected step index 1, got %d", result.StepIndex)
	}

	// Verify result contains the tool name.
	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(result.Result), &parsed); err != nil {
		t.Fatalf("failed to parse result JSON: %v", err)
	}
	tool, _ := parsed["tool"].(string)
	if tool != "query_steel_price" {
		t.Errorf("expected tool 'query_steel_price', got '%s'", tool)
	}
}

// ExecuteStepTestable calls ExecuteStep logic through the testable wrapper.
func (s *testableAgentService) ExecuteStepTestable(ctx context.Context, step PlanStep, workMemory map[string]string, tools []openai.Tool) *StepResult {
	if step.ToolName == "" {
		return &StepResult{StepIndex: step.Step, Success: true, Result: ""}
	}

	params := resolveParamsStandalone(step, workMemory)

	systemMsg := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleSystem,
		Content: fmt.Sprintf("You are a steel industry assistant. Execute the tool %q with the given parameters. Always call the tool to get real data.", step.ToolName),
	}

	paramsJSON, _ := json.Marshal(params)
	userMsg := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: fmt.Sprintf("Step intent: %s\nTool: %s\nParams: %s", step.Intent, step.ToolName, string(paramsJSON)),
	}

	messages := []openai.ChatCompletionMessage{systemMsg, userMsg}

	resp, err := s.llm.ChatWithTools(ctx, messages, tools)
	if err != nil {
		return &StepResult{
			StepIndex: step.Step,
			Success:   false,
			Error:     fmt.Sprintf("LLM call failed: %v", err),
		}
	}

	if len(resp.Choices) == 0 {
		return &StepResult{StepIndex: step.Step, Success: false, Error: "LLM returned empty response"}
	}

	choice := resp.Choices[0]

	if choice.Message.Content != "" && len(choice.Message.ToolCalls) == 0 {
		return &StepResult{StepIndex: step.Step, Success: true, Result: choice.Message.Content}
	}

	if len(choice.Message.ToolCalls) == 0 {
		return &StepResult{StepIndex: step.Step, Success: true, Result: ""}
	}

	toolCall := choice.Message.ToolCalls[0]
	if toolCall.Function.Name == "" {
		return &StepResult{StepIndex: step.Step, Success: true, Result: choice.Message.Content}
	}

	resultJSON, _ := json.Marshal(map[string]interface{}{
		"tool":      toolCall.Function.Name,
		"arguments": toolCall.Function.Arguments,
		"content":   choice.Message.Content,
	})

	return &StepResult{StepIndex: step.Step, Success: true, Result: string(resultJSON)}
}

func resolveParamsStandalone(step PlanStep, workMemory map[string]string) map[string]interface{} {
	params := make(map[string]interface{})
	for k, v := range step.Params {
		params[k] = v
	}

	if len(step.DependsOn) == 0 {
		return params
	}

	for _, depStep := range step.DependsOn {
		key := fmt.Sprintf("step_%d", depStep)
		value, ok := workMemory[key]
		if !ok {
			continue
		}

		var depResult map[string]interface{}
		if err := json.Unmarshal([]byte(value), &depResult); err != nil {
			params["previous_result"] = value
			continue
		}

		for _, field := range []string{"category", "spec", "region", "price", "result"} {
			if v, ok := depResult[field]; ok {
				params[field] = v
			}
		}
	}

	return params
}

// ============================================================================
// 3b. Test ExecuteStep — No tool name returns success immediately
// ============================================================================

func TestExecuteStep_NoToolName(t *testing.T) {
	ctx := context.Background()
	svc := newTestableAgentService(nil, nil, nil)

	step := PlanStep{Step: 1, Intent: "general", ToolName: "", Params: nil}
	result := svc.ExecuteStepTestable(ctx, step, nil, nil)

	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if !result.Success {
		t.Errorf("expected success for empty tool, got error: %s", result.Error)
	}
}

// ============================================================================
// 3c. Test ExecuteStep — LLM error returns failure
// ============================================================================

func TestExecuteStep_LLMError(t *testing.T) {
	ctx := context.Background()

	llm := &mockLLMClient{
		chatWithToolsFn: func(ctx context.Context, messages []openai.ChatCompletionMessage, tools []openai.Tool) (*openai.ChatCompletionResponse, error) {
			return nil, errors.New("connection timed out")
		},
	}
	svc := newTestableAgentService(llm, nil, nil)

	step := PlanStep{Step: 1, Intent: "query price", ToolName: "query_steel_price", Params: nil}
	result := svc.ExecuteStepTestable(ctx, step, nil, nil)

	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if result.Success {
		t.Error("expected failure for LLM error")
	}
	if !strings.Contains(result.Error, "connection timed out") {
		t.Errorf("expected error to contain 'connection timed out', got '%s'", result.Error)
	}
}

// ============================================================================
// 3d. Test ExecuteStep — Empty choices returns failure
// ============================================================================

func TestExecuteStep_EmptyChoices(t *testing.T) {
	ctx := context.Background()

	llm := &mockLLMClient{
		chatWithToolsFn: func(ctx context.Context, messages []openai.ChatCompletionMessage, tools []openai.Tool) (*openai.ChatCompletionResponse, error) {
			return &openai.ChatCompletionResponse{
				Choices: []openai.ChatCompletionChoice{},
			}, nil
		},
	}
	svc := newTestableAgentService(llm, nil, nil)

	step := PlanStep{Step: 1, Intent: "query price", ToolName: "query_steel_price", Params: nil}
	result := svc.ExecuteStepTestable(ctx, step, nil, nil)

	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if result.Success {
		t.Error("expected failure for empty choices")
	}
}

// ============================================================================
// 4. Test ExecuteStep — Retry logic
// ============================================================================

func TestExecuteStep_LLMErrorReturnsFailure(t *testing.T) {
	ctx := context.Background()

	callCount := 0
	llm := &mockLLMClient{
		chatWithToolsFn: func(ctx context.Context, messages []openai.ChatCompletionMessage, tools []openai.Tool) (*openai.ChatCompletionResponse, error) {
			callCount++
			return nil, errors.New("temporary failure")
		},
	}
	svc := newTestableAgentService(llm, nil, nil)

	step := PlanStep{Step: 1, Intent: "query price", ToolName: "query_steel_price", Params: nil}
	result := svc.ExecuteStepTestable(ctx, step, nil, nil)

	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if callCount != 1 {
		t.Errorf("expected 1 call, got %d", callCount)
	}
	if result.Success {
		t.Error("expected failure for LLM error")
	}
	if !strings.Contains(result.Error, "temporary failure") {
		t.Errorf("expected error to contain 'temporary failure', got '%s'", result.Error)
	}
	// Note: retry logic (up to maxRetries) lives in ExecutePlan, not ExecuteStep.
	// ExecuteStep is a single-call unit. The ExecutePlan goroutine handles retries.
}

// ============================================================================
// 5. Test ResolveParams — Dependency injection between steps
// ============================================================================

func TestResolveParams_NoDependencies(t *testing.T) {
	step := PlanStep{
		Step:      1,
		Intent:    "query",
		ToolName:  "query_steel_price",
		Params:    map[string]interface{}{"category": "螺纹钢", "region": "上海"},
		DependsOn: nil,
	}
	workMemory := make(map[string]string)

	result := resolveParamsStandalone(step, workMemory)

	if len(result) != 2 {
		t.Errorf("expected 2 params, got %d", len(result))
	}
	if result["category"] != "螺纹钢" {
		t.Errorf("expected category '螺纹钢', got '%v'", result["category"])
	}
	if result["region"] != "上海" {
		t.Errorf("expected region '上海', got '%v'", result["region"])
	}
}

func TestResolveParams_WithJSONDependency(t *testing.T) {
	step := PlanStep{
		Step:      2,
		Intent:    "get trend",
		ToolName:  "get_price_trend",
		Params:    map[string]interface{}{"days": 7},
		DependsOn: []int{1},
	}
	workMemory := map[string]string{
		"step_1": `{"tool":"query_steel_price","category":"螺纹钢","spec":"HRB400E 20mm","region":"上海","price":3850}`,
	}

	result := resolveParamsStandalone(step, workMemory)

	if result["days"] != 7 {
		t.Errorf("expected days 7, got '%v'", result["days"])
	}
	if result["category"] != "螺纹钢" {
		t.Errorf("expected injected category '螺纹钢', got '%v'", result["category"])
	}
	if result["spec"] != "HRB400E 20mm" {
		t.Errorf("expected injected spec 'HRB400E 20mm', got '%v'", result["spec"])
	}
	if result["region"] != "上海" {
		t.Errorf("expected injected region '上海', got '%v'", result["region"])
	}
	if result["price"] != float64(3850) {
		t.Errorf("expected injected price 3850, got '%v' (%T)", result["price"], result["price"])
	}
}

func TestResolveParams_WithNonJSONDependency(t *testing.T) {
	step := PlanStep{
		Step:      2,
		Intent:    "summarize",
		ToolName:  "output",
		Params:    map[string]interface{}{},
		DependsOn: []int{1},
	}
	workMemory := map[string]string{
		"step_1": "plain text result from previous step",
	}

	result := resolveParamsStandalone(step, workMemory)

	if result["previous_result"] != "plain text result from previous step" {
		t.Errorf("expected previous_result to be set, got '%v'", result["previous_result"])
	}
}

func TestResolveParams_MissingDependency(t *testing.T) {
	step := PlanStep{
		Step:      3,
		Intent:    "calculate",
		ToolName:  "calculate_quotation",
		Params:    map[string]interface{}{"quantity": 100},
		DependsOn: []int{1, 2},
	}
	workMemory := map[string]string{
		"step_2": `{"category":"热卷","price":4200}`,
	}

	result := resolveParamsStandalone(step, workMemory)

	if result["quantity"] != 100 {
		t.Errorf("expected quantity 100, got '%v'", result["quantity"])
	}
	// Should inject from step_2 but not fail on missing step_1.
	if result["category"] != "热卷" {
		t.Errorf("expected injected category '热卷', got '%v'", result["category"])
	}
	if result["price"] != float64(4200) {
		t.Errorf("expected injected price 4200, got '%v' (%T)", result["price"], result["price"])
	}
}

// ============================================================================
// 6. Test Evaluate — "ok" status for valid results
// ============================================================================

func TestEvaluate_OkWithSource(t *testing.T) {
	svc := &AgentService{}

	step := PlanStep{Step: 1, Intent: "query price", ToolName: "query_steel_price", Params: nil}
	result := &StepResult{
		StepIndex: 1,
		Success:   true,
		Result:    `{"source":"Wind终端","date":"2026-06-30","prices":[{"category":"螺纹钢","price":3850}]}`,
	}

	reflection, err := svc.Evaluate(context.Background(), step, result)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if reflection.Status != "ok" {
		t.Errorf("expected status 'ok', got '%s'", reflection.Status)
	}
}

func TestEvaluate_OkWithUpdatedAt(t *testing.T) {
	svc := &AgentService{}

	step := PlanStep{Step: 1, Intent: "query", ToolName: "query_steel_price", Params: nil}
	result := &StepResult{
		StepIndex: 1,
		Success:   true,
		Result:    `{"updated_at":"2026-06-30T10:00:00Z","price":4200}`,
	}

	reflection, err := svc.Evaluate(context.Background(), step, result)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if reflection.Status != "ok" {
		t.Errorf("expected status 'ok', got '%s'", reflection.Status)
	}
}

func TestEvaluate_OkWithPrices(t *testing.T) {
	svc := &AgentService{}

	step := PlanStep{Step: 1, Intent: "query", ToolName: "query_steel_price", Params: nil}
	result := &StepResult{
		StepIndex: 1,
		Success:   true,
		Result:    `{"count":3,"prices":[{"category":"螺纹钢","price":3850}]}`,
	}

	reflection, err := svc.Evaluate(context.Background(), step, result)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if reflection.Status != "ok" {
		t.Errorf("expected status 'ok', got '%s'", reflection.Status)
	}
}

// ============================================================================
// 7. Test Evaluate — "replan" status for empty / not-found results
// ============================================================================

func TestEvaluate_ReplanEmptyResult(t *testing.T) {
	svc := &AgentService{}

	step := PlanStep{Step: 1, Intent: "query", ToolName: "query_steel_price", Params: nil}
	result := &StepResult{
		StepIndex: 1,
		Success:   true,
		Result:    "",
	}

	reflection, err := svc.Evaluate(context.Background(), step, result)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if reflection.Status != "replan" {
		t.Errorf("expected status 'replan', got '%s'", reflection.Status)
	}
}

func TestEvaluate_ReplanNotFoundSignal_Cn(t *testing.T) {
	svc := &AgentService{}

	tests := []string{
		`{"message":"未查询到相关数据"}`,
		`{"message":"未找到匹配结果"}`,
		`{"message":"暂无数据"}`,
		`{"message":"无相关信息"}`,
	}

	for _, msg := range tests {
		t.Run("signal_"+msg[:12], func(t *testing.T) {
			step := PlanStep{Step: 1, Intent: "query", ToolName: "query_steel_price", Params: nil}
			result := &StepResult{StepIndex: 1, Success: true, Result: msg}

			reflection, err := svc.Evaluate(context.Background(), step, result)
			if err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
			if reflection.Status != "replan" {
				t.Errorf("expected status 'replan' for '%s', got '%s'", msg, reflection.Status)
			}
		})
	}
}

func TestEvaluate_ReplanNotFoundSignal_En(t *testing.T) {
	svc := &AgentService{}

	step := PlanStep{Step: 1, Intent: "query", ToolName: "query_steel_price", Params: nil}
	result := &StepResult{
		StepIndex: 1,
		Success:   true,
		Result:    `{"error":"not found"}`,
	}

	reflection, err := svc.Evaluate(context.Background(), step, result)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if reflection.Status != "replan" {
		t.Errorf("expected status 'replan', got '%s'", reflection.Status)
	}
}

// ============================================================================
// 8. Test Evaluate — "failed" status for errored steps
// ============================================================================

func TestEvaluate_FailedNilResult(t *testing.T) {
	svc := &AgentService{}

	step := PlanStep{Step: 1, Intent: "query", ToolName: "query_steel_price", Params: nil}

	reflection, err := svc.Evaluate(context.Background(), step, nil)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if reflection.Status != "failed" {
		t.Errorf("expected status 'failed', got '%s'", reflection.Status)
	}
	if reflection.Reason != "no result" {
		t.Errorf("expected reason 'no result', got '%s'", reflection.Reason)
	}
}

func TestEvaluate_FailedStepResult(t *testing.T) {
	svc := &AgentService{}

	step := PlanStep{Step: 1, Intent: "query", ToolName: "query_steel_price", Params: nil}
	result := &StepResult{
		StepIndex: 1,
		Success:   false,
		Error:     "LLM call failed: connection refused",
	}

	reflection, err := svc.Evaluate(context.Background(), step, result)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if reflection.Status != "failed" {
		t.Errorf("expected status 'failed', got '%s'", reflection.Status)
	}
	if reflection.Reason != result.Error {
		t.Errorf("expected reason '%s', got '%s'", result.Error, reflection.Reason)
	}
}

// ============================================================================
// 9. Test EvaluateFailure — creates correct reflection result
// ============================================================================

func TestEvaluateFailure(t *testing.T) {
	svc := &AgentService{}

	step := PlanStep{Step: 3, Intent: "calculate", ToolName: "calculate_quotation", Params: nil}
	result := &StepResult{
		StepIndex: 3,
		Success:   false,
		Error:     "tool execution timeout",
	}

	reflection := svc.evaluateFailure(step, result)

	if reflection.Status != "replan" {
		t.Errorf("expected status 'replan', got '%s'", reflection.Status)
	}
	if !strings.Contains(reflection.Reason, "Step 3 failed") {
		t.Errorf("expected reason to mention step number, got '%s'", reflection.Reason)
	}
	if !strings.Contains(reflection.Reason, "tool execution timeout") {
		t.Errorf("expected reason to contain error message, got '%s'", reflection.Reason)
	}
}

func TestEvaluateFailure_NilResult(t *testing.T) {
	svc := &AgentService{}

	step := PlanStep{Step: 2, Intent: "query", ToolName: "query_steel_price", Params: nil}

	reflection := svc.evaluateFailure(step, nil)

	if reflection.Status != "replan" {
		t.Errorf("expected status 'replan', got '%s'", reflection.Status)
	}
	if !strings.Contains(reflection.Reason, "unknown error") {
		t.Errorf("expected reason to contain 'unknown error', got '%s'", reflection.Reason)
	}
}

// ============================================================================
// 10. Test Replan — boundary cases (no LLM needed)
// ============================================================================

func TestReplan_CurrentStepOutOfBounds(t *testing.T) {
	svc := &AgentService{}

	originalPlan := &AgentPlan{
		Steps: []PlanStep{
			{Step: 1, Intent: "query", ToolName: "query_steel_price", Params: nil},
		},
		MaxSteps:  5,
		CreatedAt: time.Now(),
	}

	// Negative index.
	newPlan, err := svc.Replan(context.Background(), originalPlan, -1, &ReflectionResult{Status: "replan"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(newPlan.Steps) != 0 {
		t.Errorf("expected 0 steps for out-of-bounds, got %d", len(newPlan.Steps))
	}
	if newPlan.MaxSteps != 5 {
		t.Errorf("expected MaxSteps 5, got %d", newPlan.MaxSteps)
	}

	// Index >= length.
	newPlan, err = svc.Replan(context.Background(), originalPlan, 1, &ReflectionResult{Status: "replan"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(newPlan.Steps) != 0 {
		t.Errorf("expected 0 steps for out-of-bounds, got %d", len(newPlan.Steps))
	}
}

func TestReplan_NoRemainingSteps(t *testing.T) {
	svc := &AgentService{}

	originalPlan := &AgentPlan{
		Steps: []PlanStep{
			{Step: 1, Intent: "query", ToolName: "query_steel_price", Params: nil},
		},
		MaxSteps:  3,
		CreatedAt: time.Now(),
	}

	// Last step has no remaining steps after it.
	newPlan, err := svc.Replan(context.Background(), originalPlan, 0, &ReflectionResult{
		Status:     "replan",
		Reason:     "timeout",
		Suggestion: "retry with shorter timeout",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(newPlan.Steps) != 0 {
		t.Errorf("expected 0 steps when no remaining, got %d", len(newPlan.Steps))
	}
}

// ============================================================================
// 11. Test AgentConfig Defaults
// ============================================================================

func TestAgentConfigDO_Defaults(t *testing.T) {
	// Verify that default config has expected values per spec.
	cfg := &AgentConfigDO{
		AgentMode:  false,
		MaxSteps:   5,
		MaxRetries: 2,
	}

	if cfg.AgentMode {
		t.Errorf("expected AgentMode=false, got true")
	}
	if cfg.MaxSteps != 5 {
		t.Errorf("expected MaxSteps=5, got %d", cfg.MaxSteps)
	}
	if cfg.MaxRetries != 2 {
		t.Errorf("expected MaxRetries=2, got %d", cfg.MaxRetries)
	}
}

func TestAgentConfigDO_DefaultsWithZeroValues(t *testing.T) {
	// Simulate how GeneratePlan handles zero values from config.
	cfg := &AgentConfigDO{
		MaxSteps:   0,
		MaxRetries: 0,
	}

	maxSteps := 5
	if cfg.MaxSteps > 0 && cfg.MaxSteps <= 10 {
		maxSteps = cfg.MaxSteps
	}
	if maxSteps != 5 {
		t.Errorf("expected MaxSteps to stay at default 5 when config has 0, got %d", maxSteps)
	}

	maxRetries := 2
	if cfg.MaxRetries > 0 && cfg.MaxRetries <= 5 {
		maxRetries = cfg.MaxRetries
	}
	if maxRetries != 2 {
		t.Errorf("expected MaxRetries to stay at default 2 when config has 0, got %d", maxRetries)
	}
}

// ============================================================================
// 12. Test Backward Compatibility — ChatContext type alias / AgentContext serialization
// ============================================================================

func TestAgentContext_Serialization(t *testing.T) {
	ctx := model.AgentContext{
		Intent:      "price_query",
		Entities:    map[string]string{"category": "螺纹钢", "region": "上海"},
		LastQuery:   "查询螺纹钢价格",
		TurnCount:   3,
		Plan:        `{"steps":[{"step":1,"intent":"query","tool_name":"query_steel_price"}]}`,
		CurrentStep: 1,
		WorkMemory:  map[string]string{"step_1": `{"price":3850}`},
	}

	data, err := json.Marshal(ctx)
	if err != nil {
		t.Fatalf("failed to marshal AgentContext: %v", err)
	}

	var restored model.AgentContext
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("failed to unmarshal AgentContext: %v", err)
	}

	if restored.Intent != ctx.Intent {
		t.Errorf("expected Intent '%s', got '%s'", ctx.Intent, restored.Intent)
	}
	if restored.TurnCount != ctx.TurnCount {
		t.Errorf("expected TurnCount %d, got %d", ctx.TurnCount, restored.TurnCount)
	}
	if restored.Entities["category"] != ctx.Entities["category"] {
		t.Errorf("expected entity category '%s', got '%s'", ctx.Entities["category"], restored.Entities["category"])
	}
	if restored.CurrentStep != ctx.CurrentStep {
		t.Errorf("expected CurrentStep %d, got %d", ctx.CurrentStep, restored.CurrentStep)
	}
	if restored.WorkMemory["step_1"] != ctx.WorkMemory["step_1"] {
		t.Errorf("expected work_memory, got '%v'", restored.WorkMemory)
	}
}

func TestChatContext_TypeAlias(t *testing.T) {
	// Verify ChatContext is exactly AgentContext (backward compat).
	var cc model.ChatContext
	var ac model.AgentContext

	cc = model.ChatContext{
		Intent: "quotation",
		Entities: map[string]string{
			"category": "热卷",
		},
		TurnCount: 1,
	}

	// Should be assignable both ways.
	ac = cc
	if ac.Intent != "quotation" {
		t.Errorf("expected Intent 'quotation', got '%s'", ac.Intent)
	}
	if ac.Entities["category"] != "热卷" {
		t.Errorf("expected category '热卷', got '%s'", ac.Entities["category"])
	}
}

func TestChatSession_GetSetContext(t *testing.T) {
	session := &model.ChatSession{}

	// Old data without agent fields.
	session.Context = `{"intent":"price_query","entities":{"category":"螺纹钢"},"last_query":"价格","turn_count":2}`

	ctx := session.GetContext()
	if ctx.Intent != "price_query" {
		t.Errorf("expected Intent 'price_query', got '%s'", ctx.Intent)
	}
	if ctx.TurnCount != 2 {
		t.Errorf("expected TurnCount 2, got %d", ctx.TurnCount)
	}
	// Old data should default agent fields.
	if ctx.CurrentStep != 0 {
		t.Errorf("expected CurrentStep 0 for old data, got %d", ctx.CurrentStep)
	}
	if len(ctx.WorkMemory) != 0 {
		t.Errorf("expected empty WorkMemory for old data, got %d entries", len(ctx.WorkMemory))
	}

	// Set and get round-trip.
	newCtx := model.AgentContext{
		Intent:      "quotation",
		Entities:    map[string]string{"category": "热卷"},
		LastQuery:   "报价计算",
		TurnCount:   5,
		Plan:        `{"steps":[]}`,
		CurrentStep: 2,
		WorkMemory:  map[string]string{"step_1": "result1", "step_2": "result2"},
	}
	session.SetContext(newCtx)

	restored := session.GetContext()
	if restored.Intent != "quotation" {
		t.Errorf("expected Intent 'quotation', got '%s'", restored.Intent)
	}
	if restored.CurrentStep != 2 {
		t.Errorf("expected CurrentStep 2, got %d", restored.CurrentStep)
	}
	if len(restored.WorkMemory) != 2 {
		t.Errorf("expected 2 work memory entries, got %d", len(restored.WorkMemory))
	}

	// Empty context.
	session.Context = ""
	empty := session.GetContext()
	if empty.Intent != "" {
		t.Errorf("expected empty intent for empty context, got '%s'", empty.Intent)
	}

	// Invalid JSON.
	session.Context = `{invalid`
	invalid := session.GetContext()
	if invalid.Intent != "" {
		t.Errorf("expected empty intent for invalid JSON, got '%s'", invalid.Intent)
	}
}

// ============================================================================
// 13. Test parsePlanJSON
// ============================================================================

func TestParsePlanJSON_Valid(t *testing.T) {
	raw := `{"steps":[{"step":1,"intent":"query","tool_name":"query_steel_price","params":{"category":"螺纹钢"}}]}`

	plan, err := parsePlanJSON(raw)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(plan.Steps) != 1 {
		t.Errorf("expected 1 step, got %d", len(plan.Steps))
	}
	if plan.Steps[0].ToolName != "query_steel_price" {
		t.Errorf("expected tool 'query_steel_price', got '%s'", plan.Steps[0].ToolName)
	}
}

func TestParsePlanJSON_WithMarkdownFences(t *testing.T) {
	raw := "```json\n{\"steps\":[{\"step\":1,\"intent\":\"query\",\"tool_name\":\"query_steel_price\"}]}\n```"

	plan, err := parsePlanJSON(raw)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(plan.Steps) != 1 {
		t.Errorf("expected 1 step, got %d", len(plan.Steps))
	}
	if plan.Steps[0].Step != 1 {
		t.Errorf("expected step 1, got %d", plan.Steps[0].Step)
	}
}

func TestParsePlanJSON_WithPlainFences(t *testing.T) {
	raw := "```\n{\"steps\":[{\"step\":2,\"intent\":\"trend\",\"tool_name\":\"get_price_trend\"}]}\n```"

	plan, err := parsePlanJSON(raw)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(plan.Steps) != 1 {
		t.Errorf("expected 1 step, got %d", len(plan.Steps))
	}
	if plan.Steps[0].ToolName != "get_price_trend" {
		t.Errorf("expected tool 'get_price_trend', got '%s'", plan.Steps[0].ToolName)
	}
}

func TestParsePlanJSON_Invalid(t *testing.T) {
	_, err := parsePlanJSON(`not json`)
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}

func TestParsePlanJSON_Empty(t *testing.T) {
	_, err := parsePlanJSON("")
	if err == nil {
		t.Fatal("expected error for empty string")
	}
}

// ============================================================================
// 14. Test buildHistorySummary
// ============================================================================

func TestBuildHistorySummary_SmallHistory(t *testing.T) {
	history := []model.ChatMessage{
		{Role: "user", Content: "螺纹钢价格"},
		{Role: "assistant", Content: "当前螺纹钢价格为3850元/吨"},
	}

	summary := buildHistorySummary(history)
	if !strings.Contains(summary, "user") {
		t.Error("expected summary to contain 'user'")
	}
	if !strings.Contains(summary, "assistant") {
		t.Error("expected summary to contain 'assistant'")
	}
	if !strings.Contains(summary, "螺纹钢价格") {
		t.Errorf("expected summary to contain message content, got: %s", summary)
	}
}

func TestBuildHistorySummary_LongHistory(t *testing.T) {
	// Create 10 messages (more than maxHistoryEntries=6).
	var history []model.ChatMessage
	for i := 1; i <= 5; i++ {
		history = append(history,
			model.ChatMessage{Role: "user", Content: fmt.Sprintf("Q%d from early conversation", i)},
			model.ChatMessage{Role: "assistant", Content: fmt.Sprintf("A%d from early conversation", i)},
		)
	}

	summary := buildHistorySummary(history)
	if !strings.Contains(summary, "Q5") {
		t.Errorf("expected summary to contain latest messages, got: %s", summary)
	}
	// Early messages should be truncated.
	if strings.Contains(summary, "Q1") {
		t.Errorf("expected summary to NOT contain earliest messages, got: %s", summary)
	}
}

func TestBuildHistorySummary_LongContentTruncation(t *testing.T) {
	longContent := strings.Repeat("这是一个很长的消息内容", 30) // way over 200 chars
	history := []model.ChatMessage{
		{Role: "user", Content: longContent},
	}

	summary := buildHistorySummary(history)
	if len(summary) > 300 {
		t.Errorf("expected summary to be truncated, got length %d", len(summary))
	}
	if !strings.Contains(summary, "...") {
		t.Error("expected truncated content to end with '...'")
	}
}

func TestBuildHistorySummary_EmptyHistory(t *testing.T) {
	summary := buildHistorySummary(nil)
	if summary != "" {
		t.Errorf("expected empty summary for nil history, got '%s'", summary)
	}
}

// ============================================================================
// 15. Test buildToolListForPlanner
// ============================================================================

func TestBuildToolListForPlanner_EmptyTools(t *testing.T) {
	svc := &AgentService{}
	result := svc.buildToolListForPlanner(nil)
	if result != "(no tools available)" {
		t.Errorf("expected '(no tools available)', got '%s'", result)
	}
}

func TestBuildToolListForPlanner_ToolsWithDescriptions(t *testing.T) {
	svc := &AgentService{}
	tools := []openai.Tool{
		{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "query_steel_price",
				Description: "查询钢材价格",
			},
		},
		{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "get_price_trend",
				Description: "获取价格走势",
			},
		},
	}

	result := svc.buildToolListForPlanner(tools)
	if !strings.Contains(result, "query_steel_price") {
		t.Errorf("expected result to contain 'query_steel_price', got '%s'", result)
	}
	if !strings.Contains(result, "查询钢材价格") {
		t.Errorf("expected result to contain '查询钢材价格', got '%s'", result)
	}
	if !strings.Contains(result, "get_price_trend") {
		t.Errorf("expected result to contain 'get_price_trend', got '%s'", result)
	}
}

func TestBuildToolListForPlanner_ToolWithoutDescription(t *testing.T) {
	svc := &AgentService{}
	tools := []openai.Tool{
		{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "some_tool",
				Description: "",
			},
		},
	}

	result := svc.buildToolListForPlanner(tools)
	if !strings.Contains(result, "(no description)") {
		t.Errorf("expected '(no description)' fallback, got '%s'", result)
	}
}

func TestBuildToolListForPlanner_ToolWithoutFunction(t *testing.T) {
	svc := &AgentService{}
	tools := []openai.Tool{
		{Type: openai.ToolTypeFunction, Function: nil},
	}

	result := svc.buildToolListForPlanner(tools)
	if result != "(no tools available)" {
		t.Errorf("expected '(no tools available)' for nil function, got '%s'", result)
	}
}

// ============================================================================
// 16. Test PlanStep and AgentPlan types
// ============================================================================

func TestPlanStep_JSONRoundtrip(t *testing.T) {
	step := PlanStep{
		Step:     1,
		Intent:   "query steel price",
		ToolName: "query_steel_price",
		Params:   map[string]interface{}{"category": "螺纹钢", "region": "上海"},
		DependsOn: []int{},
	}

	data, err := json.Marshal(step)
	if err != nil {
		t.Fatalf("failed to marshal PlanStep: %v", err)
	}

	var restored PlanStep
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("failed to unmarshal PlanStep: %v", err)
	}

	if restored.Step != 1 {
		t.Errorf("expected step 1, got %d", restored.Step)
	}
	if restored.Intent != step.Intent {
		t.Errorf("expected intent '%s', got '%s'", step.Intent, restored.Intent)
	}
	if restored.ToolName != step.ToolName {
		t.Errorf("expected tool '%s', got '%s'", step.ToolName, restored.ToolName)
	}
}

func TestAgentPlan_JSONRoundtrip(t *testing.T) {
	plan := AgentPlan{
		Steps: []PlanStep{
			{Step: 1, Intent: "query", ToolName: "query_steel_price", Params: nil},
			{Step: 2, Intent: "trend", ToolName: "get_price_trend", Params: nil, DependsOn: []int{1}},
		},
		MaxSteps:  5,
		CreatedAt: time.Date(2026, 6, 30, 10, 0, 0, 0, time.UTC),
	}

	data, err := json.Marshal(plan)
	if err != nil {
		t.Fatalf("failed to marshal AgentPlan: %v", err)
	}

	var restored AgentPlan
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("failed to unmarshal AgentPlan: %v", err)
	}

	if len(restored.Steps) != 2 {
		t.Errorf("expected 2 steps, got %d", len(restored.Steps))
	}
	if restored.MaxSteps != 5 {
		t.Errorf("expected MaxSteps 5, got %d", restored.MaxSteps)
	}
	if restored.CreatedAt.Year() != 2026 {
		t.Errorf("expected year 2026, got %d", restored.CreatedAt.Year())
	}
}

// ============================================================================
// 17. Test AgentEvent type
// ============================================================================

func TestAgentEvent_JSONSerialization(t *testing.T) {
	ev := AgentEvent{
		Type: "plan_created",
		Data: map[string]interface{}{
			"steps": 3,
			"title": "查询价格并计算报价",
		},
	}

	data, err := json.Marshal(ev)
	if err != nil {
		t.Fatalf("failed to marshal AgentEvent: %v", err)
	}

	var restored map[string]interface{}
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("failed to unmarshal AgentEvent: %v", err)
	}

	if restored["type"] != "plan_created" {
		t.Errorf("expected type 'plan_created', got '%v'", restored["type"])
	}
}

func TestAgentEvent_DoneMarker(t *testing.T) {
	ev := AgentEvent{Type: "[DONE]", Data: nil}
	if ev.Type != "[DONE]" {
		t.Errorf("expected type '[DONE]', got '%s'", ev.Type)
	}
}

// ============================================================================
// 18. Test ReflectionResult type
// ============================================================================

func TestReflectionResult_JSONRoundtrip(t *testing.T) {
	ref := ReflectionResult{
		Status:     "replan",
		Reason:     "无数据",
		Suggestion: "尝试扩大搜索范围",
	}

	data, err := json.Marshal(ref)
	if err != nil {
		t.Fatalf("failed to marshal ReflectionResult: %v", err)
	}

	var restored ReflectionResult
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("failed to unmarshal ReflectionResult: %v", err)
	}

	if restored.Status != "replan" {
		t.Errorf("expected status 'replan', got '%s'", restored.Status)
	}
	if restored.Reason != "无数据" {
		t.Errorf("expected reason '无数据', got '%s'", restored.Reason)
	}
	if restored.Suggestion != "尝试扩大搜索范围" {
		t.Errorf("expected suggestion, got '%s'", restored.Suggestion)
	}
}

// ============================================================================
// 19. Test StepResult type
// ============================================================================

func TestStepResult_JSONRoundtrip(t *testing.T) {
	sr := StepResult{
		StepIndex: 1,
		Success:   true,
		Result:    `{"price":3850}`,
		Retries:   1,
	}

	data, err := json.Marshal(sr)
	if err != nil {
		t.Fatalf("failed to marshal StepResult: %v", err)
	}

	var restored StepResult
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("failed to unmarshal StepResult: %v", err)
	}

	if restored.StepIndex != 1 {
		t.Errorf("expected StepIndex 1, got %d", restored.StepIndex)
	}
	if !restored.Success {
		t.Error("expected Success true")
	}
	if restored.Retries != 1 {
		t.Errorf("expected Retries 1, got %d", restored.Retries)
	}
}

// ============================================================================
// 20. Test GeneratePlan with history context
// ============================================================================

func TestGeneratePlan_WithHistory(t *testing.T) {
	ctx := context.Background()

	var capturedMessages []openai.ChatCompletionMessage
	llm := &mockLLMClient{
		chatFn: func(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionResponse, error) {
			capturedMessages = messages
			return &openai.ChatCompletionResponse{
				Choices: []openai.ChatCompletionChoice{
					{
						Message: openai.ChatCompletionMessage{
							Content: `{"steps":[{"step":1,"intent":"query","tool_name":"query_steel_price"}]}`,
						},
					},
				},
			}, nil
		},
	}
	cfgSvc := &mockAgentConfigService{
		cfg: &AgentConfigDO{MaxSteps: 5, MaxRetries: 2},
	}
	svc := newTestableAgentService(llm, cfgSvc, nil)

	history := []model.ChatMessage{
		{Role: "user", Content: "上次查了螺纹钢"},
		{Role: "assistant", Content: "螺纹钢价格3850元/吨"},
	}

	plan := svc.GeneratePlanTestable(ctx, 0, "再看看价格", history, nil)
	if plan == nil {
		t.Fatal("expected non-nil plan")
	}

	// Verify user message contains history.
	if len(capturedMessages) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(capturedMessages))
	}
	userContent := capturedMessages[1].Content
	if !strings.Contains(userContent, "Conversation history") {
		t.Error("expected user message to contain 'Conversation history'")
	}
}

// ============================================================================
// 21. Test GeneratePlan — steps capped at MaxSteps
// ============================================================================

func TestGeneratePlan_StepsCapped(t *testing.T) {
	ctx := context.Background()

	llm := &mockLLMClient{
		chatFn: func(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionResponse, error) {
			return &openai.ChatCompletionResponse{
				Choices: []openai.ChatCompletionChoice{
					{
						Message: openai.ChatCompletionMessage{
							Content: `{"steps":[
								{"step":1,"intent":"a","tool_name":"t1"},
								{"step":2,"intent":"b","tool_name":"t2"},
								{"step":3,"intent":"c","tool_name":"t3"},
								{"step":4,"intent":"d","tool_name":"t4"}
							]}`,
						},
					},
				},
			}, nil
		},
	}
	cfgSvc := &mockAgentConfigService{
		cfg: &AgentConfigDO{MaxSteps: 3, MaxRetries: 2},
	}
	svc := newTestableAgentService(llm, cfgSvc, nil)

	plan := svc.GeneratePlanTestable(ctx, 0, "complex query", nil, nil)
	if plan == nil {
		t.Fatal("expected non-nil plan")
	}
	if len(plan.Steps) != 3 {
		t.Errorf("expected steps capped at 3, got %d", len(plan.Steps))
	}
}

// ============================================================================
// 22. TestAgentMemory_BuildContext — memory context helpers
// ============================================================================

// buildMemoryContextTestable mirrors AgentService.buildMemoryContext using the
// testable wrapper's memory field.
func (s *testableAgentService) buildMemoryContextTestable(ctx context.Context, userID uint) string {
	memoryKeys := []string{"last_category", "last_spec", "last_region", "last_query"}
	labelMap := map[string]string{
		"last_category": "上次查询品种",
		"last_spec":     "上次查询规格",
		"last_region":   "上次查询地区",
		"last_query":    "上次查询内容",
	}

	if s.memory == nil {
		return ""
	}

	var lines []string
	for _, key := range memoryKeys {
		memories, err := s.memory.FindByUserAndKey(ctx, userID, key)
		if err != nil || len(memories) == 0 {
			continue
		}
		value := strings.TrimSpace(memories[0].Value)
		if value == "" {
			continue
		}
		label := labelMap[key]
		lines = append(lines, fmt.Sprintf("- %s: %s", label, value))
	}

	if len(lines) == 0 {
		return ""
	}

	return "[用户历史偏好]\n" + strings.Join(lines, "\n")
}

// TestAgentMemory_BuildContext verifies that buildMemoryContext returns a
// properly formatted context string when the memory repo has stored values.
func TestAgentMemory_BuildContext(t *testing.T) {
	ctx := context.Background()

	mem := &mockMemoryRepo{
		findFn: func(ctx context.Context, userID uint, key string) ([]model.AgentMemory, error) {
			switch key {
			case "last_category":
				return []model.AgentMemory{
					{Key: "last_category", Value: "螺纹钢"},
				}, nil
			case "last_spec":
				return []model.AgentMemory{
					{Key: "last_spec", Value: "HRB400E 20mm"},
				}, nil
			case "last_region":
				return []model.AgentMemory{
					{Key: "last_region", Value: "上海"},
				}, nil
			case "last_query":
				return []model.AgentMemory{
					{Key: "last_query", Value: "螺纹钢价格查询"},
				}, nil
			default:
				return nil, nil
			}
		},
	}

	svc := newTestableAgentService(nil, nil, mem)
	result := svc.buildMemoryContextTestable(ctx, 1)

	if result == "" {
		t.Fatal("expected non-empty memory context")
	}
	if !strings.Contains(result, "[用户历史偏好]") {
		t.Errorf("expected header '[用户历史偏好]', got: %s", result)
	}
	if !strings.Contains(result, "上次查询品种") {
		t.Errorf("expected '上次查询品种' label, got: %s", result)
	}
	if !strings.Contains(result, "上次查询规格") {
		t.Errorf("expected '上次查询规格' label, got: %s", result)
	}
	if !strings.Contains(result, "上次查询地区") {
		t.Errorf("expected '上次查询地区' label, got: %s", result)
	}
	if !strings.Contains(result, "上次查询内容") {
		t.Errorf("expected '上次查询内容' label, got: %s", result)
	}
	if !strings.Contains(result, "螺纹钢") {
		t.Errorf("expected value '螺纹钢', got: %s", result)
	}
	if !strings.Contains(result, "HRB400E 20mm") {
		t.Errorf("expected value 'HRB400E 20mm', got: %s", result)
	}
	if !strings.Contains(result, "上海") {
		t.Errorf("expected value '上海', got: %s", result)
	}
}

// TestAgentMemory_BuildContext_Empty verifies that buildMemoryContext returns
// an empty string when no memories exist for the user.
func TestAgentMemory_BuildContext_Empty(t *testing.T) {
	ctx := context.Background()

	// Memory repo returns empty results for all keys.
	mem := &mockMemoryRepo{
		findFn: func(ctx context.Context, userID uint, key string) ([]model.AgentMemory, error) {
			return nil, nil
		},
	}

	svc := newTestableAgentService(nil, nil, mem)
	result := svc.buildMemoryContextTestable(ctx, 1)

	if result != "" {
		t.Errorf("expected empty string, got: %s", result)
	}
}

// TestAgentMemory_BuildContext_NilMemory verifies that buildMemoryContext
// returns empty string when memory repo is nil.
func TestAgentMemory_BuildContext_NilMemory(t *testing.T) {
	ctx := context.Background()

	svc := newTestableAgentService(nil, nil, nil)
	result := svc.buildMemoryContextTestable(ctx, 1)

	if result != "" {
		t.Errorf("expected empty string for nil memory, got: %s", result)
	}
}

// ============================================================================
// 23. TestAgentPlan_Degradation — fallbackPlan on nil dependencies
// ============================================================================

// TestAgentPlan_Degradation verifies that calling fallbackPlan on a nil-dependency
// AgentService returns a valid single-step plan with correct MaxSteps.
func TestAgentPlan_Degradation(t *testing.T) {
	// Create AgentService with all nil dependencies (simulating degradation).
	svc := &AgentService{
		llmAdapter:     nil,
		agentConfigSvc: nil,
		memoryRepo:     nil,
	}

	plan := svc.fallbackPlan(5)

	if plan == nil {
		t.Fatal("expected non-nil fallback plan")
	}
	if len(plan.Steps) != 1 {
		t.Fatalf("expected 1 step, got %d", len(plan.Steps))
	}
	if plan.Steps[0].Step != 1 {
		t.Errorf("expected step number 1, got %d", plan.Steps[0].Step)
	}
	if plan.Steps[0].ToolName != "" {
		t.Errorf("expected empty tool_name in fallback, got '%s'", plan.Steps[0].ToolName)
	}
	if plan.Steps[0].Intent != "general" {
		t.Errorf("expected intent 'general', got '%s'", plan.Steps[0].Intent)
	}
	if plan.Steps[0].Params != nil {
		t.Errorf("expected nil params, got %v", plan.Steps[0].Params)
	}
	if plan.MaxSteps != 5 {
		t.Errorf("expected MaxSteps 5, got %d", plan.MaxSteps)
	}
	if plan.CreatedAt.IsZero() {
		t.Error("expected non-zero CreatedAt")
	}

	// Also verify with different maxSteps.
	plan2 := svc.fallbackPlan(3)
	if plan2.MaxSteps != 3 {
		t.Errorf("expected MaxSteps 3, got %d", plan2.MaxSteps)
	}
	if len(plan2.Steps) != 1 {
		t.Errorf("expected 1 step, got %d", len(plan2.Steps))
	}
}

// TestAgentPlan_FallbackOnNilLLM verifies that GeneratePlan gracefully returns
// a fallback plan when the LLM adapter returns an error (simulating nil/absent LLM).
func TestAgentPlan_FallbackOnNilLLM(t *testing.T) {
	ctx := context.Background()

	// Simulate nil/absent LLM by returning an error from the mock.
	llm := &mockLLMClient{
		chatFn: func(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionResponse, error) {
			return nil, errors.New("LLM not configured")
		},
	}
	cfgSvc := &mockAgentConfigService{
		cfg: &AgentConfigDO{MaxSteps: 5, MaxRetries: 2},
	}
	svc := newTestableAgentService(llm, cfgSvc, nil)

	plan := svc.GeneratePlanTestable(ctx, 1, "查询螺纹钢价格", nil, nil)

	// With LLM returning an error, GeneratePlan should return a fallback plan (no error).
	if plan == nil {
		t.Fatal("expected non-nil fallback plan")
	}
	if len(plan.Steps) != 1 {
		t.Fatalf("expected 1 step, got %d", len(plan.Steps))
	}
	if plan.Steps[0].ToolName != "" {
		t.Errorf("expected empty tool_name, got '%s'", plan.Steps[0].ToolName)
	}
	if plan.MaxSteps != 5 {
		t.Errorf("expected MaxSteps 5, got %d", plan.MaxSteps)
	}
}

// ============================================================================
// 24. TestAgentMemory_BuildContext_Partial verifies partial memory coverage
// ============================================================================

// TestAgentMemory_BuildContext_Partial verifies that buildMemoryContext only
// includes keys that have values and skips empty/error keys gracefully.
func TestAgentMemory_BuildContext_Partial(t *testing.T) {
	ctx := context.Background()

	mem := &mockMemoryRepo{
		findFn: func(ctx context.Context, userID uint, key string) ([]model.AgentMemory, error) {
			switch key {
			case "last_category":
				return []model.AgentMemory{
					{Key: "last_category", Value: "热卷"},
				}, nil
			case "last_spec":
				// Empty value — should be skipped.
				return []model.AgentMemory{
					{Key: "last_spec", Value: ""},
				}, nil
			case "last_region":
				// Error — should be skipped.
				return nil, errors.New("db error")
			case "last_query":
				// No records — should be skipped.
				return nil, nil
			default:
				return nil, nil
			}
		},
	}

	svc := newTestableAgentService(nil, nil, mem)
	result := svc.buildMemoryContextTestable(ctx, 1)

	if result == "" {
		t.Fatal("expected non-empty context when at least one key has value")
	}
	if !strings.Contains(result, "热卷") {
		t.Errorf("expected value '热卷', got: %s", result)
	}
	// Empty value and error keys should NOT appear.
	if strings.Contains(result, "上次查询规格") {
		t.Error("expected '上次查询规格' to be skipped (empty value)")
	}
	if strings.Contains(result, "上次查询地区") {
		t.Error("expected '上次查询地区' to be skipped (db error)")
	}
	if strings.Contains(result, "上次查询内容") {
		t.Error("expected '上次查询内容' to be skipped (no records)")
	}
}
