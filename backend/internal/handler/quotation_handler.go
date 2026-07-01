package handler

import (
	"context"
	"fmt"
	"io"
	"strconv"

	"steel-agent-backend/internal/config"
	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/ai"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/fileparser"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/minio/minio-go/v7"
)

type quotationService interface {
	CalculateQuotation(ctx context.Context, category, spec string, quantity float64) (*service.QuotationBreakdown, error)
	CreateQuotation(ctx context.Context, q *model.Quotation) error
	GetQuotationList(ctx context.Context, userID uint, limit, offset int) ([]model.Quotation, error)
	GetQuotationDetail(ctx context.Context, id uint) (*model.Quotation, error)
	UpdateQuotation(ctx context.Context, q *model.Quotation) error
	DeleteQuotation(ctx context.Context, id uint) error
	ExportQuotationPDF(ctx context.Context, id uint) ([]byte, error)
}

// QuotationHandler handles quotation-related HTTP requests.
type QuotationHandler struct {
	quotationService quotationService
	fileRepo         *repository.FileRepository
	llmAdapter       *ai.LLMAdapter
}

// NewQuotationHandler creates a new QuotationHandler with the given dependencies.
func NewQuotationHandler(
	quotationService *service.QuotationService,
	fileRepo *repository.FileRepository,
	llmAdapter *ai.LLMAdapter,
) *QuotationHandler {
	return &QuotationHandler{
		quotationService: quotationService,
		fileRepo:         fileRepo,
		llmAdapter:       llmAdapter,
	}
}

// CalculateQuotation computes a quotation breakdown for the given material and quantity.
func (h *QuotationHandler) CalculateQuotation(c *gin.Context) {
	var req struct {
		Category string  `json:"category" binding:"required"`
		Spec     string  `json:"spec" binding:"required"`
		Quantity float64 `json:"quantity" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	result, err := h.quotationService.CalculateQuotation(c.Request.Context(), req.Category, req.Spec, req.Quantity)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, gin.H{
		"material_cost": result.MaterialCost,
		"process_cost":  result.ProcessCost,
		"freight_cost":  result.FreightCost,
		"tax_cost":      result.TaxCost,
		"total_price":   result.TotalPrice,
		"unit_price":    result.UnitPrice,
	})
}

// CreateQuotation creates a new quotation record with computed costs.
func (h *QuotationHandler) CreateQuotation(c *gin.Context) {
	var req struct {
		Title            string  `json:"title"`
		CustomerName     string  `json:"customer_name"`
		Category         string  `json:"category" binding:"required"`
		Spec             string  `json:"spec" binding:"required"`
		Quantity         float64 `json:"quantity" binding:"required"`
		Unit             string  `json:"unit"`
		DeliveryLocation string  `json:"delivery_location"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	userIDVal, _ := c.Get("user_id")
	quotation := model.Quotation{
		UserID:           userIDVal.(uint),
		Title:            req.Title,
		CustomerName:     req.CustomerName,
		Category:         req.Category,
		Spec:             req.Spec,
		Quantity:         req.Quantity,
		Unit:             req.Unit,
		DeliveryLocation: req.DeliveryLocation,
	}

	breakdown, err := h.quotationService.CalculateQuotation(c.Request.Context(), quotation.Category, quotation.Spec, quotation.Quantity)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	quotation.MaterialCost = breakdown.MaterialCost
	quotation.ProcessCost = breakdown.ProcessCost
	quotation.FreightCost = breakdown.FreightCost
	quotation.TaxCost = breakdown.TaxCost
	quotation.TotalPrice = breakdown.TotalPrice
	quotation.Status = "draft"

	if err := h.quotationService.CreateQuotation(c.Request.Context(), &quotation); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, quotation)
}

// GetQuotationList returns the authenticated user's quotation history.
func (h *QuotationHandler) GetQuotationList(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	quotations, err := h.quotationService.GetQuotationList(c.Request.Context(), userID, limit, offset)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, quotations)
}

// GetQuotationDetail returns detailed information for a specific quotation.
func (h *QuotationHandler) GetQuotationDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	quotation, err := h.quotationService.GetQuotationDetail(c.Request.Context(), uint(id))
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, quotation)
}

// UpdateQuotation updates an existing quotation with the given fields.
func (h *QuotationHandler) UpdateQuotation(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	var req struct {
		Title            string  `json:"title"`
		CustomerName     string  `json:"customer_name"`
		DeliveryLocation string  `json:"delivery_location"`
		Status           string  `json:"status"`
		Quantity         float64 `json:"quantity"`
		Category         string  `json:"category"`
		Spec             string  `json:"spec"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	quotation, err := h.quotationService.GetQuotationDetail(c.Request.Context(), uint(id))
	if err != nil {
		response.Error(c, errors.CodeNotFound, "报价单不存在")
		return
	}

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)
	if quotation.UserID != userID {
		response.Error(c, errors.CodeForbidden, "无权修改此报价单")
		return
	}

	if req.CustomerName != "" {
		quotation.CustomerName = req.CustomerName
	}
	if req.Title != "" {
		quotation.Title = req.Title
	}
	if req.DeliveryLocation != "" {
		quotation.DeliveryLocation = req.DeliveryLocation
	}
	if req.Status != "" {
		quotation.Status = req.Status
	}
	if req.Quantity > 0 {
		quotation.Quantity = req.Quantity
	}

	if req.Category != "" || req.Spec != "" || req.Quantity > 0 {
		if req.Category != "" {
			quotation.Category = req.Category
		}
		if req.Spec != "" {
			quotation.Spec = req.Spec
		}
		breakdown, err := h.quotationService.CalculateQuotation(c.Request.Context(), quotation.Category, quotation.Spec, quotation.Quantity)
		if err != nil {
			response.Error(c, errors.CodeInternalError, err.Error())
			return
		}
		quotation.MaterialCost = breakdown.MaterialCost
		quotation.ProcessCost = breakdown.ProcessCost
		quotation.FreightCost = breakdown.FreightCost
		quotation.TaxCost = breakdown.TaxCost
		quotation.TotalPrice = breakdown.TotalPrice
	}

	if err := h.quotationService.UpdateQuotation(c.Request.Context(), quotation); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, quotation)
}

// DeleteQuotation deletes a quotation by its ID.
func (h *QuotationHandler) DeleteQuotation(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	if err := h.quotationService.DeleteQuotation(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

// ExportPDF exports a quotation as a downloadable PDF file.
func (h *QuotationHandler) ExportPDF(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	pdfBytes, err := h.quotationService.ExportQuotationPDF(c.Request.Context(), uint(id))
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=quotation_%d.pdf", id))
	c.Writer.Write(pdfBytes)
}

// FromFile handles quotation generation from an uploaded file (PDF/DOCX).
// The flow: look up file record -> download from MinIO -> extract text -> AI extract steel info -> calculate quotation -> save.
func (h *QuotationHandler) FromFile(c *gin.Context) {
	// 1. Parse request body
	var req struct {
		FileID uint `json:"file_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：请提供 file_id")
		return
	}

	// 2. Look up the file record
	fileRecord, err := h.fileRepo.FindByID(c.Request.Context(), req.FileID)
	if err != nil {
		response.Error(c, errors.CodeNotFound, "文件不存在")
		return
	}

	// 3. Download file bytes from MinIO
	minioClient := config.MinioClient
	if minioClient == nil {
		response.Error(c, errors.CodeInternalError, "文件存储服务未就绪")
		return
	}

	obj, err := minioClient.GetObject(
		c.Request.Context(),
		config.AppConfig.MinioBucket,
		fileRecord.MinioPath,
		minio.GetObjectOptions{},
	)
	if err != nil {
		response.Error(c, errors.CodeInternalError, "文件下载失败")
		return
	}
	defer obj.Close()

	fileData, err := io.ReadAll(obj)
	if err != nil {
		response.Error(c, errors.CodeInternalError, "文件读取失败")
		return
	}

	// 4. Extract text from file
	var rawText string
	switch fileRecord.FileType {
	case "pdf":
		rawText, err = fileparser.ExtractPDFText(fileData)
	case "docx":
		rawText, err = fileparser.ExtractDocxText(fileData)
	default:
		response.Error(c, errors.CodeParamError, "不支持的文件类型，仅支持 PDF 和 DOCX")
		return
	}
	if err != nil {
		response.Error(c, errors.CodeInternalError, fmt.Sprintf("文件解析失败: %s", err.Error()))
		return
	}

	// 5. Extract steel information using LLM
	extraction, err := fileparser.ExtractSteelInfo(c.Request.Context(), h.llmAdapter, rawText)
	if err != nil {
		response.Error(c, errors.CodeInternalError, fmt.Sprintf("AI 信息提取失败: %s", err.Error()))
		return
	}

	if extraction.Confidence == 0 || extraction.Category == "" {
		response.Error(c, errors.CodeParamError, "未能从文件中识别出钢材相关信息，请确认文件内容")
		return
	}

	// 6. Default quantity if not extracted
	if extraction.Quantity == 0 {
		extraction.Quantity = 1
	}
	if extraction.Unit == "" {
		extraction.Unit = "吨"
	}

	// 7. Calculate quotation breakdown
	breakdown, err := h.quotationService.CalculateQuotation(
		c.Request.Context(),
		extraction.Category,
		extraction.Spec,
		extraction.Quantity,
	)
	if err != nil {
		response.Error(c, errors.CodeInternalError, fmt.Sprintf("报价计算失败: %s", err.Error()))
		return
	}

	// 8. Save quotation record
	userIDVal, _ := c.Get("user_id")
	quotation := model.Quotation{
		UserID:       userIDVal.(uint),
		Title:        fmt.Sprintf("文件报价 - %s", fileRecord.Filename),
		Category:     extraction.Category,
		Spec:         extraction.Spec,
		Quantity:     extraction.Quantity,
		Unit:         extraction.Unit,
		MaterialCost: breakdown.MaterialCost,
		ProcessCost:  breakdown.ProcessCost,
		FreightCost:  breakdown.FreightCost,
		TaxCost:      breakdown.TaxCost,
		TotalPrice:   breakdown.TotalPrice,
		Status:       "draft",
	}

	if err := h.quotationService.CreateQuotation(c.Request.Context(), &quotation); err != nil {
		response.Error(c, errors.CodeInternalError, fmt.Sprintf("报价单保存失败: %s", err.Error()))
		return
	}

	// 9. Return combined result
	response.Success(c, gin.H{
		"quotation":  quotation,
		"extraction": extraction,
		"breakdown":  breakdown,
	})
}
