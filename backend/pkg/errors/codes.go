package errors

// StatusCode constants for business error handling.
const (
	CodeParamError    = 40001
	CodeBusinessError = 40002
	CodeAuthFailed    = 40101
	CodeTokenInvalid  = 40102
	CodeForbidden     = 40301
	CodeNotFound      = 40401
	CodeConflict      = 40901
	CodeInternalError = 50001
)

// Message returns the Chinese description for the given business error code.
func Message(code int) string {
	switch code {
	case CodeParamError:
		return "参数错误"
	case CodeBusinessError:
		return "业务逻辑错误"
	case CodeAuthFailed:
		return "用户名或密码错误"
	case CodeTokenInvalid:
		return "令牌无效或已过期"
	case CodeForbidden:
		return "无权限访问"
	case CodeNotFound:
		return "资源不存在"
	case CodeConflict:
		return "资源已存在"
	case CodeInternalError:
		return "服务器内部错误"
	default:
		return "未知错误"
	}
}
