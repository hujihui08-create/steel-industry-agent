package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"

	"github.com/redis/go-redis/v9"
	"github.com/sashabaranov/go-openai"
)

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

type DebugDialogueRequest struct {
	SessionID    uint   `json:"session_id"`
	Message      string `json:"message"`
	ContextTurns int    `json:"context_turns"`
	Model        string `json:"model"`
	SummaryMode  string `json:"summary_mode"`
}

type DebugToolExecuteRequest struct {
	ToolName string                 `json:"tool_name"`
	Params   map[string]interface{} `json:"params"`
	UseMock  bool                   `json:"use_mock"`
}

type ToolCallChainStep struct {
	Step       string `json:"step"`
	DurationMs int64  `json:"duration_ms"`
	Success    bool   `json:"success"`
	Detail     string `json:"detail,omitempty"`
}

type ToolExecuteResult struct {
	Status     string              `json:"status"`
	Result     interface{}         `json:"result"`
	Chain      []ToolCallChainStep `json:"chain"`
	DurationMs int64               `json:"duration_ms"`
}

type ToolHealthItem struct {
	Name         string  `json:"name"`
	DisplayName  string  `json:"displayName"`
	Status       string  `json:"status"`
	ResponseTime int64   `json:"response_time"`
	SuccessRate  float64 `json:"success_rate"`
	LastError    string  `json:"last_error,omitempty"`
}

type ToolHealthResult struct {
	Tools   []ToolHealthItem `json:"tools"`
	Summary struct {
		Normal   int `json:"normal"`
		Degraded int `json:"degraded"`
		Down     int `json:"down"`
	} `json:"summary"`
}

type ToolSchema struct {
	Name        string                 `json:"name"`
	DisplayName string                 `json:"display_name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

// toolDisplayNames maps tool function names to human-readable Chinese names.
var toolDisplayNames = map[string]string{
	"query_steel_price":   "价格查询",
	"calculate_quotation": "报价计算",
	"search_knowledge":    "知识检索",
	"query_tender":        "招标查询",
	"get_price_trend":     "价格走势",
	"set_price_alert":     "价格预警",
	"convert_unit":        "单位换算",
	"calculate_weight":    "重量计算",
	"search_news":         "资讯搜索",
	"get_news_detail":     "资讯详情",
}

func toolDisplayName(name string) string {
	if dn, ok := toolDisplayNames[name]; ok {
		return dn
	}
	return name
}

type IntentTestResult struct {
	Intent struct {
		Code       string  `json:"code"`
		Name       string  `json:"name"`
		Confidence float64 `json:"confidence"`
	} `json:"intent"`
	Entities        []IntentEntity `json:"entities"`
	MatchedKeywords []string       `json:"matched_keywords"`
	MatchMethod     string         `json:"match_method"`
}

type IntentEntity struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type PromptPreviewResult struct {
	RenderedPrompt  string   `json:"rendered_prompt"`
	TotalChars      int      `json:"total_chars"`
	EstimatedTokens int      `json:"estimated_tokens"`
	VariablesUsed   []string `json:"variables_used"`
}

type DebugSession struct {
	ID        uint           `json:"id"`
	Title     string         `json:"title"`
	CreatedAt time.Time      `json:"created_at"`
	TurnCount int            `json:"turn_count"`
	Messages  []DebugMessage `json:"messages,omitempty"`
}

type DebugMessage struct {
	ID        uint      `json:"id"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

type MockConfig struct {
	ToolName  string      `json:"tool_name"`
	MockData  interface{} `json:"mock_data"`
	Scenario  string      `json:"scenario"`
	CreatedAt string      `json:"created_at"`
}

// ---------------------------------------------------------------------------
// DebugService struct
// ---------------------------------------------------------------------------

type DebugService struct {
	chatService        *ChatService
	intentRepo         *repository.IntentRepository
	agentConfigService *AgentConfigService
	chatRepo           *repository.ChatRepository
	redisClient        redis.UniversalClient
}

func NewDebugService(
	chatService *ChatService,
	intentRepo *repository.IntentRepository,
	agentConfigService *AgentConfigService,
	chatRepo *repository.ChatRepository,
	redisClient redis.UniversalClient,
) *DebugService {
	return &DebugService{
		chatService:        chatService,
		intentRepo:         intentRepo,
		agentConfigService: agentConfigService,
		chatRepo:           chatRepo,
		redisClient:        redisClient,
	}
}

// ---------------------------------------------------------------------------
// 1. TestIntent - keyword-based intent matching
// ---------------------------------------------------------------------------

func (s *DebugService) TestIntent(ctx context.Context, text string) (*IntentTestResult, error) {
	intents, err := s.intentRepo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("查询意图列表失败: %w", err)
	}

	result := &IntentTestResult{
		MatchMethod: "keyword",
	}
	result.Intent.Confidence = 0

	var bestMatch *model.Intent
	var bestScore int
	var matchedKeywords []string

	for i := range intents {
		intent := &intents[i]
		if !intent.IsActive {
			continue
		}

		score := 0
		var kwMatches []string
		for _, kw := range intent.Keywords {
			if kw != "" && strings.Contains(text, kw) {
				score++
				kwMatches = append(kwMatches, kw)
			}
		}

		if score > bestScore {
			bestScore = score
			bestMatch = intent
			matchedKeywords = kwMatches
		}
	}

	if bestMatch != nil && bestScore > 0 {
		result.Intent.Code = bestMatch.IntentCode
		result.Intent.Name = bestMatch.IntentName
		result.Intent.Confidence = float64(bestScore) / float64(len(bestMatch.Keywords)+1)
		result.MatchedKeywords = matchedKeywords

		entities := extractEntities(text)
		result.Entities = entities
	} else {
		result.Intent.Code = "unknown"
		result.Intent.Name = "未识别意图"
		result.Intent.Confidence = 0
		result.MatchMethod = "keyword"
	}

	return result, nil
}

func extractEntities(text string) []IntentEntity {
	var entities []IntentEntity

	categories := []string{"螺纹钢", "热卷", "冷轧", "中厚板", "镀锌板", "彩涂板", "不锈钢", "型钢", "管材"}
	for _, cat := range categories {
		if strings.Contains(text, cat) {
			entities = append(entities, IntentEntity{Key: "category", Value: cat})
			break
		}
	}

	regions := []string{"上海", "北京", "广州", "深圳", "杭州", "南京", "武汉", "成都", "重庆", "天津"}
	for _, reg := range regions {
		if strings.Contains(text, reg) {
			entities = append(entities, IntentEntity{Key: "region", Value: reg})
			break
		}
	}

	return entities
}

// ---------------------------------------------------------------------------
// 2. GetToolSchemas
// ---------------------------------------------------------------------------

func (s *DebugService) GetToolSchemas() ([]ToolSchema, error) {
	tools := s.chatService.BuildTools(context.Background())
	schemas := make([]ToolSchema, 0, len(tools))
	for _, t := range tools {
		params, _ := t.Function.Parameters.(map[string]interface{})
		schema := ToolSchema{
			Name:        t.Function.Name,
			DisplayName: toolDisplayName(t.Function.Name),
			Description: t.Function.Description,
			Parameters:  params,
		}
		schemas = append(schemas, schema)
	}
	return schemas, nil
}

// ---------------------------------------------------------------------------
// 3. ExecuteTool - direct tool execution with mock support
// ---------------------------------------------------------------------------

func (s *DebugService) ExecuteTool(ctx context.Context, toolName string, params map[string]interface{}, useMock bool) (*ToolExecuteResult, error) {
	chain := make([]ToolCallChainStep, 0)

	step1Start := time.Now()
	paramsJSON, err := json.Marshal(params)
	chain = append(chain, ToolCallChainStep{
		Step:       "参数序列化",
		DurationMs: time.Since(step1Start).Milliseconds(),
		Success:    err == nil,
		Detail:     string(paramsJSON),
	})
	if err != nil {
		return &ToolExecuteResult{
			Status: "error",
			Result: map[string]string{"error": fmt.Sprintf("参数序列化失败: %v", err)},
			Chain:  chain,
		}, fmt.Errorf("参数序列化失败: %w", err)
	}

	step2Start := time.Now()
	mockConfig, hasMock := s.loadMockFromRedis(ctx, toolName)
	chain = append(chain, ToolCallChainStep{
		Step:       "Mock检查",
		DurationMs: time.Since(step2Start).Milliseconds(),
		Success:    true,
		Detail:     fmt.Sprintf("hasMock=%v", hasMock),
	})

	if useMock && hasMock {
		return &ToolExecuteResult{
			Status:     "success",
			Result:     mockConfig.MockData,
			Chain:      chain,
			DurationMs: 0,
		}, nil
	}

	if !useMock && hasMock {
		return &ToolExecuteResult{
			Status:     "success",
			Result:     mockConfig.MockData,
			Chain:      chain,
			DurationMs: 0,
		}, nil
	}

	step3Start := time.Now()
	toolCall := openai.ToolCall{
		ID:   fmt.Sprintf("debug_%s_%d", toolName, time.Now().UnixNano()),
		Type: openai.ToolTypeFunction,
		Function: openai.FunctionCall{
			Name:      toolName,
			Arguments: string(paramsJSON),
		},
	}

	execResult, execErr := s.chatService.ExecuteTool(ctx, 0, toolCall)
	step3Duration := time.Since(step3Start).Milliseconds()
	chain = append(chain, ToolCallChainStep{
		Step:       "工具执行",
		DurationMs: step3Duration,
		Success:    execErr == nil,
		Detail:     fmt.Sprintf("tool=%s", toolName),
	})

	if execErr != nil {
		return &ToolExecuteResult{
			Status: "error",
			Result: map[string]string{"error": execErr.Error()},
			Chain:  chain,
		}, nil
	}

	var parsedResult interface{}
	if json.Unmarshal([]byte(execResult), &parsedResult) != nil {
		parsedResult = execResult
	}

	return &ToolExecuteResult{
		Status:     "success",
		Result:     parsedResult,
		Chain:      chain,
		DurationMs: step3Duration,
	}, nil
}

// ---------------------------------------------------------------------------
// 4. CheckToolHealth
// ---------------------------------------------------------------------------

func (s *DebugService) CheckToolHealth(ctx context.Context) (*ToolHealthResult, error) {
	toolSchemas, err := s.GetToolSchemas()
	if err != nil {
		return nil, err
	}

	type chanResult struct {
		item ToolHealthItem
	}
	results := make(chan chanResult, len(toolSchemas))

	testParams := map[string]map[string]interface{}{
		"query_steel_price":   {"category": "螺纹钢"},
		"calculate_quotation": {"category": "螺纹钢", "spec": "HRB400E 20mm", "quantity": 1},
		"search_knowledge":    {"query": "HRB400E"},
		"query_tender":        {"keyword": "螺纹钢"},
		"get_price_trend":     {"category": "螺纹钢", "period": "1w"},
		"set_price_alert":     {"category": "螺纹钢", "target_price": 4000, "condition": "below"},
		"convert_unit":        {"value": 1, "from_unit": "吨", "to_unit": "千克"},
		"calculate_weight":    {"shape": "圆钢", "spec": "20mm", "quantity": 1},
		"search_news":         {"keyword": "螺纹钢"},
		"get_news_detail":     {"id": 1},
	}

	for _, schema := range toolSchemas {
		go func(name string, displayName string) {
			params, ok := testParams[name]
			if !ok {
				params = map[string]interface{}{}
			}

			start := time.Now()
			_, execErr := s.ExecuteTool(ctx, name, params, false)
			responseTime := time.Since(start).Milliseconds()

			item := ToolHealthItem{
				Name:         name,
				DisplayName:  displayName,
				ResponseTime: responseTime,
				SuccessRate:  1.0,
			}

			if execErr != nil {
				item.Status = "down"
				item.SuccessRate = 0
				item.LastError = execErr.Error()
			} else if responseTime > 500 {
				item.Status = "degraded"
				item.SuccessRate = 0.8
			} else {
				item.Status = "normal"
			}

			results <- chanResult{item: item}
		}(schema.Name, schema.DisplayName)
	}

	healthResult := &ToolHealthResult{}
	for i := 0; i < len(toolSchemas); i++ {
		r := <-results
		healthResult.Tools = append(healthResult.Tools, r.item)
		switch r.item.Status {
		case "normal":
			healthResult.Summary.Normal++
		case "degraded":
			healthResult.Summary.Degraded++
		case "down":
			healthResult.Summary.Down++
		}
	}

	return healthResult, nil
}

// ---------------------------------------------------------------------------
// 5. PreviewPrompt
// ---------------------------------------------------------------------------

func (s *DebugService) PreviewPrompt(ctx context.Context, variables map[string]string) (*PromptPreviewResult, error) {
	cfg, err := s.agentConfigService.GetAgentConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("获取Agent配置失败: %w", err)
	}

	prompt := cfg.SystemPrompt

	var usedVars []string
	for k, v := range variables {
		placeholder := fmt.Sprintf("{%s}", k)
		if strings.Contains(prompt, placeholder) {
			prompt = strings.ReplaceAll(prompt, placeholder, v)
			usedVars = append(usedVars, k)
		}
	}

	return &PromptPreviewResult{
		RenderedPrompt:  prompt,
		TotalChars:      len([]rune(prompt)),
		EstimatedTokens: len([]rune(prompt)) / 4,
		VariablesUsed:   usedVars,
	}, nil
}

// ---------------------------------------------------------------------------
// 6. GetDebugSessions
// ---------------------------------------------------------------------------

func (s *DebugService) GetDebugSessions(ctx context.Context) ([]DebugSession, error) {
	sessions, err := s.chatRepo.FindRecentSessions(ctx, 20)
	if err != nil {
		return nil, fmt.Errorf("查询会话列表失败: %w", err)
	}

	result := make([]DebugSession, 0, len(sessions))
	for _, sess := range sessions {
		chatCtx := sess.GetContext()
		result = append(result, DebugSession{
			ID:        sess.ID,
			Title:     sess.Title,
			CreatedAt: sess.CreatedAt,
			TurnCount: chatCtx.TurnCount,
		})
	}
	return result, nil
}

// ---------------------------------------------------------------------------
// 7. LoadDebugSession
// ---------------------------------------------------------------------------

func (s *DebugService) LoadDebugSession(ctx context.Context, sessionID uint) (*DebugSession, error) {
	sess, err := s.chatRepo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("查询会话失败: %w", err)
	}

	messages, err := s.chatRepo.FindMessagesBySessionID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("查询消息失败: %w", err)
	}

	chatCtx := sess.GetContext()

	debugMsgs := make([]DebugMessage, 0, len(messages))
	for _, msg := range messages {
		debugMsgs = append(debugMsgs, DebugMessage{
			ID:        msg.ID,
			Role:      msg.Role,
			Content:   msg.Content,
			CreatedAt: msg.CreatedAt,
		})
	}

	return &DebugSession{
		ID:        sess.ID,
		Title:     sess.Title,
		CreatedAt: sess.CreatedAt,
		TurnCount: chatCtx.TurnCount,
		Messages:  debugMsgs,
	}, nil
}

// ---------------------------------------------------------------------------
// 8. StreamDebugChat - SSE streaming debug dialog
// ---------------------------------------------------------------------------

func (s *DebugService) StreamDebugChat(ctx context.Context, req *DebugDialogueRequest, ch chan<- string) error {
	if req.ContextTurns <= 0 || req.ContextTurns > 10 {
		req.ContextTurns = 5
	}

	cfg, cfgErr := s.agentConfigService.GetAgentConfig(ctx)
	sysPrompt := SystemPrompt
	if cfgErr == nil && cfg.SystemPrompt != "" {
		sysPrompt = cfg.SystemPrompt
	}

	openaiMessages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: sysPrompt},
	}

	if req.SessionID > 0 {
		messages, err := s.chatRepo.FindMessagesBySessionID(ctx, req.SessionID)
		if err != nil {
			sendSSEEvent(ch, "error", map[string]string{"message": fmt.Sprintf("加载会话失败: %v", err)})
			return err
		}

		for _, msg := range messages {
			var role string
			switch msg.Role {
			case "user":
				role = openai.ChatMessageRoleUser
			case "assistant":
				role = openai.ChatMessageRoleAssistant
			default:
				role = openai.ChatMessageRoleUser
			}
			openaiMessages = append(openaiMessages, openai.ChatCompletionMessage{
				Role:    role,
				Content: msg.Content,
			})
		}
	}

	openaiMessages = append(openaiMessages, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: req.Message,
	})

	openaiMessages = applyContextWindow(openaiMessages, req.ContextTurns)

	intentResult, intentErr := s.TestIntent(ctx, req.Message)
	if intentErr == nil && intentResult != nil {
		sendSSEEvent(ch, "debug_info", map[string]interface{}{
			"intent":       intentResult.Intent,
			"entities":     intentResult.Entities,
			"match_method": intentResult.MatchMethod,
			"keywords":     intentResult.MatchedKeywords,
		})
	}

	resp, aiErr := s.chatService.aiClient.ChatWithTools(ctx, openaiMessages, s.chatService.BuildTools(ctx))
	if aiErr != nil {
		sendSSEEvent(ch, "error", map[string]string{"message": aiErr.Error()})
		return aiErr
	}

	if len(resp.Choices) == 0 {
		sendSSEEvent(ch, "error", map[string]string{"message": "AI 未返回响应"})
		return fmt.Errorf("no response from AI")
	}

	choice := resp.Choices[0]

	if len(choice.Message.ToolCalls) > 0 {
		openaiMessages = append(openaiMessages, choice.Message)

		for _, tc := range choice.Message.ToolCalls {
			sendSSEEvent(ch, "tool_call", map[string]interface{}{
				"tool_name": tc.Function.Name,
				"arguments": tc.Function.Arguments,
			})

			toolStart := time.Now()
			execResult, execErr := s.chatService.ExecuteTool(ctx, 0, tc)
			toolDuration := time.Since(toolStart).Milliseconds()

			if execErr != nil {
				sendSSEEvent(ch, "tool_result", map[string]interface{}{
					"tool_name":   tc.Function.Name,
					"status":      "error",
					"error":       execErr.Error(),
					"duration_ms": toolDuration,
				})
				openaiMessages = append(openaiMessages, openai.ChatCompletionMessage{
					Role:       openai.ChatMessageRoleTool,
					Content:    fmt.Sprintf(`{"error":"%s"}`, execErr.Error()),
					Name:       tc.Function.Name,
					ToolCallID: tc.ID,
				})
			} else {
				sendSSEEvent(ch, "tool_result", map[string]interface{}{
					"tool_name":   tc.Function.Name,
					"status":      "success",
					"result":      execResult,
					"duration_ms": toolDuration,
				})
				openaiMessages = append(openaiMessages, openai.ChatCompletionMessage{
					Role:       openai.ChatMessageRoleTool,
					Content:    execResult,
					Name:       tc.Function.Name,
					ToolCallID: tc.ID,
				})
			}
		}
	}

	stream, streamErr := s.chatService.aiClient.ChatStreamWithTools(ctx, openaiMessages, s.chatService.BuildTools(ctx))
	if streamErr != nil {
		sendSSEEvent(ch, "error", map[string]string{"message": streamErr.Error()})
		return streamErr
	}
	defer stream.Close()

	for {
		streamResp, recvErr := stream.Recv()
		if recvErr != nil {
			break
		}
		if len(streamResp.Choices) > 0 {
			delta := streamResp.Choices[0].Delta.Content
			if delta != "" {
				sendSSEEvent(ch, "token", map[string]string{"content": delta})
			}
		}
	}

	sendSSEEvent(ch, "done", map[string]interface{}{
		"message": "调试对话完成",
		"turns":   req.ContextTurns,
	})

	return nil
}

func sendSSEEvent(ch chan<- string, eventType string, data interface{}) {
	payload, _ := json.Marshal(map[string]interface{}{
		"type": eventType,
		"data": data,
	})
	ch <- fmt.Sprintf("data: %s\n\n", string(payload))
}

// ---------------------------------------------------------------------------
// 9-11. Mock config management (Redis)
// ---------------------------------------------------------------------------

func mockKey(toolName string) string {
	return fmt.Sprintf("debug:mock:%s", toolName)
}

func (s *DebugService) loadMockFromRedis(ctx context.Context, toolName string) (*MockConfig, bool) {
	if s.redisClient == nil {
		return nil, false
	}

	val, err := s.redisClient.Get(ctx, mockKey(toolName)).Result()
	if err != nil {
		return nil, false
	}

	var cfg MockConfig
	if json.Unmarshal([]byte(val), &cfg) != nil {
		return nil, false
	}
	return &cfg, true
}

func (s *DebugService) SetMockConfig(ctx context.Context, toolName string, mockData interface{}, scenario string) error {
	if s.redisClient == nil {
		return fmt.Errorf("Redis 不可用")
	}

	cfg := MockConfig{
		ToolName:  toolName,
		MockData:  mockData,
		Scenario:  scenario,
		CreatedAt: time.Now().Format("2006-01-02 15:04:05"),
	}

	data, err := json.Marshal(cfg)
	if err != nil {
		return fmt.Errorf("序列化Mock配置失败: %w", err)
	}

	return s.redisClient.Set(ctx, mockKey(toolName), data, 0).Err()
}

func (s *DebugService) GetMockConfigs(ctx context.Context) ([]MockConfig, error) {
	if s.redisClient == nil {
		return []MockConfig{}, nil
	}

	keys, err := s.redisClient.Keys(ctx, "debug:mock:*").Result()
	if err != nil {
		return nil, fmt.Errorf("查询Mock配置失败: %w", err)
	}

	configs := make([]MockConfig, 0, len(keys))
	for _, key := range keys {
		val, err := s.redisClient.Get(ctx, key).Result()
		if err != nil {
			continue
		}
		var cfg MockConfig
		if json.Unmarshal([]byte(val), &cfg) == nil {
			configs = append(configs, cfg)
		}
	}
	return configs, nil
}

func (s *DebugService) DeleteMockConfig(ctx context.Context, toolName string) error {
	if s.redisClient == nil {
		return fmt.Errorf("Redis 不可用")
	}
	return s.redisClient.Del(ctx, mockKey(toolName)).Err()
}
