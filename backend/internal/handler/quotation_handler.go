package handler

import (
	"context"
	"fmt"
	"strconv"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
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
}

// NewQuotationHandler creates a new QuotationHandler with the given quotation service.
func NewQuotationHandler(quotationService *service.QuotationService) *QuotationHandler {
	return &QuotationHandler{quotationService: quotationService}
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
