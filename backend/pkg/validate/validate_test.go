package validate

import (
	"strings"
	"testing"
)

func TestValidatePhone(t *testing.T) {
	tests := []struct {
		name  string
		phone string
		want  bool
	}{
		{"valid 13800138000", "13800138000", true},
		{"valid 15912345678", "15912345678", true},
		{"valid 18888888888", "18888888888", true},
		{"valid 19900001111", "19900001111", true},
		{"valid 13600000000", "13600000000", true},
		{"invalid first digit 2", "23800138000", false},
		{"invalid first digit 0", "03800138000", false},
		{"invalid second digit 2", "12000138000", false},
		{"invalid second digit 1", "11000138000", false},
		{"invalid second digit 0", "10000138000", false},
		{"too short 10 digits", "1380013800", false},
		{"too short 5 digits", "13800", false},
		{"too long 12 digits", "138001380000", false},
		{"empty string", "", false},
		{"contains letter at end", "1380013800a", false},
		{"all letters", "abcdefghijk", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ValidatePhone(tt.phone)
			if got != tt.want {
				t.Errorf("ValidatePhone(%q) = %v, want %v", tt.phone, got, tt.want)
			}
		})
	}
}

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		want     bool
	}{
		{"5 chars → false", strings.Repeat("a", 5), false},
		{"6 chars → true (minimum)", strings.Repeat("a", 6), true},
		{"7 chars → true", strings.Repeat("a", 7), true},
		{"31 chars → true", strings.Repeat("a", 31), true},
		{"32 chars → true (maximum)", strings.Repeat("a", 32), true},
		{"33 chars → false", strings.Repeat("a", 33), false},
		{"empty string → false", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ValidatePassword(tt.password)
			if got != tt.want {
				t.Errorf("ValidatePassword(%d chars) = %v, want %v", len(tt.password), got, tt.want)
			}
		})
	}
}

func TestValidateSMSCode(t *testing.T) {
	tests := []struct {
		name string
		code string
		want bool
	}{
		{"valid 000000", "000000", true},
		{"valid 123456", "123456", true},
		{"valid 999999", "999999", true},
		{"too short 5 digits", "12345", false},
		{"too long 7 digits", "1234567", false},
		{"contains letter 12345a", "12345a", false},
		{"all letters abcdef", "abcdef", false},
		{"empty string", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ValidateSMSCode(tt.code)
			if got != tt.want {
				t.Errorf("ValidateSMSCode(%q) = %v, want %v", tt.code, got, tt.want)
			}
		})
	}
}
