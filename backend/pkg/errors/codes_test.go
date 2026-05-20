package errors

import "testing"

func TestMessage_KnownCodes(t *testing.T) {
	tests := []struct {
		code     int
		expected string
	}{
		{CodeParamError, "参数错误"},
		{CodeBusinessError, "业务逻辑错误"},
		{CodeAuthFailed, "用户名或密码错误"},
		{CodeTokenInvalid, "令牌无效或已过期"},
		{CodeForbidden, "无权限访问"},
		{CodeNotFound, "资源不存在"},
		{CodeConflict, "资源已存在"},
		{CodeInternalError, "服务器内部错误"},
	}

	constants := []struct {
		name  string
		value int
	}{
		{"CodeParamError", CodeParamError},
		{"CodeBusinessError", CodeBusinessError},
		{"CodeAuthFailed", CodeAuthFailed},
		{"CodeTokenInvalid", CodeTokenInvalid},
		{"CodeForbidden", CodeForbidden},
		{"CodeNotFound", CodeNotFound},
		{"CodeConflict", CodeConflict},
		{"CodeInternalError", CodeInternalError},
	}

	expectedValues := []int{40001, 40002, 40101, 40102, 40301, 40401, 40901, 50001}

	for i, c := range constants {
		if c.value != expectedValues[i] {
			t.Errorf("%s: expected %d, got %d", c.name, expectedValues[i], c.value)
		}
	}

	for _, tt := range tests {
		got := Message(tt.code)
		if got != tt.expected {
			t.Errorf("Message(%d) = %q, want %q", tt.code, got, tt.expected)
		}
	}
}

func TestMessage_UnknownCode(t *testing.T) {
	got := Message(99999)
	if got != "未知错误" {
		t.Errorf("Message(99999) = %q, want %q", got, "未知错误")
	}
}

func TestMessage_ZeroCode(t *testing.T) {
	got := Message(0)
	if got != "未知错误" {
		t.Errorf("Message(0) = %q, want %q", got, "未知错误")
	}
}
