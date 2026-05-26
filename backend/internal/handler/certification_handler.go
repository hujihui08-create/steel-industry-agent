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

type certificationService interface {
	SubmitCertification(ctx context.Context, userID uint, companyName, creditCode, contactName, contactPhone string) (*model.UserCertification, error)
	GetMyCertification(ctx context.Context, userID uint) (*model.UserCertification, error)
}

type CertificationHandler struct {
	certService certificationService
}

func NewCertificationHandler(certService *service.CertificationService) *CertificationHandler {
	return &CertificationHandler{certService: certService}
}

func (h *CertificationHandler) SubmitCertification(c *gin.Context) {
	var req struct {
		CompanyName  string `json:"company_name" binding:"required"`
		CreditCode   string `json:"credit_code" binding:"required"`
		ContactName  string `json:"contact_name" binding:"required"`
		ContactPhone string `json:"contact_phone" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：请填写完整信息")
		return
	}

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	cert, err := h.certService.SubmitCertification(c.Request.Context(), userID, req.CompanyName, req.CreditCode, req.ContactName, req.ContactPhone)
	if err != nil {
		if err.Error() == "您已有认证申请正在处理中" {
			response.Error(c, errors.CodeConflict, err.Error())
			return
		}
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, cert)
}

func (h *CertificationHandler) GetMyCertification(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	cert, err := h.certService.GetMyCertification(c.Request.Context(), userID)
	if err != nil {
		response.Success(c, nil)
		return
	}

	response.Success(c, cert)
}

type adminCertService interface {
	ListCertifications(ctx context.Context, status string, limit, offset int) ([]model.UserCertification, int64, error)
	ApproveCertification(ctx context.Context, id uint, reviewedBy uint) error
	RejectCertification(ctx context.Context, id uint, reviewedBy uint, remark string) error
}

type AdminCertificationHandler struct {
	certService adminCertService
}

func NewAdminCertificationHandler(certService *service.CertificationService) *AdminCertificationHandler {
	return &AdminCertificationHandler{certService: certService}
}

func (h *AdminCertificationHandler) ListCertifications(c *gin.Context) {
	status := c.Query("status")
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	certs, total, err := h.certService.ListCertifications(c.Request.Context(), status, limit, offset)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, map[string]interface{}{
		"list":  certs,
		"total": total,
	})
}

func (h *AdminCertificationHandler) ApproveCertification(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	adminIDVal, _ := c.Get("user_id")
	adminID := adminIDVal.(uint)

	if err := h.certService.ApproveCertification(c.Request.Context(), uint(id), adminID); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

func (h *AdminCertificationHandler) RejectCertification(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	var req struct {
		Remark string `json:"remark" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：请填写驳回原因")
		return
	}

	adminIDVal, _ := c.Get("user_id")
	adminID := adminIDVal.(uint)

	if err := h.certService.RejectCertification(c.Request.Context(), uint(id), adminID, req.Remark); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}
