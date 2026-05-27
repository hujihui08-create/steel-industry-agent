package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"steel-agent-backend/internal/config"
	"steel-agent-backend/internal/model"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func init() {
	config.AppConfig = &config.Config{
		JWTSecret: "test-secret",
	}
}

type adminRepoInterface interface {
	FindByID(ctx context.Context, id uint) (*model.Admin, error)
}

type mockAdminRepo struct {
	findByIDFunc func(ctx context.Context, id uint) (*model.Admin, error)
}

func (m *mockAdminRepo) FindByID(ctx context.Context, id uint) (*model.Admin, error) {
	return m.findByIDFunc(ctx, id)
}

func testRequireRole(repo adminRepoInterface, allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get("user_id")
		if !exists {
			response.Error(c, errors.CodeAuthFailed, "未提供认证信息")
			c.Abort()
			return
		}

		adminID, ok := userIDVal.(uint)
		if !ok {
			response.Error(c, errors.CodeAuthFailed, "认证信息无效")
			c.Abort()
			return
		}

		admin, err := repo.FindByID(c.Request.Context(), adminID)
		if err != nil {
			response.Error(c, errors.CodeAuthFailed, "管理员账号不存在")
			c.Abort()
			return
		}

		if admin.Role == "viewer" {
			if c.Request.Method == http.MethodGet {
				c.Next()
				return
			}
			response.Error(c, errors.CodeForbidden, "只读观察员不可执行写操作")
			c.Abort()
			return
		}

		for _, role := range allowedRoles {
			if admin.Role == role {
				c.Next()
				return
			}
		}

		response.Error(c, errors.CodeForbidden, "无权限访问")
		c.Abort()
	}
}

func TestRequireRole_AdminToken_Allowed(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &mockAdminRepo{
		findByIDFunc: func(ctx context.Context, id uint) (*model.Admin, error) {
			return &model.Admin{
				ID:   id,
				Role: "operator",
			}, nil
		},
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/admin/test", nil)
	c.Set("user_id", uint(1))
	c.Set("role", "admin")

	testRequireRole(repo, "super_admin", "operator")(c)

	if c.IsAborted() {
		t.Error("expected request NOT to be aborted for operator role")
	}
}

func TestRequireRole_RegularUserToken_Denied(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &mockAdminRepo{
		findByIDFunc: func(ctx context.Context, id uint) (*model.Admin, error) {
			return nil, gorm.ErrRecordNotFound
		},
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/admin/test", nil)
	c.Set("user_id", uint(999))

	testRequireRole(repo, "super_admin")(c)

	if !c.IsAborted() {
		t.Error("expected request to be aborted for non-existent admin")
	}
}

func TestRequireRole_ViewerGetAllowed_PostDenied(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &mockAdminRepo{
		findByIDFunc: func(ctx context.Context, id uint) (*model.Admin, error) {
			return &model.Admin{
				ID:   id,
				Role: "viewer",
			}, nil
		},
	}

	t.Run("GET allowed for viewer", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/admin/test", nil)
		c.Set("user_id", uint(1))

		testRequireRole(repo, "super_admin", "operator")(c)

		if c.IsAborted() {
			t.Error("expected GET request NOT to be aborted for viewer role")
		}
	})

	t.Run("POST denied for viewer", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("POST", "/admin/test", nil)
		c.Set("user_id", uint(1))

		testRequireRole(repo, "super_admin", "operator")(c)

		if !c.IsAborted() {
			t.Error("expected POST request to be aborted for viewer role")
		}
	})
}

func TestRequireRole_WrongRole_Denied(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &mockAdminRepo{
		findByIDFunc: func(ctx context.Context, id uint) (*model.Admin, error) {
			return &model.Admin{
				ID:   id,
				Role: "viewer",
			}, nil
		},
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/admin/test", nil)
	c.Set("user_id", uint(1))

	testRequireRole(repo, "super_admin")(c)

	if !c.IsAborted() {
		t.Error("expected request to be aborted for viewer not in allowed roles")
	}
}

func TestRequireRole_NoContextUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &mockAdminRepo{
		findByIDFunc: func(ctx context.Context, id uint) (*model.Admin, error) {
			return &model.Admin{
				ID:   id,
				Role: "operator",
			}, nil
		},
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/admin/test", nil)

	testRequireRole(repo, "super_admin", "operator")(c)

	if !c.IsAborted() {
		t.Error("expected request to be aborted when user_id not in context")
	}
}
