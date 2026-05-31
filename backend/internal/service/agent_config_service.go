package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"

	"gorm.io/gorm"
)

// AgentConfigDO represents the full agent configuration stored as JSON in the
// agent_configs table under config_key="agent_config".
type AgentConfigDO struct {
	PrimaryModel       string                `json:"primaryModel"`
	BackupModel        string                `json:"backupModel"`
	Temperature        float64               `json:"temperature"`
	MaxTokens          int                   `json:"maxTokens"`
	ApiKey             string                `json:"apiKey"`
	Timeout            int                   `json:"timeout"`
	SystemPrompt       string                `json:"systemPrompt"`
	WelcomeMessage     string                `json:"welcomeMessage"`
	QuickCommands      []QuickCommandDO      `json:"quickCommands"`
	HallucinationRules []HallucinationRuleDO `json:"hallucinationRules"`
	Disclaimer         string                `json:"disclaimer"`
	ForceToolForData   bool                  `json:"forceToolForData"`
	UseTemplateForChat bool                  `json:"useTemplateForChat"`
	ContextTurns       int                   `json:"contextTurns"`
	Models             []ModelConfigDO       `json:"models"`
}

// QuickCommandDO represents a single quick-command entry in the agent config.
type QuickCommandDO struct {
	ID     string `json:"id"`
	Icon   string `json:"icon"`
	Label  string `json:"label"`
	Prompt string `json:"prompt"`
	Order  int    `json:"order"`
}

// HallucinationRuleDO represents a price-range rule used for hallucination prevention.
type HallucinationRuleDO struct {
	ID       string  `json:"id"`
	Category string  `json:"category"`
	MinPrice float64 `json:"minPrice"`
	MaxPrice float64 `json:"maxPrice"`
}

// ModelConfigDO represents a single AI model configuration entry.
type ModelConfigDO struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	BaseURL string `json:"baseUrl"`
	APIKey  string `json:"apiKey"`
}

// PromptVersionDO represents a snapshot of the system prompt version history.
type PromptVersionDO struct {
	Version   string `json:"version"`
	Editor    string `json:"editor"`
	EditedAt  string `json:"editedAt"`
	IsCurrent bool   `json:"isCurrent"`
	Content   string `json:"content"`
}

// AgentConfigService handles agent configuration business logic.
type AgentConfigService struct {
	configRepo   *repository.AgentConfigRepository
	categoryRepo *repository.CategoryRepository
}

// NewAgentConfigService creates a new AgentConfigService with the given config repository.
func NewAgentConfigService(configRepo *repository.AgentConfigRepository, categoryRepo *repository.CategoryRepository) *AgentConfigService {
	return &AgentConfigService{configRepo: configRepo, categoryRepo: categoryRepo}
}

const (
	configKeyAgentConfig    = "agent_config"
	configKeyPromptVersions = "prompt_versions"
)

// GetAgentConfig retrieves the agent configuration. If none exists in the
// database it returns the built-in default configuration.
func (s *AgentConfigService) GetAgentConfig(ctx context.Context) (*AgentConfigDO, error) {
	cfg, err := s.configRepo.FindByKey(ctx, configKeyAgentConfig)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return s.defaultConfig(ctx), nil
		}
		return nil, fmt.Errorf("查询Agent配置失败: %w", err)
	}

	var result AgentConfigDO
	if err := json.Unmarshal([]byte(cfg.ConfigValue), &result); err != nil {
		return nil, fmt.Errorf("解析Agent配置JSON失败: %w", err)
	}
	return &result, nil
}

// SaveAgentConfig persists the agent configuration. If the system prompt has
// changed compared to the stored version, the previous prompt is automatically
// saved as a new version in the prompt-versions history.
func (s *AgentConfigService) SaveAgentConfig(ctx context.Context, config *AgentConfigDO) error {
	// Read current config to compare system prompt.
	oldCfg, findErr := s.configRepo.FindByKey(ctx, configKeyAgentConfig)
	if findErr == nil {
		var old AgentConfigDO
		if json.Unmarshal([]byte(oldCfg.ConfigValue), &old) == nil {
			if old.SystemPrompt != config.SystemPrompt && config.SystemPrompt != "" {
				// Auto-snapshot new prompt as a version.
				_ = s.recordPromptVersion(ctx, config.SystemPrompt, "admin")
			}
		}
	}

	data, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("序列化Agent配置失败: %w", err)
	}

	now := time.Now()
	if findErr == nil {
		// Update existing record.
		oldCfg.ConfigValue = string(data)
		oldCfg.UpdatedAt = now
		return s.configRepo.Update(ctx, oldCfg)
	} else if errors.Is(findErr, gorm.ErrRecordNotFound) {
		// Create new record.
		return s.configRepo.Create(ctx, &model.AgentConfig{
			ConfigKey:   configKeyAgentConfig,
			ConfigValue: string(data),
			Description: "AI Agent 主配置",
			IsActive:    true,
		})
	}

	return fmt.Errorf("保存Agent配置失败: %w", findErr)
}

// GetPromptVersions returns the version history of system prompts.
func (s *AgentConfigService) GetPromptVersions(ctx context.Context) ([]PromptVersionDO, error) {
	cfg, err := s.configRepo.FindByKey(ctx, configKeyPromptVersions)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return []PromptVersionDO{}, nil
		}
		return nil, fmt.Errorf("查询提示词版本失败: %w", err)
	}

	var versions []PromptVersionDO
	if err := json.Unmarshal([]byte(cfg.ConfigValue), &versions); err != nil {
		return nil, fmt.Errorf("解析提示词版本JSON失败: %w", err)
	}
	return versions, nil
}

// SavePromptVersions persists the prompt version history.
func (s *AgentConfigService) SavePromptVersions(ctx context.Context, versions []PromptVersionDO) error {
	data, err := json.Marshal(versions)
	if err != nil {
		return fmt.Errorf("序列化提示词版本失败: %w", err)
	}

	cfg, err := s.configRepo.FindByKey(ctx, configKeyPromptVersions)
	if err == nil {
		cfg.ConfigValue = string(data)
		cfg.UpdatedAt = time.Now()
		return s.configRepo.Update(ctx, cfg)
	} else if errors.Is(err, gorm.ErrRecordNotFound) {
		return s.configRepo.Create(ctx, &model.AgentConfig{
			ConfigKey:   configKeyPromptVersions,
			ConfigValue: string(data),
			Description: "System Prompt 版本历史",
			IsActive:    true,
		})
	}

	return fmt.Errorf("保存提示词版本失败: %w", err)
}

// recordPromptVersion appends a new version entry to the prompt version history.
// It reads the current versions, marks all as non-current, and prepends a new entry.
func (s *AgentConfigService) recordPromptVersion(ctx context.Context, content, editor string) error {
	versions, err := s.GetPromptVersions(ctx)
	if err != nil {
		return err
	}

	// Mark all existing versions as non-current.
	for i := range versions {
		versions[i].IsCurrent = false
	}

	// Format version string based on count.
	versionStr := fmt.Sprintf("v%d", len(versions)+1)
	now := time.Now().Format("2006-01-02 15:04:05")

	newVersion := PromptVersionDO{
		Version:   versionStr,
		Editor:    editor,
		EditedAt:  now,
		IsCurrent: true,
		Content:   content,
	}

	// Prepend new version.
	versions = append([]PromptVersionDO{newVersion}, versions...)

	return s.SavePromptVersions(ctx, versions)
}

// TestConnectionRequest is the request body for testing a model connection.
type TestConnectionRequest struct {
	APIKey  string `json:"apiKey"`
	BaseURL string `json:"baseUrl"`
	Model   string `json:"model"`
}

// TestConnectionResponse is the response body for a connection test.
type TestConnectionResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// TestConnection tests connectivity to a model provider by sending a minimal
// chat completion request. This works with any OpenAI-compatible API
// (OpenAI, DeepSeek, Qwen, etc.) without relying on the /models endpoint.
func (s *AgentConfigService) TestConnection(ctx context.Context, req *TestConnectionRequest) (*TestConnectionResponse, error) {
	baseURL := req.BaseURL
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}

	type chatMsg struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	type chatReq struct {
		Model     string    `json:"model"`
		Messages  []chatMsg `json:"messages"`
		MaxTokens int       `json:"max_tokens"`
	}

	bodyData, err := json.Marshal(chatReq{
		Model: req.Model,
		Messages: []chatMsg{
			{Role: "user", Content: "hi"},
		},
		MaxTokens: 5,
	})
	if err != nil {
		return &TestConnectionResponse{Success: false, Message: "序列化请求失败"}, nil
	}

	url := baseURL + "/chat/completions"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyData))
	if err != nil {
		return &TestConnectionResponse{Success: false, Message: "构建请求失败"}, nil
	}
	httpReq.Header.Set("Authorization", "Bearer "+req.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	start := time.Now()
	resp, err := client.Do(httpReq)
	latency := time.Since(start).Milliseconds()

	if err != nil {
		return &TestConnectionResponse{
			Success: false,
			Message: "连接失败，请检查网络与 API Key",
		}, nil
	}
	defer resp.Body.Close()

	// Success: 200 means model responded to our test request.
	if resp.StatusCode == 200 {
		return &TestConnectionResponse{
			Success: true,
			Message: fmt.Sprintf("连接成功 · %s · 延迟 %dms", req.Model, latency),
		}, nil
	}

	// 401/403: endpoint reachable but auth failed.
	// 404: model not found.
	// Read the API error response for a friendly message.
	var errResp struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&errResp)
	msg := errResp.Error.Message
	if msg == "" {
		switch resp.StatusCode {
		case 401, 403:
			msg = "请检查 API Key 是否正确"
		case 404:
			msg = "模型不存在，请检查模型名称"
		default:
			msg = fmt.Sprintf("HTTP %d", resp.StatusCode)
		}
	}
	return &TestConnectionResponse{
		Success: false,
		Message: fmt.Sprintf("请求失败 · %s", msg),
	}, nil
}

// defaultConfig returns the built-in default agent configuration.
// This MUST match the frontend Mock data exactly.
func (s *AgentConfigService) defaultConfig(ctx context.Context) *AgentConfigDO {
	categories, err := s.categoryRepo.FindEnabled(ctx)
	var rules []HallucinationRuleDO
	if err != nil || len(categories) == 0 {
		rules = []HallucinationRuleDO{
			{ID: "hr-1", Category: "螺纹钢", MinPrice: 3000, MaxPrice: 5000},
			{ID: "hr-2", Category: "热卷", MinPrice: 3200, MaxPrice: 5200},
			{ID: "hr-3", Category: "冷轧", MinPrice: 3800, MaxPrice: 6000},
			{ID: "hr-4", Category: "中厚板", MinPrice: 3500, MaxPrice: 5500},
			{ID: "hr-5", Category: "镀锌板", MinPrice: 4000, MaxPrice: 6500},
			{ID: "hr-6", Category: "彩涂板", MinPrice: 4500, MaxPrice: 7000},
			{ID: "hr-7", Category: "不锈钢", MinPrice: 8000, MaxPrice: 20000},
			{ID: "hr-8", Category: "型钢", MinPrice: 3500, MaxPrice: 5500},
			{ID: "hr-9", Category: "管材", MinPrice: 3800, MaxPrice: 6000},
		}
	} else {
		rules = make([]HallucinationRuleDO, 0, len(categories))
		for i, cat := range categories {
			rules = append(rules, HallucinationRuleDO{
				ID:       fmt.Sprintf("hr-%d", i+1),
				Category: cat.Name,
				MinPrice: 3000,
				MaxPrice: 8000,
			})
		}
	}

	return &AgentConfigDO{
		PrimaryModel:   "gpt-4o-mini",
		BackupModel:    "通义千问",
		Temperature:    0.1,
		MaxTokens:      2048,
		ApiKey:         "",
		Timeout:        30,
		SystemPrompt:   "你是一个钢铁行业智能助手。重要规则：\n1. 所有价格数据必须通过工具调用获取，禁止编造\n2. 如果不确定，明确告知用户\"我需要查询一下\"\n3. 涉及交易决策时，必须附加免责声明\n4. 结论先行，数据优先，来源可追溯\n5. 数字格式：价格用千分位+单位（¥3,850/吨），涨跌用符号+百分比（+12 +0.31%）",
		WelcomeMessage: "您好，我是钢铁行业智能助手。可以帮您查价格、算报价、看招标、搜知识。请告诉我您需要什么帮助？",
		QuickCommands: []QuickCommandDO{
			{ID: "qc-1", Icon: "Search", Label: "查价格", Prompt: "帮我查询螺纹钢最新价格", Order: 1},
			{ID: "qc-2", Icon: "Calculator", Label: "算报价", Prompt: "帮我计算报价", Order: 2},
			{ID: "qc-3", Icon: "FileText", Label: "看招标", Prompt: "最近有哪些招标信息？", Order: 3},
			{ID: "qc-4", Icon: "BookOpen", Label: "搜知识", Prompt: "帮我查一下国家标准", Order: 4},
			{ID: "qc-5", Icon: "TrendingUp", Label: "看走势", Prompt: "螺纹钢价格走势如何？", Order: 5},
			{ID: "qc-6", Icon: "Bell", Label: "设预警", Prompt: "帮我设置价格预警", Order: 6},
		},
		HallucinationRules: rules,
		Disclaimer:         "以上数据仅供参考，实际价格以交易时为准。数据来源于公开市场信息，不构成投资建议。",
		ForceToolForData:   true,
		UseTemplateForChat: false,
		ContextTurns:       5,
		Models: []ModelConfigDO{
			{ID: "m-1", Name: "GPT-4o-mini", BaseURL: "https://api.openai.com/v1", APIKey: ""},
			{ID: "m-2", Name: "GPT-4o", BaseURL: "https://api.openai.com/v1", APIKey: ""},
			{ID: "m-3", Name: "通义千问", BaseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", APIKey: ""},
			{ID: "m-4", Name: "DeepSeek", BaseURL: "https://api.deepseek.com", APIKey: ""},
		},
	}
}
