package handler

import (
	"context"
	"io"
	"strconv"
	"strings"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type badCaseService interface {
	List(ctx context.Context, filter service.BadCaseFilter) (map[string]interface{}, error)
	GetByID(ctx context.Context, id uint) (*model.BadCase, error)
	Create(ctx context.Context, badCase *model.BadCase) error
	Update(ctx context.Context, badCase *model.BadCase) error
	UpdateStatus(ctx context.Context, id uint, status string, fixSolution string) error
	Stats(ctx context.Context) (map[string]interface{}, error)
	Delete(ctx context.Context, id uint) error
	ImportBadCases(ctx context.Context, reader io.Reader, filename string) (map[string]interface{}, error)
	Export(ctx context.Context, filter service.BadCaseFilter) ([]byte, error)
	Verify(ctx context.Context, id uint) (map[string]interface{}, error)
}

type BadCaseHandler struct {
	badCaseService badCaseService
}

func NewBadCaseHandler(badCaseService *service.BadCaseService) *BadCaseHandler {
	return &BadCaseHandler{badCaseService: badCaseService}
}

func (h *BadCaseHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	filter := service.BadCaseFilter{
		Page:      page,
		PageSize:  pageSize,
		ErrorType: c.Query("error_type"),
		Status:    c.Query("status"),
		StartDate: c.Query("start_date"),
		EndDate:   c.Query("end_date"),
		Keyword:   c.Query("keyword"),
	}

	result, err := h.badCaseService.List(c.Request.Context(), filter)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, result)
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
		UserQuery       string `json:"user_query"`
		AIResponse      string `json:"ai_response"`
		CorrectResponse string `json:"correct_response"`
		ErrorType       string `json:"error_type"`
		Status          string `json:"status"`
		FixSolution     string `json:"fix_solution"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, errors.CodeParamError, "参数错误")
		return
	}

	bc, err := h.badCaseService.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Error(c, errors.CodeNotFound, "Bad Case不存在")
		return
	}

	if req.Status != "" && req.Status != bc.Status {
		if err := h.badCaseService.UpdateStatus(c.Request.Context(), uint(id), req.Status, req.FixSolution); err != nil {
			response.Error(c, errors.CodeBusinessError, err.Error())
			return
		}
	}

	if req.UserQuery != "" {
		bc.UserQuery = req.UserQuery
	}
	if req.AIResponse != "" {
		bc.AIResponse = req.AIResponse
	}
	if req.CorrectResponse != "" {
		bc.CorrectResponse = &req.CorrectResponse
	}
	if req.ErrorType != "" {
		bc.ErrorType = req.ErrorType
	}
	if req.FixSolution != "" && req.Status == "" {
		bc.FixSolution = req.FixSolution
	}

	if req.UserQuery != "" || req.AIResponse != "" || req.ErrorType != "" || (req.FixSolution != "" && req.Status == "") || (req.CorrectResponse != "") {
		if err := h.badCaseService.Update(c.Request.Context(), bc); err != nil {
			response.Error(c, errors.CodeInternalError, err.Error())
			return
		}
	}

	response.Success(c, nil)
}

func (h *BadCaseHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	if err := h.badCaseService.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, nil)
}

func (h *BadCaseHandler) Statistics(c *gin.Context) {
	stats, err := h.badCaseService.Stats(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, stats)
}

func (h *BadCaseHandler) Import(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.Error(c, errors.CodeParamError, "请上传文件")
		return
	}
	defer file.Close()

	result, err := h.badCaseService.ImportBadCases(c.Request.Context(), file, header.Filename)
	if err != nil {
		response.Error(c, errors.CodeBusinessError, err.Error())
		return
	}

	response.Success(c, result)
}

func (h *BadCaseHandler) Export(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	filter := service.BadCaseFilter{
		Page:      page,
		PageSize:  pageSize,
		ErrorType: c.Query("error_type"),
		Status:    c.Query("status"),
		StartDate: c.Query("start_date"),
		EndDate:   c.Query("end_date"),
		Keyword:   c.Query("keyword"),
	}

	data, err := h.badCaseService.Export(c.Request.Context(), filter)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=bad_cases.csv")
	c.Data(200, "text/csv; charset=utf-8", data)
}

func (h *BadCaseHandler) Verify(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Error(c, errors.CodeParamError, "参数错误：id格式不正确")
		return
	}

	result, err := h.badCaseService.Verify(c.Request.Context(), uint(id))
	if err != nil {
		if strings.Contains(err.Error(), "正在验证") {
			response.Error(c, errors.CodeBusinessError, err.Error())
		} else {
			response.Error(c, errors.CodeInternalError, err.Error())
		}
		return
	}

	response.Success(c, result)
}
