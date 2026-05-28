package sms

import (
	"testing"
)

func TestNewSMSService_EmptyCredentials(t *testing.T) {
	svc, err := NewSMSService("", "")
	if err != nil {
		t.Logf("expected behavior: error returned for empty credentials: %v", err)
	}
	if svc != nil {
		t.Log("client created even with empty credentials (SDK may allow lazy init)")
	}
}

func TestNewSMSService_ValidFormat(t *testing.T) {
	svc, err := NewSMSService("LTAI5tTestAccessKey", "testSecretKey123")
	if err != nil {
		t.Fatalf("NewSMSService failed: %v", err)
	}
	if svc == nil {
		t.Fatal("expected non-nil SMSService")
	}
	if svc.client == nil {
		t.Fatal("expected non-nil client")
	}
}

func TestSendVerificationCode_Signature(t *testing.T) {
	svc, err := NewSMSService("LTAI5tTest", "testSecret")
	if err != nil {
		t.Skipf("skipping test: SDK init failed: %v", err)
	}

	tests := []struct {
		name         string
		phoneNumber  string
		signName     string
		templateCode string
		code         string
		wantErr      bool
		errContains  string
	}{
		{
			name:         "normal params",
			phoneNumber:  "13800138000",
			signName:     "测试签名",
			templateCode: "SMS_123456",
			code:         "123456",
			wantErr:      true,
		},
		{
			name:         "empty phone",
			phoneNumber:  "",
			signName:     "测试签名",
			templateCode: "SMS_123456",
			code:         "123456",
			wantErr:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := svc.SendVerificationCode(tt.phoneNumber, tt.signName, tt.templateCode, tt.code)
			if tt.wantErr && err == nil {
				t.Error("expected error, got nil")
			}
		})
	}
}