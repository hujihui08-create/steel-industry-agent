package handler

import (
	"context"
	"io"
	"strconv"
	"strings"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/fileparser"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

// adminKnowledgeService defines the knowledge service methods used by AdminKnowledgeHandler.
type adminKnowledgeService interface {
	AdminListKnowledge(ctx context.Context, knowledgeType, status, category, keyword string, limit, offset int) ([]model.Knowledge, int64, error)
	AdminCreateKnowledge(ctx context.Context, k *model.Knowledge) error
	AdminUpdateKnowledge(ctx context.Context, id uint, k *model.Knowledge) error
	AdminDeleteKnowledge(ctx context.Context, id uint) error
	AdminGetKnowledgeDetail(ctx context.Context, id uint) (*model.Knowledge, error)
	AdminGetStats(ctx context.Context) (*model.KnowledgeStats, error)
	AdminTriggerVectorization(ctx context.Context, id uint) error
	AdminBatchImport(ctx context.Context, files []struct {
		FileName string `json:"file_name"`
		Content  string `json:"content"`
	}, autoVectorize bool) ([]uint, error)
	TestSearch(ctx context.Context, req *model.RAGSearchRequest) ([]model.RAGSearchResult, error)
	GetSearchHistory(ctx context.Context, limit, offset int) ([]model.RAGSearchHistory, int64, error)
	GetRAGConfig(ctx context.Context) *model.RAGConfig
	UpdateRAGConfig(ctx context.Context, cfg *model.RAGConfig) error
}

// AdminKnowledgeHandler handles admin knowledge base management HTTP requests.
type AdminKnowledgeHandler struct {
	knowledgeService adminKnowledgeService
}

// NewAdminKnowledgeHandler creates a new AdminKnowledgeHandler with the given knowledge service.
func NewAdminKnowledgeHandler(knowledgeService *service.KnowledgeService) *AdminKnowledgeHandler {
	return &AdminKnowledgeHandler{knowledgeService: knowledgeService}
}

// === Knowledge Management ===

// ListKnowledge returns a paginated list of knowledge items with optional filters.
func (h *AdminKnowledgeHandler) ListKnowledge(c *gin.Context) {
	knowledgeType := c.Query("type")
	status := c.Query("status")
	category := c.Query("category")
	keyword := c.Query("keyword")

	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")
	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	items, total, err := h.knowledgeService.AdminListKnowledge(
		c.Request.Context(), knowledgeType, status, category, keyword, limit, offset)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, gin.H{
		"list":  items,
		"total": total,
	})
}

// CreateKnowledge creates a new knowledge entry and optionally triggers vectorization.
func (h *AdminKnowledgeHandler) CreateKnowledge(c *gin.Context) {
	var req struct {
		Type       string `json:"type" binding:"required"`
		Title      string `json:"title" binding:"required"`
		Category   string `json:"category"`
		StandardNo string `json:"standard_no"`
		Content    string `json:"content"`
		Keywords   string `json:"keywords"`
		Vectorize  bool   `json:"vectorize"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	k := &model.Knowledge{
		Type:       req.Type,
		Title:      req.Title,
		Category:   req.Category,
		StandardNo: req.StandardNo,
		Content:    req.Content,
		Keywords:   req.Keywords,
	}

	if err := h.knowledgeService.AdminCreateKnowledge(c.Request.Context(), k); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	if req.Vectorize {
		_ = h.knowledgeService.AdminTriggerVectorization(c.Request.Context(), k.ID)
	}

	response.Success(c, k)
}

// UpdateKnowledge updates an existing knowledge entry by ID.
func (h *AdminKnowledgeHandler) UpdateKnowledge(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	var req struct {
		Type       string `json:"type"`
		Title      string `json:"title"`
		Category   string `json:"category"`
		StandardNo string `json:"standard_no"`
		Content    string `json:"content"`
		Keywords   string `json:"keywords"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	k := &model.Knowledge{
		Type:       req.Type,
		Title:      req.Title,
		Category:   req.Category,
		StandardNo: req.StandardNo,
		Content:    req.Content,
		Keywords:   req.Keywords,
	}

	if err := h.knowledgeService.AdminUpdateKnowledge(c.Request.Context(), uint(id), k); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

// DeleteKnowledge deletes a knowledge entry by ID.
func (h *AdminKnowledgeHandler) DeleteKnowledge(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	if err := h.knowledgeService.AdminDeleteKnowledge(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

// GetKnowledgeDetail returns the full detail of a knowledge entry by ID.
func (h *AdminKnowledgeHandler) GetKnowledgeDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	detail, err := h.knowledgeService.AdminGetKnowledgeDetail(c.Request.Context(), uint(id))
	if err != nil {
		response.Error(c, errors.CodeNotFound, "文档不存在")
		return
	}

	chunks := []model.KnowledgeChunk{}
	if detail.ChunkCount > 0 {
		for i := 0; i < detail.ChunkCount; i++ {
			chunks = append(chunks, model.KnowledgeChunk{
				ChunkIndex:   i + 1,
				ChunkContent: detail.Content,
				VectorID:     detail.VectorID,
			})
		}
	}

	response.Success(c, gin.H{
		"document": detail,
		"chunks":   chunks,
	})
}

// GetStats returns aggregated knowledge base statistics.
func (h *AdminKnowledgeHandler) GetStats(c *gin.Context) {
	stats, err := h.knowledgeService.AdminGetStats(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, stats)
}

// TriggerVectorization triggers embedding vectorization for a knowledge entry by ID.
func (h *AdminKnowledgeHandler) TriggerVectorization(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	if err := h.knowledgeService.AdminTriggerVectorization(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, gin.H{"message": "向量化任务已提交"})
}

// BatchImport imports multiple knowledge documents from uploaded files or JSON payload.
func (h *AdminKnowledgeHandler) BatchImport(c *gin.Context) {
	autoVectorize := c.Query("auto_vectorize") == "true" || c.PostForm("auto_vectorize") == "true"

	contentType := c.GetHeader("Content-Type")

	var files []struct {
		FileName string `json:"file_name"`
		Content  string `json:"content"`
	}

	// Multipart file upload (PDF/Word/TXT/MD)
	if strings.Contains(contentType, "multipart/form-data") {
		form, err := c.MultipartForm()
		if err != nil {
			response.Error(c, errors.CodeParamError, "文件上传解析失败")
			return
		}

		uploadedFiles := form.File["files"]
		if len(uploadedFiles) == 0 {
			response.Error(c, errors.CodeParamError, "未选择文件")
			return
		}

		for _, fh := range uploadedFiles {
			f, err := fh.Open()
			if err != nil {
				response.Error(c, errors.CodeInternalError, "无法打开文件: "+fh.Filename)
				return
			}

			data, err := io.ReadAll(f)
			f.Close()
			if err != nil {
				response.Error(c, errors.CodeInternalError, "无法读取文件: "+fh.Filename)
				return
			}

			// Parse file content with the file parser
			text, err := fileparser.ParseFile(fh.Filename, data)
			if err != nil {
				// Fall back to raw text
				text = string(data)
			}

			if text == "" {
				continue
			}

			files = append(files, struct {
				FileName string `json:"file_name"`
				Content  string `json:"content"`
			}{
				FileName: fh.Filename,
				Content:  text,
			})
		}
	} else {
		// JSON text import (fallback for textarea paste)
		var req struct {
			Files         []struct {
				FileName string `json:"file_name"`
				Content  string `json:"content"`
			} `json:"files" binding:"required"`
			AutoVectorize bool `json:"auto_vectorize"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			response.Error(c, errors.CodeParamError, "参数错误")
			return
		}
		files = req.Files
		autoVectorize = req.AutoVectorize
	}

	if len(files) == 0 {
		response.Error(c, errors.CodeParamError, "未解析到有效文档")
		return
	}

	ids, err := h.knowledgeService.AdminBatchImport(c.Request.Context(), files, autoVectorize)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, gin.H{
		"imported_ids": ids,
		"count":        len(ids),
	})
}

// === RAG Vector Search Test ===

// TestSearch performs a RAG vector search test with the given parameters.
func (h *AdminKnowledgeHandler) TestSearch(c *gin.Context) {
	var req model.RAGSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	results, err := h.knowledgeService.TestSearch(c.Request.Context(), &req)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, results)
}

// GetSearchHistory returns a paginated list of RAG search history.
func (h *AdminKnowledgeHandler) GetSearchHistory(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")
	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	history, total, err := h.knowledgeService.GetSearchHistory(c.Request.Context(), limit, offset)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, gin.H{
		"list":  history,
		"total": total,
	})
}

// === RAG Config ===

// GetRAGConfig returns the current RAG configuration.
func (h *AdminKnowledgeHandler) GetRAGConfig(c *gin.Context) {
	cfg := h.knowledgeService.GetRAGConfig(c.Request.Context())
	response.Success(c, cfg)
}

// UpdateRAGConfig updates the RAG configuration settings.
func (h *AdminKnowledgeHandler) UpdateRAGConfig(c *gin.Context) {
	var cfg model.RAGConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if err := h.knowledgeService.UpdateRAGConfig(c.Request.Context(), &cfg); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, cfg)
}
