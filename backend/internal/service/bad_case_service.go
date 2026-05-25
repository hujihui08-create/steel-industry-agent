package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"github.com/xuri/excelize/v2"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

type BadCaseService struct {
	badCaseRepo *repository.BadCaseRepository
	chatService *ChatService
	verifyMutex sync.Mutex
	verifying   map[uint]bool
}

func NewBadCaseService(badCaseRepo *repository.BadCaseRepository, chatSvc *ChatService) *BadCaseService {
	return &BadCaseService{
		badCaseRepo: badCaseRepo,
		chatService: chatSvc,
		verifying:   make(map[uint]bool),
	}
}

// SetChatService sets the chat service reference, used to resolve
// circular dependency between ChatService and BadCaseService at startup.
func (s *BadCaseService) SetChatService(chatSvc *ChatService) {
	s.chatService = chatSvc
}

type BadCaseFilter struct {
	Page      int    `json:"page"`
	PageSize  int    `json:"page_size"`
	ErrorType string `json:"error_type"`
	Status    string `json:"status"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	Keyword   string `json:"keyword"`
}

func (s *BadCaseService) List(ctx context.Context, filter BadCaseFilter) (map[string]interface{}, error) {
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}

	items, total, err := s.badCaseRepo.FindPage(ctx, filter.Page, filter.PageSize, filter.ErrorType, filter.Status, filter.StartDate, filter.EndDate, filter.Keyword)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"items":     items,
		"total":     total,
		"page":      filter.Page,
		"page_size": filter.PageSize,
	}, nil
}

func (s *BadCaseService) GetByID(ctx context.Context, id uint) (*model.BadCase, error) {
	return s.badCaseRepo.FindByID(ctx, id)
}

func (s *BadCaseService) Create(ctx context.Context, badCase *model.BadCase) error {
	now := time.Now()
	prefix := fmt.Sprintf("BC-%s-", now.Format("20060102"))

	seq := 1
	existingCaseNo, err := s.badCaseRepo.FindMaxCaseNoByPrefix(ctx, prefix)
	if err == nil && existingCaseNo != "" {
		var existingSeq int
		_, scanErr := fmt.Sscanf(existingCaseNo, "BC-"+now.Format("20060102")+"-%d", &existingSeq)
		if scanErr == nil {
			seq = existingSeq + 1
		}
	}

	badCase.CaseNo = fmt.Sprintf("%s%03d", prefix, seq)
	return s.badCaseRepo.Create(ctx, badCase)
}

func (s *BadCaseService) Update(ctx context.Context, badCase *model.BadCase) error {
	return s.badCaseRepo.Update(ctx, badCase)
}

func (s *BadCaseService) UpdateStatus(ctx context.Context, id uint, status string, fixSolution string) error {
	bc, err := s.badCaseRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	validTransitions := map[string][]string{
		"pending":  {"fixing"},
		"fixing":   {"fixed"},
		"fixed":    {"verified"},
		"verified": {},
	}

	allowed, ok := validTransitions[bc.Status]
	if !ok {
		return fmt.Errorf("无效的当前状态: %s", bc.Status)
	}

	isValid := false
	for _, s := range allowed {
		if s == status {
			isValid = true
			break
		}
	}
	if !isValid {
		return fmt.Errorf("不允许从 %s 转换到 %s", bc.Status, status)
	}

	if status == "fixed" && fixSolution == "" {
		return fmt.Errorf("修复方案不能为空")
	}

	if fixSolution != "" {
		bc.FixSolution = fixSolution
		if updateErr := s.badCaseRepo.Update(ctx, bc); updateErr != nil {
			return updateErr
		}
	}

	return s.badCaseRepo.UpdateStatus(ctx, id, status)
}

func (s *BadCaseService) Stats(ctx context.Context) (map[string]interface{}, error) {
	statusCounts, err := s.badCaseRepo.GetStatusCounts(ctx)
	if err != nil {
		return nil, err
	}

	dailyTrend, err := s.badCaseRepo.GetDailyTrend(ctx)
	if err != nil {
		return nil, err
	}

	avgFixDays, err := s.badCaseRepo.GetAvgFixDays(ctx)
	if err != nil {
		return nil, err
	}

	var total int64
	for _, c := range statusCounts {
		total += c
	}

	fixRate := float64(0)
	if total > 0 {
		fixedAndVerified := statusCounts["fixed"] + statusCounts["verified"]
		fixRate = float64(fixedAndVerified) / float64(total)
	}

	return map[string]interface{}{
		"status_counts": statusCounts,
		"daily_trend":   dailyTrend,
		"fix_rate":      fixRate,
		"avg_fix_days":  avgFixDays,
	}, nil
}

func (s *BadCaseService) Delete(ctx context.Context, id uint) error {
	return s.badCaseRepo.Delete(ctx, id)
}

type ImportError struct {
	Row    int    `json:"row"`
	Reason string `json:"reason"`
}

type badCaseImportRow struct {
	UserQuery       string `json:"user_query"`
	AIResponse      string `json:"ai_response"`
	CorrectResponse string `json:"correct_response"`
	ErrorType       string `json:"error_type"`
}

func (s *BadCaseService) ImportBadCases(ctx context.Context, reader io.Reader, filename string) (map[string]interface{}, error) {
	var importRows []badCaseImportRow
	var importErrors []ImportError

	if len(filename) >= 5 && filename[len(filename)-5:] == ".json" {
		data, err := io.ReadAll(reader)
		if err != nil {
			return nil, err
		}
		if err := json.Unmarshal(data, &importRows); err != nil {
			return nil, fmt.Errorf("JSON解析失败: %v", err)
		}
	} else if len(filename) >= 4 && filename[len(filename)-4:] == ".csv" {
		csvReader := csv.NewReader(reader)
		csvReader.LazyQuotes = true
		records, err := csvReader.ReadAll()
		if err != nil {
			return nil, fmt.Errorf("CSV解析失败: %v", err)
		}
		if len(records) < 2 {
			return nil, fmt.Errorf("CSV文件至少需要包含表头和一行数据")
		}

		headers := records[0]
		colMap := make(map[string]int)
		for i, h := range headers {
			colMap[h] = i
		}

		for rowIdx, row := range records[1:] {
			getCol := func(name string) string {
				if idx, ok := colMap[name]; ok && idx < len(row) {
					return row[idx]
				}
				return ""
			}

			ur := badCaseImportRow{
				UserQuery:       getCol("user_query"),
				AIResponse:      getCol("ai_response"),
				CorrectResponse: getCol("correct_response"),
				ErrorType:       getCol("error_type"),
			}

			if ur.UserQuery == "" || ur.AIResponse == "" {
				importErrors = append(importErrors, ImportError{Row: rowIdx + 2, Reason: "user_query和ai_response不能为空"})
				continue
			}
			importRows = append(importRows, ur)
		}
	} else if len(filename) >= 5 && filename[len(filename)-5:] == ".xlsx" {
		f, err := excelize.OpenReader(reader)
		if err != nil {
			return nil, fmt.Errorf("Excel 解析失败: %v", err)
		}
		defer f.Close()

		sheetName := f.GetSheetName(0)
		rows, err := f.GetRows(sheetName)
		if err != nil {
			return nil, fmt.Errorf("读取 Excel 工作表失败: %v", err)
		}
		if len(rows) < 2 {
			return nil, fmt.Errorf("Excel 文件至少需要包含表头和一行数据")
		}

		// Build column index map from header row (case-insensitive).
		colMap := make(map[string]int)
		for i, h := range rows[0] {
			colMap[strings.ToLower(strings.TrimSpace(h))] = i
		}

		for rowIdx, row := range rows[1:] {
			getCol := func(name string) string {
				if idx, ok := colMap[name]; ok && idx < len(row) {
					return strings.TrimSpace(row[idx])
				}
				return ""
			}

			ur := badCaseImportRow{
				UserQuery:       getCol("user_query"),
				AIResponse:      getCol("ai_response"),
				CorrectResponse: getCol("correct_response"),
				ErrorType:       getCol("error_type"),
			}

			if ur.UserQuery == "" || ur.AIResponse == "" {
				importErrors = append(importErrors, ImportError{Row: rowIdx + 2, Reason: "user_query和ai_response不能为空"})
				continue
			}
			importRows = append(importRows, ur)
		}
	} else {
		return nil, fmt.Errorf("不支持的文件格式: %s，仅支持 .json，.csv, .xlsx", filename)
	}

	if len(importRows) == 0 {
		return map[string]interface{}{
			"total":   0,
			"success": 0,
			"failed":  len(importErrors),
			"errors":  importErrors,
		}, nil
	}

	now := time.Now()
	prefix := fmt.Sprintf("BC-%s-", now.Format("20060102"))
	seq := 1

	if existingCaseNo, findErr := s.badCaseRepo.FindMaxCaseNoByPrefix(ctx, prefix); findErr == nil && existingCaseNo != "" {
		var existingSeq int
		if _, scanErr := fmt.Sscanf(existingCaseNo, "BC-"+now.Format("20060102")+"-%d", &existingSeq); scanErr == nil {
			seq = existingSeq + 1
		}
	}

	var cases []model.BadCase
	for _, row := range importRows {
		bc := model.BadCase{
			UserQuery:  row.UserQuery,
			AIResponse: row.AIResponse,
			ErrorType:  row.ErrorType,
			CaseNo:     fmt.Sprintf("%s%03d", prefix, seq),
		}
		if row.CorrectResponse != "" {
			bc.CorrectResponse = &row.CorrectResponse
		}
		cases = append(cases, bc)
		seq++
	}

	if err := s.badCaseRepo.BatchCreate(ctx, cases); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total":   len(importRows) + len(importErrors),
		"success": len(cases),
		"failed":  len(importErrors),
		"errors":  importErrors,
	}, nil
}

func (s *BadCaseService) Export(ctx context.Context, filter BadCaseFilter) ([]byte, error) {
	items, _, err := s.badCaseRepo.FindPage(ctx, 1, 10000, filter.ErrorType, filter.Status, filter.StartDate, filter.EndDate, filter.Keyword)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	buf.Write([]byte{0xEF, 0xBB, 0xBF})

	writer := csv.NewWriter(&buf)

	writer.Write([]string{"case_no", "user_query", "ai_response", "correct_response", "error_type", "status", "fix_solution", "created_at", "fixed_at", "verified_at"})

	for _, bc := range items {
		corr := ""
		if bc.CorrectResponse != nil {
			corr = *bc.CorrectResponse
		}
		fixedAt := ""
		if bc.FixedAt != nil {
			fixedAt = bc.FixedAt.Format("2006-01-02 15:04:05")
		}
		verifiedAt := ""
		if bc.VerifiedAt != nil {
			verifiedAt = bc.VerifiedAt.Format("2006-01-02 15:04:05")
		}

		writer.Write([]string{
			bc.CaseNo,
			bc.UserQuery,
			bc.AIResponse,
			corr,
			bc.ErrorType,
			bc.Status,
			bc.FixSolution,
			bc.CreatedAt.Format("2006-01-02 15:04:05"),
			fixedAt,
			verifiedAt,
		})
	}

	writer.Flush()
	if wErr := writer.Error(); wErr != nil {
		return nil, wErr
	}
	return buf.Bytes(), nil
}

func (s *BadCaseService) Verify(ctx context.Context, id uint) (map[string]interface{}, error) {
	bc, err := s.badCaseRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Concurrency control: prevent simultaneous verification of the same bad case.
	s.verifyMutex.Lock()
	if s.verifying[id] {
		s.verifyMutex.Unlock()
		return nil, fmt.Errorf("该 Bad Case 正在验证中，请稍后再试")
	}
	s.verifying[id] = true
	s.verifyMutex.Unlock()

	defer func() {
		s.verifyMutex.Lock()
		delete(s.verifying, id)
		s.verifyMutex.Unlock()
	}()

	// Call AI Chat service with 30s timeout.
	aiCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	ch, err := s.chatService.ChatCompletions(aiCtx, 0, 0, bc.UserQuery)
	if err != nil {
		return nil, fmt.Errorf("AI 对话调用失败: %v", err)
	}

	// Collect all chunks from the streaming channel into a single string.
	var currentReply string
	for chunk := range ch {
		currentReply += chunk
	}

	now := time.Now()

	// Smart comparison: compute word-level similarity between old and new replies.
	similarity, verdict, verdictReason := compareReplies(bc.AIResponse, currentReply)

	return map[string]interface{}{
		"id":             bc.ID,
		"case_no":        bc.CaseNo,
		"user_query":     bc.UserQuery,
		"original_reply": bc.AIResponse,
		"current_reply":  currentReply,
		"verified_at":    now.Format("2006-01-02 15:04:05"),
		"similarity":     similarity,
		"verdict":        verdict,
		"verdict_reason": verdictReason,
	}, nil
}

// compareReplies computes word-level similarity between two replies and returns
// a verdict about whether the AI response has likely improved.
// Returns: similarity (0–100 percentage), verdict ("fixed"|"likely_fixed"|"still_broken"), reason string
func compareReplies(oldReply, newReply string) (int, string, string) {
	if oldReply == "" || newReply == "" {
		return 0, "still_broken", "无法比较：回复为空"
	}

	oldWords := tokenize(oldReply)
	newWords := tokenize(newReply)

	if len(oldWords) == 0 && len(newWords) == 0 {
		return 100, "still_broken", "两份回复均无有效文本"
	}
	if len(oldWords) == 0 {
		return 0, "fixed", "原始回复无有效文本"
	}
	if len(newWords) == 0 {
		return 0, "still_broken", "当前回复无有效文本"
	}

	// Jaccard-like similarity: intersection / union of word sets.
	oldSet := make(map[string]struct{}, len(oldWords))
	for _, w := range oldWords {
		oldSet[w] = struct{}{}
	}
	newSet := make(map[string]struct{}, len(newWords))
	for _, w := range newWords {
		newSet[w] = struct{}{}
	}

	intersection := 0
	for w := range oldSet {
		if _, ok := newSet[w]; ok {
			intersection++
		}
	}
	union := len(oldSet) + len(newSet) - intersection
	if union == 0 {
		return 100, "still_broken", "无法计算相似度"
	}

	similarity := int(float64(intersection) / float64(union) * 100)

	// Substring check: if the old reply is mostly contained within the new reply,
	// the AI likely still produced the same problematic content.
	oldLen := len(oldReply)
	newLen := len(newReply)
	containsOld := false
	if oldLen > 20 && oldLen <= newLen {
		containsOld = len(newReply) >= len(oldReply) && findSubstring(newReply, oldReply[:min(oldLen, 200)])
	}

	var verdict string
	var reason string

	if containsOld {
		verdict = "still_broken"
		reason = "当前回复仍包含与原始错误回复相同的内容"
	} else if similarity >= 60 {
		verdict = "still_broken"
		reason = fmt.Sprintf("回复相似度 %d%%，AI 可能仍存在类似问题", similarity)
	} else if similarity >= 30 {
		verdict = "likely_fixed"
		reason = fmt.Sprintf("回复相似度 %d%%，AI 回复有明显改善，建议人工确认", similarity)
	} else {
		verdict = "fixed"
		reason = fmt.Sprintf("回复相似度 %d%%，AI 回复差异显著，问题已修复", similarity)
	}

	return similarity, verdict, reason
}

// tokenize splits a string into lowercase word tokens, filtering out very short tokens.
func tokenize(s string) []string {
	fields := strings.Fields(s)
	tokens := make([]string, 0, len(fields))
	for _, f := range fields {
		// Normalize: lowercase and trim punctuation.
		t := strings.ToLower(strings.Trim(f, "，。！？、；：“”‘’（）【】《》…—·,.;:!?\"'()[]{}<>"))
		if len(t) >= 2 {
			tokens = append(tokens, t)
		}
	}
	return tokens
}

// findSubstring checks if needle appears in haystack (simple substring match).
func findSubstring(haystack, needle string) bool {
	return len(needle) > 0 && strings.Contains(haystack, needle)
}
