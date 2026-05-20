package handler

import (
	"context"
	"strconv"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type knowledgeService interface {
	SearchKnowledge(ctx context.Context, keyword string, limit, offset int) ([]model.Knowledge, error)
	GetStandardList(ctx context.Context, limit, offset int) ([]model.Knowledge, error)
	GetTermList(ctx context.Context, limit, offset int) ([]model.Knowledge, error)
	GetStandardDetail(ctx context.Context, id uint) (*model.Knowledge, error)
	CompareGrades(ctx context.Context, grade1, grade2 string) ([]model.Knowledge, error)
	GetTermDetail(ctx context.Context, id uint) (*model.Knowledge, error)
	ConvertUnit(ctx context.Context, value float64, from, to string) (float64, error)
	CalculateWeight(ctx context.Context, category, spec string, quantity float64) (float64, error)
}

// KnowledgeHandler handles knowledge base-related HTTP requests.
type KnowledgeHandler struct {
	knowledgeService knowledgeService
}

// NewKnowledgeHandler creates a new KnowledgeHandler with the given knowledge service.
func NewKnowledgeHandler(knowledgeService *service.KnowledgeService) *KnowledgeHandler {
	return &KnowledgeHandler{knowledgeService: knowledgeService}
}

// SearchKnowledge searches the knowledge base for the given keyword.
func (h *KnowledgeHandler) SearchKnowledge(c *gin.Context) {
	keyword := c.Query("keyword")
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	results, err := h.knowledgeService.SearchKnowledge(c.Request.Context(), keyword, limit, offset)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, results)
}

// GetStandardList returns a list of knowledge entries of type "standard".
func (h *KnowledgeHandler) GetStandardList(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	results, err := h.knowledgeService.GetStandardList(c.Request.Context(), limit, offset)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, results)
}

// GetTermList returns a list of knowledge entries of type "term".
func (h *KnowledgeHandler) GetTermList(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	results, err := h.knowledgeService.GetTermList(c.Request.Context(), limit, offset)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, results)
}

// GetStandardDetail returns detailed information for a specific standard.
func (h *KnowledgeHandler) GetStandardDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	result, err := h.knowledgeService.GetStandardDetail(c.Request.Context(), uint(id))
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, result)
}

// CompareGrades compares two steel grades and returns their knowledge entries.
func (h *KnowledgeHandler) CompareGrades(c *gin.Context) {
	grade1 := c.Query("grade1")
	grade2 := c.Query("grade2")

	results, err := h.knowledgeService.CompareGrades(c.Request.Context(), grade1, grade2)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, results)
}

// GetTermDetail returns detailed information for a specific terminology term.
func (h *KnowledgeHandler) GetTermDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	result, err := h.knowledgeService.GetTermDetail(c.Request.Context(), uint(id))
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, result)
}

// ConvertUnit converts a value from one unit to another.
func (h *KnowledgeHandler) ConvertUnit(c *gin.Context) {
	var req struct {
		Value float64 `json:"value" binding:"required"`
		From  string  `json:"from" binding:"required"`
		To    string  `json:"to" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	result, err := h.knowledgeService.ConvertUnit(c.Request.Context(), req.Value, req.From, req.To)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, gin.H{"result": result})
}

// CalculateWeight calculates the weight of steel based on category, spec, and quantity.
func (h *KnowledgeHandler) CalculateWeight(c *gin.Context) {
	var req struct {
		Category string  `json:"category" binding:"required"`
		Spec     string  `json:"spec" binding:"required"`
		Quantity float64 `json:"quantity" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	result, err := h.knowledgeService.CalculateWeight(c.Request.Context(), req.Category, req.Spec, req.Quantity)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, gin.H{"weight": result})
}
