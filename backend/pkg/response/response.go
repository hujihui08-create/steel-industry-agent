package response

import (
	"net/http"

	"steel-agent-backend/pkg/errors"

	"github.com/gin-gonic/gin"
)

// Response is the unified HTTP response format.
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

// Success returns a 200 success response with the given data.
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    200,
		Message: "success",
		Data:    data,
	})
}

// Error sends a generic error response. Use error code constants from pkg/errors.
func Error(c *gin.Context, code int, message string) {
	c.JSON(http.StatusOK, Response{
		Code:    code,
		Message: message,
		Data:    nil,
	})
}

// BadRequest returns a 400 error response with the given message.
func BadRequest(c *gin.Context, msg string) {
	Error(c, errors.CodeParamError, msg)
}

// BusinessError returns a 400 business error response with the given message.
func BusinessError(c *gin.Context, msg string) {
	Error(c, errors.CodeBusinessError, msg)
}

// Unauthorized returns a 401 error response with the given message.
func Unauthorized(c *gin.Context, msg string) {
	Error(c, errors.CodeAuthFailed, msg)
}

// TokenInvalid returns a 401 token invalid error response with the given message.
func TokenInvalid(c *gin.Context, msg string) {
	Error(c, errors.CodeTokenInvalid, msg)
}

// Forbidden returns a 403 error response with the given message.
func Forbidden(c *gin.Context, msg string) {
	Error(c, errors.CodeForbidden, msg)
}

// NotFound returns a 404 error response with the given message.
func NotFound(c *gin.Context, msg string) {
	Error(c, errors.CodeNotFound, msg)
}

// Conflict returns a 409 error response with the given message.
func Conflict(c *gin.Context, msg string) {
	Error(c, errors.CodeConflict, msg)
}

// InternalError returns a 500 error response with the given message.
func InternalError(c *gin.Context, msg string) {
	Error(c, errors.CodeInternalError, msg)
}
