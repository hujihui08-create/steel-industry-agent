package jwt

import (
	"errors"
	"fmt"
	"time"

	"steel-agent-backend/internal/config"

	jwtlib "github.com/golang-jwt/jwt/v5"
)

// Claims represents the custom JWT claims for the steel agent platform.
type Claims struct {
	UserID    uint   `json:"user_id"`
	TokenType string `json:"token_type"`
	jwtlib.RegisteredClaims
}

// getSecret returns the appropriate secret based on token type.
func getSecret(tokenType string) string {
	if tokenType == "refresh" && config.AppConfig.JWTRefreshSecret != "" {
		return config.AppConfig.JWTRefreshSecret
	}
	return config.AppConfig.JWTSecret
}

// GenerateToken creates a signed JWT token for the given user ID, valid for 24 hours.
// Backward compatible: TokenType is not set (empty string).
func GenerateToken(userID uint) (string, error) {
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwtlib.RegisteredClaims{
			ExpiresAt: jwtlib.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwtlib.NewNumericDate(time.Now()),
		},
	}

	token := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}

// GenerateAccessToken creates a signed JWT access token with configurable expiry.
// sessionTimeoutMinutes overrides the environment default when greater than 0.
// Pass 0 to use the JWTAccessExpireHours environment variable.
func GenerateAccessToken(userID uint, sessionTimeoutMinutes int) (string, error) {
	var expiresAt time.Time
	if sessionTimeoutMinutes > 0 {
		expiresAt = time.Now().Add(time.Duration(sessionTimeoutMinutes) * time.Minute)
	} else {
		expireHours := config.AppConfig.JWTAccessExpireHours
		if expireHours <= 0 {
			expireHours = 2
		}
		expiresAt = time.Now().Add(time.Duration(expireHours) * time.Hour)
	}
	claims := Claims{
		UserID:    userID,
		TokenType: "access",
		RegisteredClaims: jwtlib.RegisteredClaims{
			ExpiresAt: jwtlib.NewNumericDate(expiresAt),
			IssuedAt:  jwtlib.NewNumericDate(time.Now()),
		},
	}

	token := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims)
	return token.SignedString([]byte(getSecret("access")))
}

// GenerateRefreshToken creates a signed JWT refresh token with configurable expiry.
func GenerateRefreshToken(userID uint) (string, error) {
	expireHours := config.AppConfig.JWTRefreshExpireHours
	if expireHours <= 0 {
		expireHours = 168
	}
	claims := Claims{
		UserID:    userID,
		TokenType: "refresh",
		RegisteredClaims: jwtlib.RegisteredClaims{
			ExpiresAt: jwtlib.NewNumericDate(time.Now().Add(time.Duration(expireHours) * time.Hour)),
			IssuedAt:  jwtlib.NewNumericDate(time.Now()),
		},
	}

	token := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims)
	return token.SignedString([]byte(getSecret("refresh")))
}

// ParseToken parses and validates a JWT token string, returning the parsed claims.
// Backward compatible: does not validate TokenType.
func ParseToken(tokenString string) (*Claims, error) {
	return parseTokenWithSecret(tokenString, config.AppConfig.JWTSecret)
}

// ParseTokenWithType parses a token and validates that its TokenType matches the expected type.
func ParseTokenWithType(tokenString string, expectedType string) (*Claims, error) {
	claims, err := ParseToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != expectedType {
		return nil, fmt.Errorf("invalid token type: expected %s, got %s", expectedType, claims.TokenType)
	}

	return claims, nil
}

// parseTokenWithSecret parses a JWT token using the given secret.
func parseTokenWithSecret(tokenString string, secret string) (*Claims, error) {
	token, err := jwtlib.ParseWithClaims(tokenString, &Claims{}, func(token *jwtlib.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
