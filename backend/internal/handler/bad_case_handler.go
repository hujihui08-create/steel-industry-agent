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

type badCaseService interface {
	List(ctx context.Context) ([]model.BadCase, error)
	GetByID(ctx context.Context, id uint) (*model.BadCase, error)
	Create(ctx context.Context, badCase *model.BadCase) error
	Update(ctx context.Context, badCase *model.BadCase) error
	UpdateStatus(ctx context.Context, id uint, status string) error
	Stats(ctx context.Context) (map[string]interface{}, error)
}

type BadCaseHandler struct {
	badCaseService badCaseService
}

func NewBadCaseHandler(badCaseService *service.BadCaseService) *BadCaseHandler {
	return &BadCaseHandler{badCaseService: badCaseService}
}

func (h *BadCaseHandler) List(c *gin.Context) {
	cases, err := h.badCaseService.List(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, cases)
}

func (h *BadCaseHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	badCase, err := h.badCaseService.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Error(c, errors.CodeNotFound, "Bad Case不存在")
		return
	}

	response.Success(c, badCase)
}

func (h *BadCaseHandler) Create(c *gin.Context) {
	var req struct {
		UserQuery       string `json:"user_query" binding:"required"`
		AIResponse      string `json:"ai_response" binding:"required"`
		CorrectResponse string `json:"correct_response"`
		ErrorType       string `json:"error_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	badCase := &model.BadCase{
		UserQuery:  req.UserQuery,
		AIResponse: req.AIResponse,
		ErrorType:  req.ErrorType,
	}
	if req.CorrectResponse != "" {
		badCase.CorrectResponse = &req.CorrectResponse
	}

	if err := h.badCaseService.Create(c.Request.Context(), badCase); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, badCase)
}

func (h *BadCaseHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	var req struct {
		Status    string `json:"status"`
		FixPlan   string `json:"fix_plan"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	if req.Status != "" {
		if err := h.badCaseService.UpdateStatus(c.Request.Context(), uint(id), req.Status); err != nil {
			response.Error(c, errors.CodeInternalError, err.Error())
			return
		}
	}

	if req.FixPlan != "" {
		badCase, err := h.badCaseService.GetByID(c.Request.Context(), uint(id))
		if err != nil {
			response.Error(c, errors.CodeNotFound, "Bad Case不存在")
			return
		}
		badCase.FixSolution = req.FixPlan
		if err := h.badCaseService.Update(c.Request.Context(), badCase); err != nil {
			response.Error(c, errors.CodeInternalError, err.Error())
			return
		}
	}

	response.Success(c, nil)
}

func (h *BadCaseHandler) Stats(c *gin.Context) {
	stats, err := h.badCaseService.Stats(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, stats)
}

func (h *BadCaseHandler) Export(c *gin.Context) {
	cases, err := h.badCaseService.List(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=bad_cases.csv")
	c.String(200, "ID,用户问题,AI回复,正确回复,错误类型,状态,修复方案,创建时间\n")
	for _, bc := range cases {
		corr := ""
		if bc.CorrectResponse != nil {
			corr = *bc.CorrectResponse
		}
		c.String(200, "%d,%s,%s,%s,%s,%s,%s,%s\n",
			bc.ID, bc.UserQuery, bc.AIResponse, corr, bc.ErrorType, bc.Status, bc.FixSolution, bc.CreatedAt.Format("2006-01-02 15:04:05"))
	}
}
