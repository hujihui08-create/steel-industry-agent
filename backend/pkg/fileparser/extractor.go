package fileparser

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"steel-agent-backend/pkg/ai"

	"github.com/sashabaranov/go-openai"
)

// ExtractionResult holds structured steel-related information extracted from a document.
type ExtractionResult struct {
	Category   string  `json:"category"`   // e.g. "热卷"
	Spec       string  `json:"spec"`       // e.g. "Q235B 5.5mm"
	Quantity   float64 `json:"quantity"`   // e.g. 100
	Unit       string  `json:"unit"`       // e.g. "吨"
	Region     string  `json:"region"`     // e.g. "上海"
	Deadline   string  `json:"deadline"`   // e.g. "2026-07-15"
	Notes      string  `json:"notes"`      // additional information
	Confidence float64 `json:"confidence"` // 0-1, how confident the extraction is
}

const steelExtractionSystemPrompt = `你是一个钢铁行业数据提取专家。请从用户提供的文本中提取以下结构化信息。

提取规则：
1. 品名(category)：钢材品种，如螺纹钢、热卷、冷轧、中厚板、线材、型钢、管材等
2. 规格(spec)：材质和尺寸规格，如 Q235B、HRB400E、5.5mm、20mm 等
3. 数量(quantity)：采购或需求的数值，提取为纯数字
4. 单位(unit)：数量单位，如吨、公斤、米、件等
5. 地区(region)：交货地、采购地或报价地区，如上海、北京、广州等
6. 交期(deadline)：交货日期或截止日期，格式保持原文或转为 YYYY-MM-DD
7. 备注(notes)：其他关键信息的摘要
8. 置信度(confidence)：0-1之间的数值，表示你对提取结果的确信程度

重要规则：
- 如果某个字段在文本中未找到，留空字符串或0
- 仅返回 JSON 格式的结果，不要添加任何其他文字
- 如果文本中完全没有任何钢铁相关字段，confidence 设为 0，其他字段留空`

// extractJSONFromResponse attempts to extract a JSON object from an LLM response
// that may be wrapped in markdown code blocks or have surrounding text.
func extractJSONFromResponse(content string) string {
	// Try to extract JSON from markdown code block: ```json ... ```
	codeBlockRe := regexp.MustCompile("(?s)```(?:json)?\\s*\\n?(\\{.*?\\})\\n?\\s*```")
	matches := codeBlockRe.FindStringSubmatch(content)
	if len(matches) >= 2 {
		return strings.TrimSpace(matches[1])
	}

	// Try to find a bare JSON object
	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}")
	if start >= 0 && end > start {
		return content[start : end+1]
	}

	return content
}

// ExtractSteelInfo uses LLM to extract structured steel information from raw text.
// It takes the AI adapter and raw text, and returns a structured ExtractionResult.
// When no standard fields are found, it returns an ExtractionResult with Confidence=0.
func ExtractSteelInfo(ctx context.Context, adapter *ai.LLMAdapter, rawText string) (*ExtractionResult, error) {
	if adapter == nil {
		return nil, fmt.Errorf("AI 适配器未初始化")
	}

	trimmed := strings.TrimSpace(rawText)
	if trimmed == "" {
		return &ExtractionResult{Confidence: 0}, nil
	}

	// Truncate very long text to avoid exceeding token limits.
	// 8000 characters is a safe upper bound (~2000 tokens for Chinese text).
	const maxChars = 8000
	if len([]rune(trimmed)) > maxChars {
		runes := []rune(trimmed)
		trimmed = string(runes[:maxChars])
	}

	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: steelExtractionSystemPrompt,
		},
		{
			Role:    openai.ChatMessageRoleUser,
			Content: trimmed,
		},
	}

	resp, err := adapter.Chat(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("AI 提取失败: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("AI 未返回有效响应")
	}

	content := resp.Choices[0].Message.Content
	jsonStr := extractJSONFromResponse(content)

	var result ExtractionResult
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		// If JSON parsing fails, return empty result with zero confidence
		return &ExtractionResult{Confidence: 0}, nil
	}

	// Normalize: if confidence is not set by LLM, estimate it
	if result.Confidence == 0 && result.Category != "" {
		result.Confidence = 0.5
	}

	// If no meaningful fields were extracted, set confidence to 0
	if result.Category == "" && result.Spec == "" && result.Quantity == 0 {
		result.Confidence = 0
	}

	return &result, nil
}
