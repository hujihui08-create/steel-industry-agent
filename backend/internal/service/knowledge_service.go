package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
	"steel-agent-backend/pkg/ai"

	"gorm.io/gorm"
)

// ensureJSONB wraps a plain text string as a valid JSON value for JSONB storage.
func ensureJSONB(s string) string {
	if s == "" {
		return "{}"
	}
	if json.Valid([]byte(s)) {
		return s
	}
	b, _ := json.Marshal(s)
	return string(b)
}

type KnowledgeService struct {
	knowledgeRepo *repository.KnowledgeRepository
	aiAdapter     *ai.LLMAdapter
	db            *gorm.DB
	mu            sync.RWMutex
	ragConfig     *model.RAGConfig
}

func NewKnowledgeService(knowledgeRepo *repository.KnowledgeRepository, aiAdapter *ai.LLMAdapter, db *gorm.DB) *KnowledgeService {
	s := &KnowledgeService{
		knowledgeRepo: knowledgeRepo,
		aiAdapter:     aiAdapter,
		db:            db,
		ragConfig:     defaultRAGConfig(),
	}
	// Load config from database on startup
	if knowledgeRepo != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if dbCfg, err := knowledgeRepo.GetRAGConfig(ctx); err == nil && dbCfg != nil {
			s.ragConfig = dbCfg
			log.Println("RAG config loaded from database")
		}
	}
	return s
}

func defaultRAGConfig() *model.RAGConfig {
	return &model.RAGConfig{
		EmbeddingModel:      "text-embedding-3-small",
		EmbeddingAPIKey:     "",
		EmbeddingBaseURL:    "",
		ChunkMethod:         "paragraph",
		ChunkSize:           512,
		ChunkOverlap:        50,
		DefaultTopK:         5,
		DefaultThreshold:    0.7,
		SearchMode:          "hybrid",
		HybridWeight:        0.7,
		QueryRewriteEnabled: false,
		RerankEnabled:       false,
		CacheEnabled:        false,
		MaxRecall:           100,
	}
}

func (s *KnowledgeService) SearchKnowledge(ctx context.Context, keyword string, limit, offset int) ([]model.Knowledge, error) {
	return s.knowledgeRepo.Search(ctx, keyword)
}

func (s *KnowledgeService) GetStandardList(ctx context.Context, limit, offset int) ([]model.Knowledge, error) {
	return s.knowledgeRepo.FindByType(ctx, "standard")
}

func (s *KnowledgeService) GetTermList(ctx context.Context, limit, offset int) ([]model.Knowledge, error) {
	return s.knowledgeRepo.FindByType(ctx, "term")
}

func (s *KnowledgeService) GetStandardDetail(ctx context.Context, id uint) (*model.Knowledge, error) {
	return s.knowledgeRepo.FindByID(ctx, id)
}

func (s *KnowledgeService) CompareGrades(ctx context.Context, grade1, grade2 string) ([]model.Knowledge, error) {
	results1, err := s.knowledgeRepo.Search(ctx, grade1)
	if err != nil {
		return nil, err
	}
	results2, err := s.knowledgeRepo.Search(ctx, grade2)
	if err != nil {
		return nil, err
	}
	return append(results1, results2...), nil
}

func (s *KnowledgeService) GetTermDetail(ctx context.Context, id uint) (*model.Knowledge, error) {
	return s.knowledgeRepo.FindByID(ctx, id)
}

func (s *KnowledgeService) ConvertUnit(ctx context.Context, value float64, from, to string) (float64, error) {
	key := strings.ToLower(from + "_" + to)
	switch key {
	case "ton_kg":
		return value * 1000, nil
	case "kg_ton":
		return value / 1000, nil
	case "kg_lb":
		return value * 2.20462, nil
	case "lb_kg":
		return value / 2.20462, nil
	case "ton_lb":
		return value * 2204.62, nil
	case "lb_ton":
		return value / 2204.62, nil
	default:
		if strings.EqualFold(from, to) {
			return value, nil
		}
		return 0, fmt.Errorf("不支持的单位换算: %s -> %s", from, to)
	}
}

func (s *KnowledgeService) CalculateWeight(ctx context.Context, category, spec string, quantity float64) (float64, error) {
	categoryLower := strings.ToLower(category)

	if strings.Contains(categoryLower, "螺纹") || strings.Contains(categoryLower, "rebar") || strings.Contains(categoryLower, "钢筋") {
		diameter := extractDiameter(spec)
		if diameter > 0 {
			weightPerMeter := 0.00617 * diameter * diameter
			length := 12.0
			return weightPerMeter * length * quantity, nil
		}
	}

	if strings.Contains(categoryLower, "热卷") || strings.Contains(categoryLower, "热轧卷") || strings.Contains(categoryLower, "hrc") {
		thickness := extractNumber(spec, "mm")
		width := 1.5
		length := 10.0
		if thickness > 0 {
			return 7.85 * thickness * width * length * quantity, nil
		}
	}

	return 7.85 * 1 * quantity, nil
}

// === Admin Knowledge Management ===

func (s *KnowledgeService) AdminListKnowledge(ctx context.Context, knowledgeType, status, category, keyword string, limit, offset int) ([]model.Knowledge, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return s.knowledgeRepo.ListWithFilter(ctx, knowledgeType, status, category, keyword, limit, offset)
}

func (s *KnowledgeService) AdminCreateKnowledge(ctx context.Context, k *model.Knowledge) error {
	k.Status = model.KnowledgeStatusPending
	return s.knowledgeRepo.Create(ctx, k)
}

func (s *KnowledgeService) AdminUpdateKnowledge(ctx context.Context, id uint, k *model.Knowledge) error {
	existing, err := s.knowledgeRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	existing.Type = k.Type
	existing.Title = k.Title
	existing.Content = k.Content
	existing.Keywords = k.Keywords
	existing.StandardNo = k.StandardNo
	existing.Category = k.Category

	if existing.Status == model.KnowledgeStatusVectorized {
		existing.Status = model.KnowledgeStatusPending
	}

	return s.knowledgeRepo.Update(ctx, existing)
}

func (s *KnowledgeService) AdminDeleteKnowledge(ctx context.Context, id uint) error {
	return s.knowledgeRepo.Delete(ctx, id)
}

func (s *KnowledgeService) AdminGetKnowledgeDetail(ctx context.Context, id uint) (*model.Knowledge, error) {
	return s.knowledgeRepo.FindByID(ctx, id)
}

func (s *KnowledgeService) AdminGetStats(ctx context.Context) (*model.KnowledgeStats, error) {
	stats, err := s.knowledgeRepo.GetStats(ctx)
	if err != nil {
		return nil, err
	}

	// Derive vector dimension from the configured embedding model
	s.mu.RLock()
	modelName := s.ragConfig.EmbeddingModel
	s.mu.RUnlock()

	switch modelName {
	case "text-embedding-3-large":
		stats.VectorDimension = 3072
	case "text-embedding-ada-002":
		stats.VectorDimension = 1536
	default: // text-embedding-3-small or unknown
		stats.VectorDimension = 1536
	}
	return stats, nil
}

func (s *KnowledgeService) AdminTriggerVectorization(ctx context.Context, id uint) error {
	k, err := s.knowledgeRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	_ = s.knowledgeRepo.UpdateStatus(ctx, id, model.KnowledgeStatusPending)

	go func() {
		bgCtx := context.Background()
		s.mu.RLock()
		modelName := s.ragConfig.EmbeddingModel
		s.mu.RUnlock()

		// Chunk the content if it's large
		chunks := chunkContent(k.Content, s.ragConfig.ChunkSize, s.ragConfig.ChunkOverlap)
		if len(chunks) == 0 {
			chunks = []string{k.Content}
		}

		embeddings, err := s.aiAdapter.CreateEmbeddings(bgCtx, modelName, chunks)
		if err != nil {
			_ = s.knowledgeRepo.UpdateStatus(bgCtx, id, model.KnowledgeStatusFailed)
			log.Printf("Embedding failed for knowledge %d: %v", id, err)
			return
		}

		// Store the first embedding in the knowledge_base table via raw SQL
		if len(embeddings) > 0 && len(embeddings[0]) > 0 {
			vectorStr := float32ArrayToVector(embeddings[0])
			_ = s.db.WithContext(bgCtx).Exec(
				"UPDATE knowledge_base SET embedding = $1::vector, status = $2 WHERE id = $3",
				vectorStr, model.KnowledgeStatusVectorized, id,
			).Error
		}

		_ = s.knowledgeRepo.UpdateVectorInfo(bgCtx, id, fmt.Sprintf("vec_%d", id), len(chunks))
	}()

	return nil
}

// === RAG Vector Search Test ===

func (s *KnowledgeService) TestSearch(ctx context.Context, req *model.RAGSearchRequest) ([]model.RAGSearchResult, error) {
	if req.TopK <= 0 {
		req.TopK = s.ragConfig.DefaultTopK
	}
	if req.Threshold <= 0 {
		req.Threshold = s.ragConfig.DefaultThreshold
	}

	startTime := time.Now()

	// Generate embedding for the query
	s.mu.RLock()
	modelName := s.ragConfig.EmbeddingModel
	s.mu.RUnlock()

	embeddings, err := s.aiAdapter.CreateEmbeddings(ctx, modelName, []string{req.Query})
	if err != nil {
		return nil, fmt.Errorf("embedding generation failed: %w", err)
	}
	if len(embeddings) == 0 || len(embeddings[0]) == 0 {
		return nil, fmt.Errorf("empty embedding result")
	}

	queryVector := float32ArrayToVector(embeddings[0])

	// Execute pgvector cosine similarity search
	type searchRow struct {
		ID         uint    `gorm:"column:id"`
		Type       string  `gorm:"column:type"`
		Title      string  `gorm:"column:title"`
		Content    string  `gorm:"column:content"`
		Similarity float64 `gorm:"column:similarity"`
	}

	var rows []searchRow
	query := s.db.WithContext(ctx).Raw(
		`SELECT id, type, title, content,
		        1 - (embedding <=> $1::vector) AS similarity
		 FROM knowledge_base
		 WHERE embedding IS NOT NULL
		   AND status = 'vectorized'
		   AND 1 - (embedding <=> $1::vector) >= $2
		 ORDER BY similarity DESC
		 LIMIT $3`,
		queryVector, req.Threshold, req.TopK,
	).Scan(&rows)

	if query.Error != nil {
		return nil, fmt.Errorf("vector search failed: %w", query.Error)
	}

	var searchResults []model.RAGSearchResult
	for i, row := range rows {
		searchResults = append(searchResults, model.RAGSearchResult{
			Rank:          i + 1,
			Score:         row.Similarity,
			DocumentID:    row.ID,
			DocumentTitle: row.Title,
			ChunkIndex:    1,
			ChunkContent:  truncateContent(row.Content, 300),
		})
	}

	durationMs := time.Since(startTime).Milliseconds()

	history := &model.RAGSearchHistory{
		Query:       req.Query,
		TopK:        req.TopK,
		Threshold:   req.Threshold,
		ResultCount: len(searchResults),
		DurationMs:  durationMs,
	}
	_ = s.knowledgeRepo.SaveSearchHistory(ctx, history)

	return searchResults, nil
}

func (s *KnowledgeService) GetSearchHistory(ctx context.Context, limit, offset int) ([]model.RAGSearchHistory, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	return s.knowledgeRepo.GetSearchHistory(ctx, limit, offset)
}

// === RAG Config ===

func (s *KnowledgeService) GetRAGConfig(ctx context.Context) *model.RAGConfig {
	// Try to get from DB first, fall back to in-memory
	if dbCfg, err := s.knowledgeRepo.GetRAGConfig(ctx); err == nil && dbCfg != nil {
		s.mu.Lock()
		s.ragConfig = dbCfg
		s.mu.Unlock()
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	cfg := *s.ragConfig
	return &cfg
}

func (s *KnowledgeService) UpdateRAGConfig(ctx context.Context, cfg *model.RAGConfig) error {
	// Persist to database
	if err := s.knowledgeRepo.SaveRAGConfig(ctx, cfg); err != nil {
		return fmt.Errorf("failed to save RAG config: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ragConfig = cfg
	return nil
}

func (s *KnowledgeService) AdminBatchImport(ctx context.Context, files []struct {
	FileName string `json:"file_name"`
	Content  string `json:"content"`
}, autoVectorize bool) ([]uint, error) {
	var ids []uint
	for _, f := range files {
		k := &model.Knowledge{
			Title:    strings.TrimSuffix(f.FileName, ".md"),
			Content:  ensureJSONB(f.Content),
			Category: "imported",
		}
		if strings.Contains(strings.ToLower(f.Content), "标准") {
			k.Type = "standard"
		} else if strings.Contains(strings.ToLower(f.Content), "牌号") {
			k.Type = "grade"
		} else {
			k.Type = "term"
		}
		if err := s.knowledgeRepo.Create(ctx, k); err != nil {
			return ids, err
		}
		ids = append(ids, k.ID)
		if autoVectorize {
			_ = s.AdminTriggerVectorization(ctx, k.ID)
		}
	}
	return ids, nil
}

func extractDiameter(spec string) float64 {
	return extractNumber(spec, "mm")
}

func extractNumber(s, unit string) float64 {
	s = strings.ReplaceAll(s, " ", "")
	idx := strings.Index(s, unit)
	if idx < 0 {
		return 0
	}

	start := idx - 1
	for start >= 0 && (s[start] >= '0' && s[start] <= '9' || s[start] == '.') {
		start--
	}
	start++

	numStr := s[start:idx]
	if numStr == "" {
		return 0
	}

	val, err := strconv.ParseFloat(numStr, 64)
	if err != nil {
		return 0
	}
	return val
}

func truncateContent(content string, maxLen int) string {
	if len(content) <= maxLen {
		return content
	}
	return content[:maxLen] + "..."
}

// float32ArrayToVector converts a float32 slice to a pgvector-compatible string.
func float32ArrayToVector(v []float32) string {
	parts := make([]string, len(v))
	for i, f := range v {
		parts[i] = strconv.FormatFloat(float64(f), 'f', -1, 32)
	}
	return "[" + strings.Join(parts, ",") + "]"
}

// chunkContent splits text into chunks for embedding.
func chunkContent(content string, chunkSize, chunkOverlap int) []string {
	if len(content) <= chunkSize {
		return []string{content}
	}

	runes := []rune(content)
	var chunks []string
	step := chunkSize - chunkOverlap
	if step <= 0 {
		step = chunkSize
	}

	for i := 0; i < len(runes); i += step {
		end := i + chunkSize
		if end > len(runes) {
			end = len(runes)
		}
		chunks = append(chunks, string(runes[i:end]))
		if end >= len(runes) {
			break
		}
	}

	return chunks
}
