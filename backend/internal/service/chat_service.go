package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"strings"
	"sync"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
	"steel-agent-backend/pkg/ai"

	"github.com/sashabaranov/go-openai"
)

// ---------------------------------------------------------------------------
// Task 2.1: System prompt
// ---------------------------------------------------------------------------

const SystemPrompt = `你是钢铁行业智能助手"钢小秘"。你服务于钢铁行业的采购商、销售商和分析师，核心能力包括：价格查询、价格走势、报价计算、知识搜索、招标信息、行业资讯、重量计算、价格预警。
    
重要规则:
1. 所有价格、规格、标准等数据必须通过工具调用获取，绝不允许自行编造
2. 如果工具返回数据，必须原样使用，不得修改数值
3. 如果工具未返回数据或调用失败，必须告知用户"未查询到相关数据"，不允许猜测
4. 涉及交易决策的内容，必须附加"以上数据仅供参考，不构成投资建议"
5. 资讯查询：支持关键词搜索和分类筛选行业新闻
6. 价格对比：支持多品种、多地区价格对比分析
7. 价格预测：可根据历史趋势给出分析判断，必须标注"以上数据仅供参考，不构成投资建议"
8. 禁止给出投资建议或价格走势的确定性预测
9. 只回答钢铁行业相关问题，非钢铁行业问题请礼貌拒绝
10. 回复应专业、简洁，结论先行
11. 使用中文回复，数字格式遵循中国习惯
12. 禁止在回复中使用任何 emoji 表情符号或装饰性 Unicode 图标。使用纯文本 + Markdown 结构（标题、表格、列表）组织内容。
13. 首次欢迎消息格式：简短问候后，使用分段落 + **加粗关键词**：简短描述 的格式逐项介绍核心能力，每项描述不超过15字。禁止使用 emoji 无序列表。末尾以开放式提问引导用户。`

// ---------------------------------------------------------------------------
// Task 3.1: 8 function-calling tool definitions (dynamically built from DB)
// ---------------------------------------------------------------------------

func (s *ChatService) BuildTools(ctx context.Context) []openai.Tool {
	categoryNames, err := s.categoryRepo.FindEnabledNames(ctx)
	if err != nil || len(categoryNames) == 0 {
		categoryNames = []string{"螺纹钢", "热卷", "冷轧", "中厚板"}
	}

	enumVals := make([]string, len(categoryNames))
	copy(enumVals, categoryNames)

	return []openai.Tool{
		{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "query_steel_price",
				Description: "查询钢材实时价格。返回指定品种、规格、地区的当前市场价格、涨跌额和涨跌幅。",
				Parameters: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"category": map[string]interface{}{
							"type":        "string",
							"description": "钢材品种",
							"enum":        enumVals,
						},
						"spec": map[string]interface{}{
							"type":        "string",
							"description": "规格型号，例如 HRB400E 20mm",
						},
						"region": map[string]interface{}{
							"type":        "string",
							"description": "地区，例如 上海、北京、广州",
						},
					},
					"required": []string{"category"},
				},
			},
		},
		{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "calculate_quotation",
				Description: "计算钢材报价。根据品种、规格、数量计算材料费、加工费、运费和税费合计。",
				Parameters: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"category": map[string]interface{}{
							"type":        "string",
							"description": "钢材品种",
							"enum":        enumVals,
						},
						"spec": map[string]interface{}{
							"type":        "string",
							"description": "规格型号",
						},
						"quantity": map[string]interface{}{
							"type":        "number",
							"description": "数量（吨）",
						},
					},
					"required": []string{"category", "spec", "quantity"},
				},
			},
		},
		{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "search_knowledge",
				Description: "搜索钢铁行业知识库。可查询标准、牌号对照、术语解释、工艺说明等。",
				Parameters: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"query": map[string]interface{}{
							"type":        "string",
							"description": "搜索关键词，例如 HRB400E、GB/T 1499.2",
						},
					},
					"required": []string{"query"},
				},
			},
		},
		{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "query_tender",
				Description: "查询钢材招标信息。可按关键词和地区筛选。",
				Parameters: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"keyword": map[string]interface{}{
							"type":        "string",
							"description": "搜索关键词",
						},
						"region": map[string]interface{}{
							"type":        "string",
							"description": "地区",
						},
					},
				},
			},
		},
		{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "get_price_trend",
				Description: "获取钢材价格历史走势。返回指定品种在选定时间段内的价格变化。",
				Parameters: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"category": map[string]interface{}{
							"type":        "string",
							"description": "钢材品种",
							"enum":        enumVals,
						},
						"period": map[string]interface{}{
							"type":        "string",
							"description": "时间范围",
							"enum":        []string{"1w", "1m", "3m", "6m", "1y"},
						},
					},
					"required": []string{"category"},
				},
			},
		},
		{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "set_price_alert",
				Description: "设置价格预警。当价格达到目标价位时通知用户。",
				Parameters: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"category": map[string]interface{}{
							"type":        "string",
							"description": "钢材品种",
							"enum":        enumVals,
						},
						"target_price": map[string]interface{}{
							"type":        "number",
							"description": "目标价格（元/吨）",
						},
						"condition": map[string]interface{}{
							"type":        "string",
							"description": "触发条件",
							"enum":        []string{"above", "below"},
						},
					},
					"required": []string{"category", "target_price", "condition"},
				},
			},
		},
		{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "convert_unit",
				Description: "钢材相关单位换算。支持吨/千克、元/吨与元/千克、毫米/厘米/米之间的换算。",
				Parameters: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"value": map[string]interface{}{
							"type":        "number",
							"description": "待换算的数值",
						},
						"from_unit": map[string]interface{}{
							"type":        "string",
							"description": "原单位，例如 吨、千克、元/吨、元/千克、毫米",
						},
						"to_unit": map[string]interface{}{
							"type":        "string",
							"description": "目标单位，例如 千克、吨、元/千克、元/吨、厘米",
						},
					},
					"required": []string{"value", "from_unit", "to_unit"},
				},
			},
		},
		{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "calculate_weight",
				Description: "计算钢材理论重量。根据形状和规格估算钢材重量。",
				Parameters: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"shape": map[string]interface{}{
							"type":        "string",
							"description": "形状/类型，例如 圆钢、钢板、方管",
						},
						"spec": map[string]interface{}{
							"type":        "string",
							"description": "规格描述，例如 20mm*6000mm",
						},
						"quantity": map[string]interface{}{
							"type":        "number",
							"description": "数量（根/张）",
						},
					},
					"required": []string{"shape", "spec", "quantity"},
				},
			},
		},
		{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "search_news",
				Description: "搜索钢铁行业资讯。支持按关键词和分类筛选新闻。",
				Parameters: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"keyword": map[string]interface{}{
							"type":        "string",
							"description": "搜索关键词，用于模糊匹配新闻标题和摘要",
						},
						"category": map[string]interface{}{
							"type":        "string",
							"description": "新闻分类，例如 价格行情、政策、行业动态、企业新闻",
						},
					},
				},
			},
		},
		{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "get_news_detail",
				Description: "获取单条资讯的完整内容。当用户想了解某条新闻的详细内容时调用。",
				Parameters: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"id": map[string]interface{}{
							"type":        "integer",
							"description": "新闻ID",
						},
					},
					"required": []string{"id"},
				},
			},
		},
	}

}

// ---------------------------------------------------------------------------
// Argument structs for tool-call JSON parsing (Task 3.2)
// ---------------------------------------------------------------------------

type querySteelPriceArgs struct {
	Category string `json:"category"`
	Spec     string `json:"spec,omitempty"`
	Region   string `json:"region,omitempty"`
}

type calculateQuotationArgs struct {
	Category string  `json:"category"`
	Spec     string  `json:"spec"`
	Quantity float64 `json:"quantity"`
}

type searchKnowledgeArgs struct {
	Query string `json:"query"`
}

type queryTenderArgs struct {
	Keyword string `json:"keyword,omitempty"`
	Region  string `json:"region,omitempty"`
}

type getPriceTrendArgs struct {
	Category string `json:"category"`
	Period   string `json:"period,omitempty"`
}

type setPriceAlertArgs struct {
	Category    string  `json:"category"`
	TargetPrice float64 `json:"target_price"`
	Condition   string  `json:"condition"`
}

type convertUnitArgs struct {
	Value    float64 `json:"value"`
	FromUnit string  `json:"from_unit"`
	ToUnit   string  `json:"to_unit"`
}

type calculateWeightArgs struct {
	Shape    string  `json:"shape"`
	Spec     string  `json:"spec"`
	Quantity float64 `json:"quantity"`
}

type searchNewsArgs struct {
	Keyword  string `json:"keyword,omitempty"`
	Category string `json:"category,omitempty"`
}

type getNewsDetailArgs struct {
	ID uint `json:"id"`
}

// ---------------------------------------------------------------------------
// ChatService struct (Task 3.2: added repo fields)
// ---------------------------------------------------------------------------

// ChatService handles AI chat business logic with LLM integration and
// function-calling tool execution.
type ChatService struct {
	chatRepo         *repository.ChatRepository
	aiClient         *ai.LLMAdapter
	priceRepo        *repository.SteelPriceRepository
	quotationRepo    *repository.QuotationRepository
	knowledgeRepo    *repository.KnowledgeRepository
	knowledgeService *KnowledgeService
	tenderRepo       *repository.TenderRepository
	alertRepo        *repository.PriceAlertRepository
	newsRepo         *repository.NewsRepository
	categoryRepo     *repository.CategoryRepository
	badCaseService   *BadCaseService
	intentRepo       *repository.IntentRepository
	tokenUsageRepo   *repository.TokenUsageRepository

	activeCancels map[uint]context.CancelFunc
	mu            sync.Mutex
}

// NewChatService creates a new ChatService with all required repositories
// for function-calling tool execution.
func NewChatService(
	chatRepo *repository.ChatRepository,
	aiClient *ai.LLMAdapter,
	priceRepo *repository.SteelPriceRepository,
	quotationRepo *repository.QuotationRepository,
	knowledgeRepo *repository.KnowledgeRepository,
	knowledgeService *KnowledgeService,
	tenderRepo *repository.TenderRepository,
	alertRepo *repository.PriceAlertRepository,
	newsRepo *repository.NewsRepository,
	categoryRepo *repository.CategoryRepository,
	badCaseService *BadCaseService,
	intentRepo *repository.IntentRepository,
	tokenUsageRepo *repository.TokenUsageRepository,
) *ChatService {
	return &ChatService{
		chatRepo:         chatRepo,
		aiClient:         aiClient,
		priceRepo:        priceRepo,
		quotationRepo:    quotationRepo,
		knowledgeRepo:    knowledgeRepo,
		knowledgeService: knowledgeService,
		tenderRepo:       tenderRepo,
		alertRepo:        alertRepo,
		newsRepo:         newsRepo,
		categoryRepo:     categoryRepo,
		badCaseService:   badCaseService,
		intentRepo:       intentRepo,
		tokenUsageRepo:   tokenUsageRepo,
		activeCancels:    make(map[uint]context.CancelFunc),
	}
}

// ---------------------------------------------------------------------------
// Task 2.3: validateToolResult
// ---------------------------------------------------------------------------

// validateToolResult checks that a tool execution result contains provenance
// information (a "source" field and a "date" or "timestamp" field).
// Returns an error if the result lacks source or timestamp provenance.
func validateToolResult(toolName string, result string) error {
	if !strings.Contains(result, `"source"`) {
		return fmt.Errorf("tool %s result missing source provenance", toolName)
	}
	if !strings.Contains(result, `"date"`) && !strings.Contains(result, `"timestamp"`) {
		return fmt.Errorf("tool %s result missing date/timestamp provenance", toolName)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Task 4.1: applyContextWindow
// ---------------------------------------------------------------------------

// applyContextWindow trims a message list to fit within a maximum number of
// conversation turns. The system message (index 0) is always preserved.
// When truncation occurs, a summary message is inserted after the system prompt
// to describe earlier context.
func applyContextWindow(messages []openai.ChatCompletionMessage, maxTurns int) []openai.ChatCompletionMessage {
	if len(messages) <= 1 {
		return messages
	}

	// Count user messages as turns (skip index 0 if it is system).
	userCount := 0
	for _, m := range messages {
		if m.Role == openai.ChatMessageRoleUser {
			userCount++
		}
	}

	// If within limit, return everything.
	if userCount <= maxTurns {
		return messages
	}

	// Build result: keep system message + summary + last maxTurns*2 non-system messages.
	result := make([]openai.ChatCompletionMessage, 0, 2+maxTurns*2)

	// Always keep system message at position 0.
	if len(messages) > 0 && messages[0].Role == openai.ChatMessageRoleSystem {
		result = append(result, messages[0])
	}

	// Insert a summary describing earlier conversations.
	result = append(result, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleSystem,
		Content: fmt.Sprintf("（之前的 %d 轮对话讨论了钢材价格查询、报价计算等内容，以下是最近的对话。）", userCount-maxTurns),
	})

	// Keep the last maxTurns*2 non-system messages.
	keep := maxTurns * 2
	startIdx := len(messages) - keep
	if startIdx < 1 {
		startIdx = 1 // skip the original system message
	}
	for i := startIdx; i < len(messages); i++ {
		result = append(result, messages[i])
	}

	return result
}

var intentToToolName = map[string]string{
	"price_query":        "query_steel_price",
	"price_trend":        "get_price_trend",
	"quotation":          "calculate_quotation",
	"tender":             "query_tender",
	"knowledge_search":   "search_knowledge",
	"price_alert":        "set_price_alert",
	"unit_conversion":    "convert_unit",
	"weight_calculation": "calculate_weight",
	"news":               "search_news",
}

type intentMatchResult struct {
	intentName  string
	intentCode  string
	confidence  float64
	entities    map[string]string
	matchMethod string
}

const intentClassifierPrompt = `你是一个钢铁行业意图分类器。根据用户输入，判断用户意图属于以下哪一类：
- price_query: 查询价格、行情
- price_trend: 查询价格走势、历史趋势
- quotation: 计算报价、生成报价单
- tender: 查询招标信息
- knowledge_search: 行业知识、标准查询
- price_alert: 设置价格预警
- unit_conversion: 单位换算
- weight_calculation: 重量计算
- news: 行业资讯、新闻
- unknown: 无法确定意图

仅返回 JSON：{"intent":"xxx","confidence":0.9}`

type intentClassifyResult struct {
	Intent     string  `json:"intent"`
	Confidence float64 `json:"confidence"`
}

func (s *ChatService) classifyIntentWithLLM(ctx context.Context, text string) (string, float64, error) {
	msgs := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: intentClassifierPrompt},
		{Role: openai.ChatMessageRoleUser, Content: text},
	}

	resp, err := s.aiClient.Chat(ctx, msgs)
	if err != nil {
		return "", 0, fmt.Errorf("LLM意图分类失败: %w", err)
	}

	if len(resp.Choices) == 0 {
		return "", 0, fmt.Errorf("LLM意图分类无响应")
	}

	var result intentClassifyResult
	if err := json.Unmarshal([]byte(resp.Choices[0].Message.Content), &result); err != nil {
		return "", 0, fmt.Errorf("LLM意图分类结果解析失败: %w", err)
	}

	if result.Intent == "" || result.Intent == "unknown" {
		return "", 0, nil
	}

	return result.Intent, result.Confidence, nil
}

func (s *ChatService) matchIntent(ctx context.Context, userMessage string) intentMatchResult {
	defer func() {
		if r := recover(); r != nil {
			return
		}
	}()

	intents, err := s.intentRepo.FindAll(ctx)
	if err != nil {
		return intentMatchResult{matchMethod: "none"}
	}

	var bestMatch *model.Intent
	var bestScore int
	for i := range intents {
		intent := &intents[i]
		if !intent.IsActive {
			continue
		}
		score := 0
		for _, kw := range intent.Keywords {
			if kw != "" && strings.Contains(userMessage, kw) {
				score++
			}
		}
		if score > bestScore {
			bestScore = score
			bestMatch = intent
		}
	}

	if bestMatch != nil && bestScore > 0 {
		confidence := float64(bestScore) / float64(len(bestMatch.Keywords)+1)
		return intentMatchResult{
			intentName:  bestMatch.IntentName,
			intentCode:  bestMatch.IntentCode,
			confidence:  confidence,
			entities:    extractEntitiesFromText(userMessage),
			matchMethod: "keyword",
		}
	}

	llmIntent, llmConfidence, llmErr := s.classifyIntentWithLLM(ctx, userMessage)
	if llmErr != nil || llmIntent == "" {
		return intentMatchResult{matchMethod: "none"}
	}

	return intentMatchResult{
		intentName:  llmIntent,
		intentCode:  llmIntent,
		confidence:  llmConfidence,
		entities:    extractEntitiesFromText(userMessage),
		matchMethod: "llm",
	}
}

func extractEntitiesFromText(text string) map[string]string {
	entities := make(map[string]string)

	categories := []string{"螺纹钢", "热卷", "冷轧", "中厚板", "镀锌板", "彩涂板", "不锈钢", "型钢", "管材"}
	for _, cat := range categories {
		if strings.Contains(text, cat) {
			entities["category"] = cat
			break
		}
	}

	regions := []string{"上海", "北京", "广州", "深圳", "杭州", "南京", "武汉", "成都", "重庆", "天津"}
	for _, reg := range regions {
		if strings.Contains(text, reg) {
			entities["region"] = reg
			break
		}
	}

	return entities
}

// ---------------------------------------------------------------------------
// Task 3.2: executeTool - routes tool calls to backend services
// ---------------------------------------------------------------------------

// ExecuteTool executes a function-calling tool and returns the JSON result.
func (s *ChatService) ExecuteTool(ctx context.Context, userID uint, toolCall openai.ToolCall) (string, error) {
	switch toolCall.Function.Name {
	case "query_steel_price":
		return s.executeQuerySteelPrice(ctx, toolCall.Function.Arguments)
	case "calculate_quotation":
		return s.executeCalculateQuotation(ctx, toolCall.Function.Arguments)
	case "search_knowledge":
		return s.executeSearchKnowledge(ctx, toolCall.Function.Arguments)
	case "query_tender":
		return s.executeQueryTender(ctx, toolCall.Function.Arguments)
	case "get_price_trend":
		return s.executeGetPriceTrend(ctx, toolCall.Function.Arguments)
	case "set_price_alert":
		return s.executeSetPriceAlert(ctx, userID, toolCall.Function.Arguments)
	case "convert_unit":
		return s.executeConvertUnit(ctx, toolCall.Function.Arguments)
	case "calculate_weight":
		return s.executeCalculateWeight(ctx, toolCall.Function.Arguments)
	case "search_news":
		return s.executeSearchNews(ctx, toolCall.Function.Arguments)
	case "get_news_detail":
		return s.executeGetNewsDetail(ctx, toolCall.Function.Arguments)
	default:
		return "", fmt.Errorf("unknown tool: %s", toolCall.Function.Name)
	}
}

// --- Individual tool implementations ---

func (s *ChatService) executeQuerySteelPrice(ctx context.Context, argsJSON string) (string, error) {
	var args querySteelPriceArgs
	if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
		return "", fmt.Errorf("query_steel_price: invalid arguments: %w", err)
	}

	prices, err := s.priceRepo.FindByCategoryAndRegion(ctx, args.Category, args.Region)
	if err != nil {
		return "", fmt.Errorf("query_steel_price: %w", err)
	}
	if len(prices) == 0 {
		return `{"source":"database","message":"未查询到相关数据","prices":[]}`, nil
	}

	type priceItem struct {
		Category  string  `json:"category"`
		Spec      string  `json:"spec"`
		Price     float64 `json:"price"`
		Change    float64 `json:"change"`
		ChangePct float64 `json:"change_pct"`
		Region    string  `json:"region"`
		Source    string  `json:"source"`
		Date      string  `json:"date"`
	}

	items := make([]priceItem, 0, len(prices))
	for _, p := range prices {
		src := p.Source
		if src == "" {
			src = "database"
		}
		items = append(items, priceItem{
			Category:  p.Category,
			Spec:      p.Spec,
			Price:     p.Price,
			Change:    p.Change,
			ChangePct: p.ChangePct,
			Region:    p.Region,
			Source:    src,
			Date:      p.PriceDate.Format("2006-01-02"),
		})
	}

	result := map[string]interface{}{
		"source": "database",
		"prices": items,
		"count":  len(items),
	}
	data, _ := json.Marshal(result)
	return string(data), nil
}

func (s *ChatService) executeCalculateQuotation(ctx context.Context, argsJSON string) (string, error) {
	var args calculateQuotationArgs
	if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
		return "", fmt.Errorf("calculate_quotation: invalid arguments: %w", err)
	}

	latest, err := s.priceRepo.FindLatest(ctx, args.Category)
	if err != nil {
		return "", fmt.Errorf("calculate_quotation: price lookup failed: %w", err)
	}

	unitPrice := latest.Price
	materialCost := unitPrice * args.Quantity
	processCost := math.Round(materialCost*0.1*100) / 100
	freightCost := math.Round(materialCost*0.05*100) / 100
	subtotal := materialCost + processCost + freightCost
	taxCost := math.Round(subtotal*0.13*100) / 100
	totalPrice := math.Round((subtotal+taxCost)*100) / 100

	result := map[string]interface{}{
		"source":        "system_calculation",
		"category":      args.Category,
		"spec":          args.Spec,
		"quantity":      args.Quantity,
		"unit":          "吨",
		"unit_price":    unitPrice,
		"material_cost": materialCost,
		"process_cost":  processCost,
		"freight_cost":  freightCost,
		"tax_cost":      taxCost,
		"total_price":   totalPrice,
	}
	data, _ := json.Marshal(result)
	return string(data), nil
}

func (s *ChatService) executeSearchKnowledge(ctx context.Context, argsJSON string) (string, error) {
	var args searchKnowledgeArgs
	if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
		return "", fmt.Errorf("search_knowledge: invalid arguments: %w", err)
	}

	ragCfg := s.knowledgeService.GetRAGConfig(ctx)
	embeddingModel := ragCfg.EmbeddingModel
	threshold := ragCfg.DefaultThreshold
	topK := ragCfg.DefaultTopK

	// Try vector search first
	var results []model.Knowledge
	embeddings, embErr := s.aiClient.CreateEmbeddings(ctx, embeddingModel, []string{args.Query})
	if embErr == nil && len(embeddings) > 0 && len(embeddings[0]) > 0 {
		queryVector := float32ArrayToVector(embeddings[0])
		results, err := s.knowledgeRepo.VectorSearch(ctx, queryVector, threshold, topK)
		if err == nil && len(results) > 0 {
			items := make([]map[string]interface{}, 0, len(results))
			for _, k := range results {
				items = append(items, map[string]interface{}{
					"title":       k.Title,
					"type":        k.Type,
					"keywords":    k.Keywords,
					"standard_no": k.StandardNo,
					"similarity":  fmt.Sprintf("%.2f", k.Similarity),
				})
			}
			result := map[string]interface{}{
				"source":  "knowledge_base",
				"method":  "vector",
				"results": items,
				"count":   len(items),
			}
			data, _ := json.Marshal(result)
			return string(data), nil
		}
	}

	// Fall back to keyword search when vector search is unavailable
	results, err := s.knowledgeRepo.Search(ctx, args.Query)
	if err != nil {
		return "", fmt.Errorf("search_knowledge: %w", err)
	}
	if len(results) == 0 {
		return `{"source":"knowledge_base","message":"未查询到相关知识","results":[]}`, nil
	}

	type knowledgeItem struct {
		Title      string `json:"title"`
		Type       string `json:"type"`
		Keywords   string `json:"keywords"`
		StandardNo string `json:"standard_no,omitempty"`
	}

	items := make([]knowledgeItem, 0, len(results))
	for _, k := range results {
		items = append(items, knowledgeItem{
			Title:      k.Title,
			Type:       k.Type,
			Keywords:   k.Keywords,
			StandardNo: k.StandardNo,
		})
	}

	result := map[string]interface{}{
		"source":  "knowledge_base",
		"method":  "keyword",
		"results": items,
		"count":   len(items),
	}
	data, _ := json.Marshal(result)
	return string(data), nil
}

func (s *ChatService) executeQueryTender(ctx context.Context, argsJSON string) (string, error) {
	var args queryTenderArgs
	if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
		return "", fmt.Errorf("query_tender: invalid arguments: %w", err)
	}

	var tenders []model.Tender
	var err error

	if args.Region != "" {
		tenders, err = s.tenderRepo.FindByRegion(ctx, args.Region)
	} else {
		tenders, err = s.tenderRepo.FindAll(ctx, 20, 0)
	}
	if err != nil {
		return "", fmt.Errorf("query_tender: %w", err)
	}
	if len(tenders) == 0 {
		return `{"source":"tender_database","message":"未查询到相关招标信息","tenders":[]}`, nil
	}

	type tenderItem struct {
		Title       string  `json:"title"`
		Region      string  `json:"region"`
		Category    string  `json:"category"`
		Budget      float64 `json:"budget,omitempty"`
		Deadline    string  `json:"deadline,omitempty"`
		BidDeadline string  `json:"bid_deadline,omitempty"`
		Status      string  `json:"status"`
	}

	items := make([]tenderItem, 0, len(tenders))
	for _, t := range tenders {
		// Optional keyword filter (client-side since FindByRegion doesn't filter by keyword).
		if args.Keyword != "" && !strings.Contains(t.Title, args.Keyword) && !strings.Contains(t.Description, args.Keyword) {
			continue
		}
		item := tenderItem{
			Title:    t.Title,
			Region:   t.Region,
			Category: t.Category,
			Budget:   t.Budget,
			Status:   t.Status,
		}
		if !t.Deadline.IsZero() {
			item.Deadline = t.Deadline.Format("2006-01-02")
		}
		if !t.BidDeadline.IsZero() {
			item.BidDeadline = t.BidDeadline.Format("2006-01-02")
		}
		items = append(items, item)
	}

	result := map[string]interface{}{
		"source":  "tender_database",
		"tenders": items,
		"count":   len(items),
	}
	data, _ := json.Marshal(result)
	return string(data), nil
}

func (s *ChatService) executeGetPriceTrend(ctx context.Context, argsJSON string) (string, error) {
	var args getPriceTrendArgs
	if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
		return "", fmt.Errorf("get_price_trend: invalid arguments: %w", err)
	}

	periodDays := map[string]int{"1w": 7, "1m": 30, "3m": 90, "6m": 180, "1y": 365}
	days, ok := periodDays[args.Period]
	if !ok {
		days = 30
	}

	end := time.Now()
	start := end.AddDate(0, 0, -days)

	prices, err := s.priceRepo.FindByDateRange(ctx, start, end)
	if err != nil {
		return "", fmt.Errorf("get_price_trend: %w", err)
	}

	// Filter by category since FindByDateRange returns all categories.
	var filtered []model.SteelPrice
	for _, p := range prices {
		if p.Category == args.Category {
			filtered = append(filtered, p)
		}
	}
	if len(filtered) == 0 {
		return fmt.Sprintf(`{"source":"database","message":"未查询到%s的价格趋势数据","category":"%s","period":"%s","points":[]}`,
			args.Category, args.Category, args.Period), nil
	}

	type trendPoint struct {
		Date  string  `json:"date"`
		Price float64 `json:"price"`
	}

	points := make([]trendPoint, 0, len(filtered))
	for _, p := range filtered {
		points = append(points, trendPoint{
			Date:  p.PriceDate.Format("2006-01-02"),
			Price: p.Price,
		})
	}

	result := map[string]interface{}{
		"source":   "database",
		"category": args.Category,
		"period":   args.Period,
		"points":   points,
		"count":    len(points),
	}
	data, _ := json.Marshal(result)
	return string(data), nil
}

func (s *ChatService) executeSetPriceAlert(ctx context.Context, userID uint, argsJSON string) (string, error) {
	var args setPriceAlertArgs
	if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
		return "", fmt.Errorf("set_price_alert: invalid arguments: %w", err)
	}

	alert := &model.PriceAlert{
		UserID:      userID,
		Category:    args.Category,
		TargetPrice: args.TargetPrice,
		Condition:   args.Condition,
		IsActive:    true,
	}

	if err := s.alertRepo.Create(ctx, alert); err != nil {
		return "", fmt.Errorf("set_price_alert: %w", err)
	}

	condDesc := "高于"
	if args.Condition == "below" {
		condDesc = "低于"
	}

	result := map[string]interface{}{
		"source":       "user_alert",
		"alert_id":     alert.ID,
		"category":     args.Category,
		"target_price": args.TargetPrice,
		"condition":    args.Condition,
		"message":      fmt.Sprintf("已设置%s价格预警：当价格%s ¥%.2f 时通知您", args.Category, condDesc, args.TargetPrice),
	}
	data, _ := json.Marshal(result)
	return string(data), nil
}

func (s *ChatService) executeConvertUnit(ctx context.Context, argsJSON string) (string, error) {
	var args convertUnitArgs
	if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
		return "", fmt.Errorf("convert_unit: invalid arguments: %w", err)
	}

	// Define conversion factors relative to base units (吨, 元/吨, 毫米).
	type unitDef struct {
		base   string
		factor float64
	}
	units := map[string]unitDef{
		"吨":    {"吨", 1},
		"千克":   {"吨", 0.001},
		"元/吨":  {"元/吨", 1},
		"元/千克": {"元/吨", 1000},
		"毫米":   {"毫米", 1},
		"厘米":   {"毫米", 10},
		"米":    {"毫米", 1000},
	}

	from, fromOk := units[args.FromUnit]
	to, toOk := units[args.ToUnit]
	if !fromOk || !toOk || from.base != to.base {
		return "", fmt.Errorf("convert_unit: unsupported conversion from %s to %s", args.FromUnit, args.ToUnit)
	}

	baseValue := args.Value * from.factor
	converted := baseValue / to.factor

	result := map[string]interface{}{
		"source":    "system_calculation",
		"value":     args.Value,
		"from_unit": args.FromUnit,
		"to_unit":   args.ToUnit,
		"result":    math.Round(converted*10000) / 10000,
	}
	data, _ := json.Marshal(result)
	return string(data), nil
}

func (s *ChatService) executeCalculateWeight(ctx context.Context, argsJSON string) (string, error) {
	var args calculateWeightArgs
	if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
		return "", fmt.Errorf("calculate_weight: invalid arguments: %w", err)
	}

	// Simplified theoretical weight calculation for common steel shapes.
	// Density of steel ≈ 7850 kg/m³ → 7.85 g/cm³.
	var weightPerUnit float64
	shape := strings.ToLower(args.Shape)

	switch {
	case strings.Contains(shape, "圆钢") || strings.Contains(shape, "圆"):
		// Weight (kg/m) = 0.00617 × d²  where d = diameter in mm.
		var d float64
		fmt.Sscanf(args.Spec, "%fmm", &d)
		weightPerUnit = 0.00617 * d * d

	case strings.Contains(shape, "钢板") || strings.Contains(shape, "板"):
		// Weight (kg) = thickness(mm) × width(m) × length(m) × 7.85.
		weightPerUnit = 7.85

	case strings.Contains(shape, "方管") || strings.Contains(shape, "管"):
		// Rough estimate.
		weightPerUnit = 10.0

	case strings.Contains(shape, "螺纹钢") || strings.Contains(shape, "钢筋"):
		var d float64
		fmt.Sscanf(args.Spec, "%fmm", &d)
		weightPerUnit = 0.00617 * d * d

	default:
		weightPerUnit = 7.85
	}

	totalWeight := math.Round(weightPerUnit*args.Quantity*100) / 100

	result := map[string]interface{}{
		"source":             "system_calculation",
		"shape":              args.Shape,
		"spec":               args.Spec,
		"quantity":           args.Quantity,
		"weight_per_unit_kg": weightPerUnit,
		"total_weight_kg":    totalWeight,
	}
	data, _ := json.Marshal(result)
	return string(data), nil
}

// ---------------------------------------------------------------------------
// Task 3.3 + 3.5: ChatCompletions with function-calling loop
// ---------------------------------------------------------------------------

const maxToolIterations = 5

// ChatCompletions initiates a streaming AI chat conversation with function calling.
// It implements:
//   - System prompt injection (Task 2.1-2.2)
//   - Tool result validation (Task 2.3)
//   - Function calling loop with parallel tool execution (Task 3.3, 3.5)
//   - Context window management (Task 4)
//   - Cancellable context for stop/continue (Task 5)
func (s *ChatService) ChatCompletions(ctx context.Context, userID uint, sessionID uint, content string) (<-chan string, error) {
	// 1. Create or validate session.
	var title string
	if sessionID == 0 {
		session, err := s.createNewSession(ctx, userID, content)
		if err != nil {
			return nil, err
		}
		sessionID = session.ID
		title = session.Title
	} else {
		sess, err := s.chatRepo.FindSessionByID(ctx, sessionID)
		if err != nil {
			return nil, err
		}
		if sess.UserID != userID {
			return nil, fmt.Errorf("session does not belong to user")
		}
		title = sess.Title
	}

	// 2. Save user message.
	userMsg := &model.ChatMessage{
		SessionID: sessionID,
		Role:      "user",
		Content:   content,
	}
	if err := s.chatRepo.CreateMessage(ctx, userMsg); err != nil {
		return nil, err
	}

	// 3. Load message history and delegate to core streaming.
	messages, err := s.chatRepo.FindMessagesBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	return s.chatCompletionsCore(ctx, userID, sessionID, title, messages)
}

// ---------------------------------------------------------------------------
// Task 5: chatCompletionsCore - shared streaming logic for ChatCompletions
// and ContinueGeneration with cancellation support.
// ---------------------------------------------------------------------------

// chatCompletionsCore converts DB messages to OpenAI format, injects the system
// prompt, applies context windowing, and runs the function-calling + streaming
// loop in a goroutine. The returned channel delivers SSE-formatted chunks.
// The context is wrapped with a cancellable child so that StopGeneration can
// interrupt in-progress generations.
func (s *ChatService) chatCompletionsCore(ctx context.Context, userID uint, sessionID uint, title string, messages []model.ChatMessage) (<-chan string, error) {
	// Convert DB messages to OpenAI format.
	openaiMessages := make([]openai.ChatCompletionMessage, 0, len(messages)+1)
	for _, m := range messages {
		var role string
		switch m.Role {
		case "user":
			role = openai.ChatMessageRoleUser
		case "assistant":
			role = openai.ChatMessageRoleAssistant
		default:
			role = openai.ChatMessageRoleUser
		}
		openaiMessages = append(openaiMessages, openai.ChatCompletionMessage{
			Role:    role,
			Content: m.Content,
		})
	}

	// Prepend system prompt.
	openaiMessages = append(
		[]openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: SystemPrompt},
		},
		openaiMessages...,
	)

	// Apply context window (Task 4.1-4.2).
	openaiMessages = applyContextWindow(openaiMessages, 5)

	var intentResult intentMatchResult
	if len(messages) > 0 {
		userMessage := messages[len(messages)-1].Content
		intentResult = s.matchIntent(ctx, userMessage)
		if intentResult.matchMethod != "none" {
			builder := fmt.Sprintf("[意图识别结果]\n用户意图: %s\n置信度: %.0f%%\n匹配方式: %s",
				intentResult.intentName, intentResult.confidence*100, intentResult.matchMethod)
			if tool, ok := intentToToolName[intentResult.intentCode]; ok {
				builder += "\n建议工具: " + tool
			}
			if len(intentResult.entities) > 0 {
				var parts []string
				for k, v := range intentResult.entities {
					parts = append(parts, k+"="+v)
				}
				builder += "\n关联实体: " + strings.Join(parts, ", ")
			}
			builder += "\n"
			openaiMessages[0].Content = builder + "\n" + openaiMessages[0].Content
		}
	}

	// Create cancellable context and register it (Task 5.1).
	ctx, cancel := context.WithCancel(ctx)
	s.mu.Lock()
	s.activeCancels[sessionID] = cancel
	s.mu.Unlock()

	ch := make(chan string, 100)

	startTime := time.Now()

	go func() {
		defer close(ch)
		defer func() {
			s.mu.Lock()
			delete(s.activeCancels, sessionID)
			s.mu.Unlock()
		}()

		// Send session_id event so frontend can update currentSessionId.
		if sessionID > 0 {
			sessionPayload, _ := json.Marshal(map[string]interface{}{
				"session_id": sessionID,
				"title":      title,
			})
			ch <- fmt.Sprintf("data: %s\n\n", string(sessionPayload))
		}

		if len(messages) > 0 {
			if intentResult.matchMethod != "none" {
				intentPayload, _ := json.Marshal(map[string]interface{}{
					"type": "intent_match",
					"data": map[string]interface{}{
						"match_method": intentResult.matchMethod,
						"intent":       intentResult.intentName,
						"confidence":   intentResult.confidence,
						"entities":     intentResult.entities,
					},
				})
				ch <- fmt.Sprintf("data: %s\n\n", string(intentPayload))
			}
		}

		var fullContentBuilder strings.Builder

		// Collect tool results for structured card output
		type collectedToolResult struct {
			toolName string
			result   string
			err      error
		}
		var toolResults []collectedToolResult

		// --- Function-calling loop (Task 3.3) ---
		loopMessages := openaiMessages
		for i := 0; i < maxToolIterations; i++ {
			// Check for cancellation before each AI call (Task 5.1).
			select {
			case <-ctx.Done():
				s.saveStoppedMessage(sessionID, &fullContentBuilder)
				return
			default:
			}

			resp, err := s.aiClient.ChatWithTools(ctx, loopMessages, s.BuildTools(ctx))
			if err != nil {
				if ctx.Err() != nil {
					s.saveStoppedMessage(sessionID, &fullContentBuilder)
					return
				}
				ch <- fmt.Sprintf("data: {\"error\": %q}\n\n", err.Error())
				ch <- "data: [DONE]\n\n"
				return
			}

			if len(resp.Choices) == 0 {
				ch <- "data: {\"error\": \"no response from AI\"}\n\n"
				ch <- "data: [DONE]\n\n"
				return
			}

			choice := resp.Choices[0]

			// If the model wants to call tools, execute them and continue the loop.
			if len(choice.Message.ToolCalls) > 0 {
				// Append the assistant message with tool calls to the conversation.
				loopMessages = append(loopMessages, choice.Message)

				// Task 3.5: Execute tools in parallel.
				type toolResult struct {
					toolCallID string
					name       string
					result     string
					err        error
				}

				resultCh := make(chan toolResult, len(choice.Message.ToolCalls))
				var wg sync.WaitGroup

				for _, tc := range choice.Message.ToolCalls {
					wg.Add(1)
					go func(tc openai.ToolCall) {
						defer wg.Done()
						res, execErr := s.ExecuteTool(ctx, userID, tc)
						if execErr != nil {
							resultCh <- toolResult{toolCallID: tc.ID, name: tc.Function.Name, result: "", err: execErr}
							return
						}
						// Task 2.3: validate tool result.
						if valErr := validateToolResult(tc.Function.Name, res); valErr != nil {
							resultCh <- toolResult{toolCallID: tc.ID, name: tc.Function.Name, result: "", err: valErr}
							return
						}
						resultCh <- toolResult{toolCallID: tc.ID, name: tc.Function.Name, result: res, err: nil}
					}(tc)
				}

				go func() {
					wg.Wait()
					close(resultCh)
				}()

				// Collect results and append tool messages.
				for tr := range resultCh {
					content := tr.result
					if tr.err != nil {
						content = fmt.Sprintf(`{"error":"%s"}`, tr.err.Error())
					}
					loopMessages = append(loopMessages, openai.ChatCompletionMessage{
						Role:       openai.ChatMessageRoleTool,
						Content:    content,
						Name:       tr.name,
						ToolCallID: tr.toolCallID,
					})
					toolResults = append(toolResults, collectedToolResult{
						toolName: tr.name,
						result:   tr.result,
						err:      tr.err,
					})
				}

				continue // back to top of loop
			}

			// No tool calls: the model produced a final content response.
			// Stream the content via ChatStreamWithTools (Task 3.4).
			stream, streamErr := s.aiClient.ChatStreamWithTools(ctx, loopMessages, s.BuildTools(ctx))
			if streamErr != nil {
				if ctx.Err() != nil {
					s.saveStoppedMessage(sessionID, &fullContentBuilder)
					return
				}
				ch <- fmt.Sprintf("data: {\"error\": %q}\n\n", streamErr.Error())
				ch <- "data: [DONE]\n\n"
				return
			}
			defer stream.Close()

			for {
				// Check cancellation during streaming (Task 5.1).
				select {
				case <-ctx.Done():
					s.saveStoppedMessage(sessionID, &fullContentBuilder)
					return
				default:
				}

				streamResp, recvErr := stream.Recv()
				if recvErr == io.EOF {
					break
				}
				if recvErr != nil {
					if ctx.Err() != nil {
						s.saveStoppedMessage(sessionID, &fullContentBuilder)
						return
					}
					ch <- fmt.Sprintf("data: {\"error\": %q}\n\n", recvErr.Error())
					ch <- "data: [DONE]\n\n"
					return
				}

				if len(streamResp.Choices) > 0 {
					delta := streamResp.Choices[0].Delta.Content
					if delta != "" {
						fullContentBuilder.WriteString(delta)
						payload, _ := json.Marshal(map[string]string{"content": delta})
						ch <- fmt.Sprintf("data: %s\n\n", payload)
					}
				}
			}

			// Save assistant message.
			assistantContent := fullContentBuilder.String()
			if assistantContent != "" {
				assistantMsg := &model.ChatMessage{
					SessionID: sessionID,
					Role:      "assistant",
					Content:   assistantContent,
				}
				if err := s.chatRepo.CreateMessage(ctx, assistantMsg); err != nil {
					ch <- fmt.Sprintf("data: {\"error\": %q}\n\n", err.Error())
				}
			}

			// Update session metadata.
			sess, err := s.chatRepo.FindSessionByID(ctx, sessionID)
			if err == nil {
				sess.MessageCount += 2
				_ = s.chatRepo.UpdateSession(ctx, sess)
			}

			// Record token usage with extended API call fields.
			if s.tokenUsageRepo != nil {
				sessIDStr := fmt.Sprintf("%d", sessionID)
				usage := &model.TokenUsage{
					UserID:     userID,
					SessionID:  sessIDStr,
					Model:      "gpt-4o-mini",
					APIPath:    "/api/v1/chat/completions",
					StatusCode: 200,
					DurationMs: int(time.Since(startTime).Milliseconds()),
				}
				_ = s.tokenUsageRepo.Create(context.Background(), usage)
			}

			// Task 4.3: Persist context.
			s.persistContext(ctx, sessionID, choice.Message.ToolCalls)

			// Emit structured card data before [DONE]
			for _, tr := range toolResults {
				if tr.err != nil {
					continue
				}
				switch tr.toolName {
				case "query_steel_price":
					// Emit price card
					var priceResult struct {
						Prices []struct {
							Category  string  `json:"category"`
							Spec      string  `json:"spec"`
							Price     float64 `json:"price"`
							Change    float64 `json:"change"`
							ChangePct float64 `json:"change_pct"`
							Region    string  `json:"region"`
							Source    string  `json:"source"`
							Date      string  `json:"date"`
						} `json:"prices"`
						Count  int    `json:"count"`
						Source string `json:"source"`
					}
					if json.Unmarshal([]byte(tr.result), &priceResult) == nil && len(priceResult.Prices) > 0 {
						// Generate card title from first price
						first := priceResult.Prices[0]
						cardData := map[string]interface{}{
							"eyebrow":    "PRICE",
							"title":      first.Category + " " + first.Spec,
							"prices":     priceResult.Prices,
							"source":     first.Source,
							"sourceTime": first.Date,
						}
						// Check if multi-category (compare card)
						categories := make(map[string]bool)
						for _, p := range priceResult.Prices {
							categories[p.Category] = true
						}
						cardType := "price"
						if len(categories) > 1 {
							cardType = "compare"
						}
						cardPayload, _ := json.Marshal(map[string]interface{}{
							"type":      "card",
							"card_type": cardType,
							"data":      cardData,
						})
						ch <- fmt.Sprintf("data: %s\n\n", cardPayload)
					}
				case "get_price_trend":
					var trendResult struct {
						Points []struct {
							Date  string  `json:"date"`
							Price float64 `json:"price"`
						} `json:"points"`
						Source string `json:"source"`
						Date   string `json:"date"`
					}
					if json.Unmarshal([]byte(tr.result), &trendResult) == nil && len(trendResult.Points) > 0 {
						trendData := make([]map[string]interface{}, 0, len(trendResult.Points))
						for _, d := range trendResult.Points {
							trendData = append(trendData, map[string]interface{}{
								"date":  d.Date,
								"value": d.Price,
							})
						}
						var lastPrice float64
						var changePct float64
						if len(trendResult.Points) > 1 {
							lastPrice = trendResult.Points[len(trendResult.Points)-1].Price
							firstPrice := trendResult.Points[0].Price
							if firstPrice != 0 {
								changePct = ((lastPrice - firstPrice) / firstPrice) * 100
							}
						}
						cardPayload, _ := json.Marshal(map[string]interface{}{
							"type":      "card",
							"card_type": "trend",
							"data": map[string]interface{}{
								"title":     "价格走势",
								"data":      trendData,
								"changePct": changePct,
							},
						})
						ch <- fmt.Sprintf("data: %s\n\n", cardPayload)
					}
				case "search_news":
					var newsResult struct {
						News []struct {
							ID          uint   `json:"id"`
							Title       string `json:"title"`
							Summary     string `json:"summary"`
							Source      string `json:"source"`
							SourceURL   string `json:"source_url"`
							Category    string `json:"category"`
							PublishedAt string `json:"published_at"`
						} `json:"news"`
						Count  int    `json:"count"`
						Source string `json:"source"`
						Date   string `json:"date"`
					}
					if json.Unmarshal([]byte(tr.result), &newsResult) == nil && len(newsResult.News) > 0 {
						cardPayload, _ := json.Marshal(map[string]interface{}{
							"type":      "card",
							"card_type": "news",
							"data": map[string]interface{}{
								"title":      "行业资讯",
								"news":       newsResult.News,
								"source":     newsResult.Source,
								"sourceTime": newsResult.Date,
							},
						})
						ch <- fmt.Sprintf("data: %s\n\n", cardPayload)
					}
				case "set_price_alert":
					var alertResult struct {
						AlertID     uint    `json:"alert_id"`
						Category    string  `json:"category"`
						TargetPrice float64 `json:"target_price"`
						Condition   string  `json:"condition"`
						Source      string  `json:"source"`
					}
					if json.Unmarshal([]byte(tr.result), &alertResult) == nil && alertResult.AlertID > 0 {
						cardPayload, _ := json.Marshal(map[string]interface{}{
							"type":      "card",
							"card_type": "alert",
							"data": map[string]interface{}{
								"id":           alertResult.AlertID,
								"category":     alertResult.Category,
								"target_price": alertResult.TargetPrice,
								"condition":    alertResult.Condition,
								"is_active":    true,
							},
						})
						ch <- fmt.Sprintf("data: %s\n\n", cardPayload)
					}
				}
			}

			ch <- "data: [DONE]\n\n"
			return
		}

		// Exceeded max tool iterations.
		ch <- "data: {\"error\": \"exceeded maximum tool call iterations\"}\n\n"
		ch <- "data: [DONE]\n\n"
	}()

	return ch, nil
}

// ---------------------------------------------------------------------------
// Task 5.1: saveStoppedMessage persists partially-streamed content when
// generation is cancelled. Uses context.Background() because the original
// context is already cancelled.
// ---------------------------------------------------------------------------

func (s *ChatService) saveStoppedMessage(sessionID uint, content *strings.Builder) {
	text := content.String()
	if text == "" {
		return
	}
	text += "\n\n_已停止生成_"
	assistantMsg := &model.ChatMessage{
		SessionID: sessionID,
		Role:      "assistant",
		Content:   text,
	}
	_ = s.chatRepo.CreateMessage(context.Background(), assistantMsg)
}

// ---------------------------------------------------------------------------
// Task 5.2: StopGeneration cancels an in-progress generation for a session.
// ---------------------------------------------------------------------------

// StopGeneration cancels an in-progress AI generation for the given session.
// It verifies session ownership before cancelling.
func (s *ChatService) StopGeneration(ctx context.Context, userID uint, sessionID uint) error {
	sess, err := s.chatRepo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return err
	}
	if sess.UserID != userID {
		return fmt.Errorf("session does not belong to user")
	}

	s.mu.Lock()
	cancel, ok := s.activeCancels[sessionID]
	if ok {
		cancel()
		delete(s.activeCancels, sessionID)
	}
	s.mu.Unlock()

	return nil
}

// ---------------------------------------------------------------------------
// Task 5.3: ContinueGeneration resumes a previously stopped generation.
// ---------------------------------------------------------------------------

// ContinueGeneration resumes a previously stopped AI generation by removing
// the "_已停止生成_" marker from the last assistant message and re-invoking
// the core streaming logic with existing message history.
func (s *ChatService) ContinueGeneration(ctx context.Context, userID uint, sessionID uint) (<-chan string, error) {
	sess, err := s.chatRepo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if sess.UserID != userID {
		return nil, fmt.Errorf("session does not belong to user")
	}

	messages, err := s.chatRepo.FindMessagesBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	// Find the last assistant message and remove the stopped marker.
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].Role == "assistant" {
			content := messages[i].Content
			if idx := strings.Index(content, "\n\n_已停止生成_"); idx >= 0 {
				messages[i].Content = content[:idx]
				_ = s.chatRepo.UpdateMessage(ctx, &messages[i])
			}
			break
		}
	}

	// Re-use the core streaming logic with the cleaned message history.
	return s.chatCompletionsCore(ctx, userID, sessionID, sess.Title, messages)
}

// --- search_news / get_news_detail implementations ---

func (s *ChatService) executeSearchNews(ctx context.Context, argsJSON string) (string, error) {
	var args searchNewsArgs
	if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
		return "", fmt.Errorf("search_news: invalid arguments: %w", err)
	}

	news, err := s.newsRepo.Search(ctx, args.Keyword, args.Category, 5)
	if err != nil {
		return "", fmt.Errorf("search_news: %w", err)
	}
	if len(news) == 0 {
		return `{"source":"database","date":"","message":"未查询到相关资讯","news":[]}`, nil
	}

	type newsItem struct {
		ID          uint   `json:"id"`
		Title       string `json:"title"`
		Summary     string `json:"summary"`
		Source      string `json:"source"`
		SourceURL   string `json:"source_url"`
		Category    string `json:"category"`
		PublishedAt string `json:"published_at"`
	}

	items := make([]newsItem, 0, len(news))
	for _, n := range news {
		items = append(items, newsItem{
			ID:          n.ID,
			Title:       n.Title,
			Summary:     n.Summary,
			Source:      n.Source,
			SourceURL:   n.SourceURL,
			Category:    n.Category,
			PublishedAt: n.PublishedAt.Format("2006-01-02"),
		})
	}

	result := map[string]interface{}{
		"source": "database",
		"date":   time.Now().Format("2006-01-02"),
		"news":   items,
		"count":  len(items),
	}
	data, _ := json.Marshal(result)
	return string(data), nil
}

func (s *ChatService) executeGetNewsDetail(ctx context.Context, argsJSON string) (string, error) {
	var args getNewsDetailArgs
	if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
		return "", fmt.Errorf("get_news_detail: invalid arguments: %w", err)
	}

	n, err := s.newsRepo.FindByID(ctx, args.ID)
	if err != nil {
		return "", fmt.Errorf("get_news_detail: %w", err)
	}

	result := map[string]interface{}{
		"source":       "database",
		"date":         time.Now().Format("2006-01-02"),
		"id":           n.ID,
		"title":        n.Title,
		"summary":      n.Summary,
		"content":      n.Content,
		"source_name":  n.Source,
		"source_url":   n.SourceURL,
		"category":     n.Category,
		"published_at": n.PublishedAt.Format("2006-01-02"),
	}
	data, _ := json.Marshal(result)
	return string(data), nil
}

// persistContext extracts intent from tool calls and saves session context (Task 4.3).
func (s *ChatService) persistContext(ctx context.Context, sessionID uint, toolCalls []openai.ToolCall) {
	sess, err := s.chatRepo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return
	}

	chatCtx := sess.GetContext()
	chatCtx.TurnCount++

	// Derive intent from the first tool call name.
	if len(toolCalls) > 0 {
		switch toolCalls[0].Function.Name {
		case "query_steel_price", "get_price_trend":
			chatCtx.Intent = "price_query"
		case "calculate_quotation":
			chatCtx.Intent = "quotation"
		case "search_knowledge":
			chatCtx.Intent = "knowledge_search"
		case "query_tender":
			chatCtx.Intent = "tender"
		case "set_price_alert":
			chatCtx.Intent = "price_alert"
		case "convert_unit":
			chatCtx.Intent = "unit_conversion"
		case "calculate_weight":
			chatCtx.Intent = "weight_calculation"
		case "search_news", "get_news_detail":
			chatCtx.Intent = "news"
		}
	}

	sess.SetContext(chatCtx)
	_ = s.chatRepo.UpdateSession(ctx, sess)
}

// ---------------------------------------------------------------------------
// GetChatSessions returns the user's chat session history.
// ---------------------------------------------------------------------------

func (s *ChatService) GetChatSessions(ctx context.Context, userID uint, limit, offset int) ([]model.ChatSession, error) {
	return s.chatRepo.FindSessionsByUserID(ctx, userID, limit, offset)
}

// ---------------------------------------------------------------------------
// createNewSession creates a new chat session from the first message.
// ---------------------------------------------------------------------------

func (s *ChatService) createNewSession(ctx context.Context, userID uint, firstMessage string) (*model.ChatSession, error) {
	title := firstMessage
	if len([]rune(title)) > 30 {
		title = string([]rune(title)[:30]) + "..."
	}

	session := &model.ChatSession{
		UserID: userID,
		Title:  title,
		Model:  "gpt-4o-mini",
	}

	if err := s.chatRepo.CreateSession(ctx, session); err != nil {
		return nil, err
	}
	return session, nil
}

// ---------------------------------------------------------------------------
// Task 6: DeleteSession deletes a chat session after verifying ownership.
// ---------------------------------------------------------------------------

func (s *ChatService) DeleteSession(ctx context.Context, userID uint, sessionID uint) error {
	sess, err := s.chatRepo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return err
	}
	if sess.UserID != userID {
		return fmt.Errorf("session does not belong to user")
	}
	return s.chatRepo.DeleteSession(ctx, sessionID)
}

// ---------------------------------------------------------------------------
// Task 6: GetSessionMessages returns messages for a session.
// ---------------------------------------------------------------------------

func (s *ChatService) GetSessionMessages(ctx context.Context, userID uint, sessionID uint) ([]model.ChatMessage, error) {
	sess, err := s.chatRepo.FindSessionByID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if sess.UserID != userID {
		return nil, fmt.Errorf("session does not belong to user")
	}
	return s.chatRepo.FindMessagesBySessionID(ctx, sessionID)
}

// ---------------------------------------------------------------------------
// Task 6: SubmitFeedback stores user feedback on an AI response.
// ---------------------------------------------------------------------------

func (s *ChatService) SubmitFeedback(ctx context.Context, userID uint, messageID uint, isHelpful bool, comment string, errorType string) error {
	feedback := &model.AIFeedback{
		MessageID: messageID,
		UserID:    userID,
		IsHelpful: isHelpful,
		Comment:   comment,
	}
	if err := s.chatRepo.CreateFeedback(ctx, feedback); err != nil {
		return err
	}

	// When feedback is negative, automatically create a BadCase for quality analysis.
	// This is best-effort: even if BadCase creation fails, the feedback is already saved.
	if !isHelpful && s.badCaseService != nil {
		msg, err := s.chatRepo.GetMessageByID(ctx, messageID)
		if err != nil {
			return nil
		}

		// Try to find the preceding user message in the same session.
		userQuery := ""
		messages, msgErr := s.chatRepo.FindMessagesBySessionID(ctx, msg.SessionID)
		if msgErr == nil {
			for i := len(messages) - 1; i >= 0; i-- {
				if messages[i].ID < messageID && messages[i].Role == "user" {
					userQuery = messages[i].Content
					break
				}
			}
		}
		if userQuery == "" {
			userQuery = msg.Content
		}

		bcErrType := errorType
		if bcErrType == "" {
			bcErrType = "data_anomaly"
		}

		sessionID := msg.SessionID
		badCase := &model.BadCase{
			UserQuery:      userQuery,
			AIResponse:     msg.Content,
			ErrorType:      bcErrType,
			Status:         "pending",
			ConversationID: &sessionID,
			ReportedBy:     &userID,
		}
		s.badCaseService.Create(ctx, badCase)
	}
	return nil
}
