package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

type mockQuotationService struct {
	calculateFn         func(ctx context.Context, category, spec string, quantity float64) (*service.QuotationBreakdown, error)
	createFn            func(ctx context.Context, q *model.Quotation) error
	getListFn           func(ctx context.Context, userID uint, limit, offset int) ([]model.Quotation, error)
	getDetailFn         func(ctx context.Context, id uint) (*model.Quotation, error)
	updateFn            func(ctx context.Context, q *model.Quotation) error
	deleteFn            func(ctx context.Context, id uint) error
	exportPDFFn         func(ctx context.Context, id uint) ([]byte, error)
}

func (m *mockQuotationService) CalculateQuotation(ctx context.Context, category, spec string, quantity float64) (*service.QuotationBreakdown, error) {
	return m.calculateFn(ctx, category, spec, quantity)
}

func (m *mockQuotationService) CreateQuotation(ctx context.Context, q *model.Quotation) error {
	return m.createFn(ctx, q)
}

func (m *mockQuotationService) GetQuotationList(ctx context.Context, userID uint, limit, offset int) ([]model.Quotation, error) {
	return m.getListFn(ctx, userID, limit, offset)
}

func (m *mockQuotationService) GetQuotationDetail(ctx context.Context, id uint) (*model.Quotation, error) {
	return m.getDetailFn(ctx, id)
}

func (m *mockQuotationService) UpdateQuotation(ctx context.Context, q *model.Quotation) error {
	return m.updateFn(ctx, q)
}

func (m *mockQuotationService) DeleteQuotation(ctx context.Context, id uint) error {
	return m.deleteFn(ctx, id)
}

func (m *mockQuotationService) ExportQuotationPDF(ctx context.Context, id uint) ([]byte, error) {
	return m.exportPDFFn(ctx, id)
}

func setupQuotationRouter(mock *mockQuotationService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	handler := &QuotationHandler{quotationService: mock}
	router := gin.New()

	setUserID := func(c *gin.Context) {
		c.Set("user_id", uint(1))
		c.Next()
	}

	router.POST("/api/v1/quotations/calculate", handler.CalculateQuotation)
	router.POST("/api/v1/quotations", setUserID, handler.CreateQuotation)
	router.GET("/api/v1/quotations", setUserID, handler.GetQuotationList)
	router.GET("/api/v1/quotations/:id", handler.GetQuotationDetail)
	router.PUT("/api/v1/quotations/:id", setUserID, handler.UpdateQuotation)
	router.DELETE("/api/v1/quotations/:id", handler.DeleteQuotation)
	router.GET("/api/v1/quotations/:id/pdf", handler.ExportPDF)
	return router
}

func TestCalculateQuotation_ValidInput(t *testing.T) {
	mock := &mockQuotationService{
		calculateFn: func(ctx context.Context, category, spec string, quantity float64) (*service.QuotationBreakdown, error) {
			return &service.QuotationBreakdown{
				MaterialCost: 385000,
				ProcessCost:  30800,
				FreightCost:  5000,
				TaxCost:      54704,
				TotalPrice:   475504,
				UnitPrice:    3850,
			}, nil
		},
	}
	router := setupQuotationRouter(mock)

	body := `{"category": "螺纹钢", "spec": "HRB400E 20mm", "quantity": 100}`
	req, _ := http.NewRequest("POST", "/api/v1/quotations/calculate", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			MaterialCost float64 `json:"material_cost"`
			TotalPrice   float64 `json:"total_price"`
			UnitPrice    float64 `json:"unit_price"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if resp.Data.TotalPrice != 475504 {
		t.Errorf("expected total_price 475504, got %v", resp.Data.TotalPrice)
	}
}

func TestCreateQuotation_Valid(t *testing.T) {
	mock := &mockQuotationService{
		calculateFn: func(ctx context.Context, category, spec string, quantity float64) (*service.QuotationBreakdown, error) {
			return &service.QuotationBreakdown{
				MaterialCost: 385000,
				ProcessCost:  30800,
				FreightCost:  5000,
				TaxCost:      54704,
				TotalPrice:   475504,
				UnitPrice:    3850,
			}, nil
		},
		createFn: func(ctx context.Context, q *model.Quotation) error {
			q.ID = 1
			return nil
		},
	}
	router := setupQuotationRouter(mock)

	body := `{"category": "螺纹钢", "spec": "HRB400E 20mm", "quantity": 100}`
	req, _ := http.NewRequest("POST", "/api/v1/quotations", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int             `json:"code"`
		Message string          `json:"message"`
		Data    model.Quotation `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestGetQuotationList(t *testing.T) {
	mock := &mockQuotationService{
		getListFn: func(ctx context.Context, userID uint, limit, offset int) ([]model.Quotation, error) {
			return []model.Quotation{
				{ID: 1, Category: "螺纹钢", Spec: "HRB400E 20mm", TotalPrice: 475504},
				{ID: 2, Category: "热卷", Spec: "5.5mm", TotalPrice: 1036436},
			}, nil
		},
	}
	router := setupQuotationRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/quotations", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int               `json:"code"`
		Message string            `json:"message"`
		Data    []model.Quotation `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 quotations, got %d", len(resp.Data))
	}
}

func TestGetQuotationDetail_ValidID(t *testing.T) {
	mock := &mockQuotationService{
		getDetailFn: func(ctx context.Context, id uint) (*model.Quotation, error) {
			return &model.Quotation{
				ID:       1,
				Category: "螺纹钢",
				Spec:     "HRB400E 20mm",
			}, nil
		},
	}
	router := setupQuotationRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/quotations/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int             `json:"code"`
		Message string          `json:"message"`
		Data    model.Quotation `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestGetQuotationDetail_InvalidID(t *testing.T) {
	mock := &mockQuotationService{}
	router := setupQuotationRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/quotations/abc", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeParamError {
		t.Errorf("expected code %d, got %d", errors.CodeParamError, resp.Code)
	}
}

func TestUpdateQuotation_Valid(t *testing.T) {
	mock := &mockQuotationService{
		getDetailFn: func(ctx context.Context, id uint) (*model.Quotation, error) {
			return &model.Quotation{
				ID:           1,
				UserID:       1,
				CustomerName: "原客户",
				Category:     "螺纹钢",
				Spec:         "HRB400E 20mm",
				Quantity:     100,
			}, nil
		},
		updateFn: func(ctx context.Context, q *model.Quotation) error {
			return nil
		},
	}
	router := setupQuotationRouter(mock)

	body := `{"customer_name": "新客户", "status": "confirmed"}`
	req, _ := http.NewRequest("PUT", "/api/v1/quotations/1", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int             `json:"code"`
		Message string          `json:"message"`
		Data    model.Quotation `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestUpdateQuotation_NotOwner(t *testing.T) {
	mock := &mockQuotationService{
		getDetailFn: func(ctx context.Context, id uint) (*model.Quotation, error) {
			return &model.Quotation{
				ID:     1,
				UserID: 999,
			}, nil
		},
	}
	router := setupQuotationRouter(mock)

	body := `{"customer_name": "新客户"}`
	req, _ := http.NewRequest("PUT", "/api/v1/quotations/1", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != errors.CodeForbidden {
		t.Errorf("expected code %d, got %d", errors.CodeForbidden, resp.Code)
	}
}

func TestDeleteQuotation_Valid(t *testing.T) {
	mock := &mockQuotationService{
		deleteFn: func(ctx context.Context, id uint) error {
			return nil
		},
	}
	router := setupQuotationRouter(mock)

	req, _ := http.NewRequest("DELETE", "/api/v1/quotations/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var resp struct {
		Code    int         `json:"code"`
		Message string      `json:"message"`
		Data    interface{} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 200 {
		t.Errorf("expected code 200, got %d", resp.Code)
	}
}

func TestExportPDF_Valid(t *testing.T) {
	mock := &mockQuotationService{
		exportPDFFn: func(ctx context.Context, id uint) ([]byte, error) {
			return []byte("PDF_CONTENT"), nil
		},
	}
	router := setupQuotationRouter(mock)

	req, _ := http.NewRequest("GET", "/api/v1/quotations/1/pdf", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
	contentType := w.Header().Get("Content-Type")
	if contentType != "application/pdf" {
		t.Errorf("expected Content-Type 'application/pdf', got '%s'", contentType)
	}
	if w.Body.String() != "PDF_CONTENT" {
		t.Errorf("expected PDF_CONTENT, got '%s'", w.Body.String())
	}
}
