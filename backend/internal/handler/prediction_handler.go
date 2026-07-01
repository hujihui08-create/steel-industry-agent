package handler

import (
	"context"
	"strconv"

	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

// predictionService is the interface for prediction-related business logic.
type predictionService interface {
	Predict(ctx context.Context, category, spec, region string, horizonDays int) (*service.PredictionResult, error)
	GetSeasonalTips(ctx context.Context, category string) ([]service.SeasonalTip, error)
	GetPredictionForTrend(ctx context.Context, category string, horizonDays int) ([]service.PredictionPoint, error)
}

// PredictionHandler handles prediction-related HTTP requests.
type PredictionHandler struct {
	predictionService predictionService
}

// NewPredictionHandler creates a new PredictionHandler with the given prediction service.
func NewPredictionHandler(predictionService *service.PredictionService) *PredictionHandler {
	return &PredictionHandler{predictionService: predictionService}
}

// GetPrediction handles GET /api/v1/prices/predict
// Query params: category (required), spec, region, horizon_days (default 30)
func (h *PredictionHandler) GetPrediction(c *gin.Context) {
	category := c.Query("category")
	if category == "" {
		response.Error(c, errors.CodeParamError, "参数错误：缺少category")
		return
	}

	spec := c.Query("spec")
	region := c.Query("region")

	horizonStr := c.DefaultQuery("horizon_days", "30")
	horizonDays, err := strconv.Atoi(horizonStr)
	if err != nil || horizonDays < 1 || horizonDays > 90 {
		response.Error(c, errors.CodeParamError, "参数错误：horizon_days需为1-90之间的整数")
		return
	}

	result, err := h.predictionService.Predict(c.Request.Context(), category, spec, region, horizonDays)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, result)
}

// GetSeasonalTips handles GET /api/v1/prices/seasonal-tips
// Query params: category (required)
func (h *PredictionHandler) GetSeasonalTips(c *gin.Context) {
	category := c.Query("category")
	if category == "" {
		response.Error(c, errors.CodeParamError, "参数错误：缺少category")
		return
	}

	tips, err := h.predictionService.GetSeasonalTips(c.Request.Context(), category)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, tips)
}
