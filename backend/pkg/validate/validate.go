package validate

import (
	"regexp"
	"unicode/utf8"
)

var phonePattern = regexp.MustCompile(`^1[3-9]\d{9}$`)

var smsCodePattern = regexp.MustCompile(`^\d{6}$`)

// ValidatePhone validates that the given string matches the Chinese phone number format.
func ValidatePhone(phone string) bool {
	return phonePattern.MatchString(phone)
}

// ValidatePassword validates that the given password meets the length requirements (6-32 characters).
func ValidatePassword(password string) bool {
	length := utf8.RuneCountInString(password)
	return length >= 6 && length <= 32
}

// ValidateSMSCode validates that the given SMS verification code is a 6-digit string.
func ValidateSMSCode(code string) bool {
	return smsCodePattern.MatchString(code)
}
