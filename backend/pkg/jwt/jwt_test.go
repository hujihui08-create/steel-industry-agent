package jwt

import (
	"testing"
	"time"

	"steel-agent-backend/internal/config"

	jwtlib "github.com/golang-jwt/jwt/v5"
)

func init() {
	if config.AppConfig == nil {
		config.AppConfig = &config.Config{
			JWTSecret: "test-secret",
		}
	}
}

func TestGenerateToken_Success(t *testing.T) {
	tokenString, err := GenerateToken(123)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}
	if tokenString == "" {
		t.Fatal("GenerateToken() returned empty token string")
	}

	claims, err := ParseToken(tokenString)
	if err != nil {
		t.Fatalf("ParseToken() error = %v", err)
	}

	if claims.UserID != 123 {
		t.Errorf("expected UserID 123, got %d", claims.UserID)
	}

	if claims.IssuedAt == nil {
		t.Fatal("expected IssuedAt to be set")
	}

	now := time.Now()
	diff := now.Sub(claims.IssuedAt.Time)
	if diff < 0 {
		diff = -diff
	}
	if diff > 5*time.Second {
		t.Errorf("IssuedAt is too far from now: diff = %v", diff)
	}
}

func TestGenerateToken_Expiry(t *testing.T) {
	tokenString, err := GenerateToken(789)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	claims, err := ParseToken(tokenString)
	if err != nil {
		t.Fatalf("ParseToken() error = %v", err)
	}

	if claims.ExpiresAt == nil {
		t.Fatal("expected ExpiresAt to be set")
	}
	if claims.IssuedAt == nil {
		t.Fatal("expected IssuedAt to be set")
	}

	expectedExpiry := claims.IssuedAt.Add(24 * time.Hour)
	diff := expectedExpiry.Sub(claims.ExpiresAt.Time)
	if diff < 0 {
		diff = -diff
	}
	if diff > 5*time.Second {
		t.Errorf("ExpiresAt should be IssuedAt + 24h, diff = %v", diff)
	}
}

func TestParseToken_Valid(t *testing.T) {
	originalToken, err := GenerateToken(456)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	claims, err := ParseToken(originalToken)
	if err != nil {
		t.Fatalf("ParseToken() error = %v", err)
	}

	if claims.UserID != 456 {
		t.Errorf("expected UserID 456, got %d", claims.UserID)
	}
}

func TestParseToken_Error(t *testing.T) {
	tests := []struct {
		name        string
		tokenString string
		setupToken  func() string
	}{
		{
			name:        "empty token",
			tokenString: "",
		},
		{
			name:        "invalid format",
			tokenString: "not-a-jwt",
		},
		{
			name:        "malformed - only two parts",
			tokenString: "header.payload",
		},
		{
			name: "tampered token - appended characters",
			setupToken: func() string {
				validToken, err := GenerateToken(999)
				if err != nil {
					t.Fatalf("GenerateToken() error = %v", err)
				}
				return validToken + "tampered"
			},
		},
		{
			name: "wrong signature",
			setupToken: func() string {
				claims := Claims{
					UserID: 123,
					RegisteredClaims: jwtlib.RegisteredClaims{
						ExpiresAt: jwtlib.NewNumericDate(time.Now().Add(24 * time.Hour)),
						IssuedAt:  jwtlib.NewNumericDate(time.Now()),
					},
				}
				token := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims)
				tokenString, err := token.SignedString([]byte("wrong-secret"))
				if err != nil {
					t.Fatalf("failed to create wrong-signature token: %v", err)
				}
				return tokenString
			},
		},
		{
			name: "expired token",
			setupToken: func() string {
				claims := Claims{
					UserID: 456,
					RegisteredClaims: jwtlib.RegisteredClaims{
						ExpiresAt: jwtlib.NewNumericDate(time.Now().Add(-1 * time.Hour)),
						IssuedAt:  jwtlib.NewNumericDate(time.Now().Add(-25 * time.Hour)),
					},
				}
				token := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims)
				tokenString, err := token.SignedString([]byte(config.AppConfig.JWTSecret))
				if err != nil {
					t.Fatalf("failed to create expired token: %v", err)
				}
				return tokenString
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var ts string
			if tt.setupToken != nil {
				ts = tt.setupToken()
			} else {
				ts = tt.tokenString
			}

			_, err := ParseToken(ts)
			if err == nil {
				t.Errorf("expected error for %s, got nil", tt.name)
			}
		})
	}
}
