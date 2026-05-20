import {
  PHONE_REGEX,
  CODE_REGEX,
  PASSWORD_REGEX,
  SMS_COUNTDOWN_SECONDS,
  PHONE_MAX_LENGTH,
  CODE_MAX_LENGTH,
  ROUTE,
} from "@/app/constants/auth";

// ---------------------------------------------------------------------------
// PHONE_REGEX — ^1[3-9]\d{9}$
// ---------------------------------------------------------------------------
describe("PHONE_REGEX", () => {
  it('should match "13800138000" (valid 11-digit mobile)', () => {
    expect(PHONE_REGEX.test("13800138000")).toBe(true);
  });

  it('should NOT match "12345678901" (starts with 1 but second digit not 3-9)', () => {
    expect(PHONE_REGEX.test("12345678901")).toBe(false);
  });

  it('should NOT match "1380013800" (10 digits)', () => {
    expect(PHONE_REGEX.test("1380013800")).toBe(false);
  });

  it('should NOT match "138001380000" (12 digits)', () => {
    expect(PHONE_REGEX.test("138001380000")).toBe(false);
  });

  it('should NOT match "" (empty string)', () => {
    expect(PHONE_REGEX.test("")).toBe(false);
  });

  it('should NOT match "1380013800a" (contains letter)', () => {
    expect(PHONE_REGEX.test("1380013800a")).toBe(false);
  });

  it("should match additional valid prefixes (15x, 18x, etc.)", () => {
    expect(PHONE_REGEX.test("15012345678")).toBe(true);
    expect(PHONE_REGEX.test("18612345678")).toBe(true);
    expect(PHONE_REGEX.test("19912345678")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CODE_REGEX — ^\d{6}$
// ---------------------------------------------------------------------------
describe("CODE_REGEX", () => {
  it('should match "123456" (6 digits)', () => {
    expect(CODE_REGEX.test("123456")).toBe(true);
  });

  it('should match "000000" (all zeros)', () => {
    expect(CODE_REGEX.test("000000")).toBe(true);
  });

  it('should NOT match "12345" (5 digits)', () => {
    expect(CODE_REGEX.test("12345")).toBe(false);
  });

  it('should NOT match "1234567" (7 digits)', () => {
    expect(CODE_REGEX.test("1234567")).toBe(false);
  });

  it('should NOT match "abcdef" (letters)', () => {
    expect(CODE_REGEX.test("abcdef")).toBe(false);
  });

  it('should NOT match "" (empty string)', () => {
    expect(CODE_REGEX.test("")).toBe(false);
  });

  it("should NOT match alphanumeric mix", () => {
    expect(CODE_REGEX.test("12ab56")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PASSWORD_REGEX — ^(?=.*[A-Za-z])(?=.*\d).{8,20}$
// ---------------------------------------------------------------------------
describe("PASSWORD_REGEX", () => {
  it('should match "abc12345" (8 chars, lowercase letters + digits)', () => {
    expect(PASSWORD_REGEX.test("abc12345")).toBe(true);
  });

  it('should match "Abc12345" (8 chars, mixed case letters + digits)', () => {
    expect(PASSWORD_REGEX.test("Abc12345")).toBe(true);
  });

  it('should NOT match "abcdefgh" (only letters, no digits)', () => {
    expect(PASSWORD_REGEX.test("abcdefgh")).toBe(false);
  });

  it('should NOT match "12345678" (only digits, no letters)', () => {
    expect(PASSWORD_REGEX.test("12345678")).toBe(false);
  });

  it('should NOT match "ab1" (too short, 3 chars)', () => {
    expect(PASSWORD_REGEX.test("ab1")).toBe(false);
  });

  it('should NOT match "abcdefghijklmnopqrst1" (too long, 21 chars)', () => {
    expect(PASSWORD_REGEX.test("abcdefghijklmnopqrst1")).toBe(false);
  });

  it("should match exactly 20-character valid password", () => {
    // 16 letters + 4 digits = 20 chars
    expect(PASSWORD_REGEX.test("abcdefghijklmnop1234")).toBe(true);
  });

  it("should NOT match exactly 7-character valid content (too short)", () => {
    expect(PASSWORD_REGEX.test("abcde12")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe("Constants", () => {
  it("SMS_COUNTDOWN_SECONDS should be 60", () => {
    expect(SMS_COUNTDOWN_SECONDS).toBe(60);
  });

  it("PHONE_MAX_LENGTH should be 11", () => {
    expect(PHONE_MAX_LENGTH).toBe(11);
  });

  it("CODE_MAX_LENGTH should be 6", () => {
    expect(CODE_MAX_LENGTH).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// ROUTE
// ---------------------------------------------------------------------------
describe("ROUTE", () => {
  it('ROUTE.ROOT should be "/"', () => {
    expect(ROUTE.ROOT).toBe("/");
  });

  it('ROUTE.LOGIN should be "/login"', () => {
    expect(ROUTE.LOGIN).toBe("/login");
  });

  it('ROUTE.CHAT should be "/chat"', () => {
    expect(ROUTE.CHAT).toBe("/chat");
  });

  it("ROUTE should have correct structure with all expected keys", () => {
    // ROUTE is defined `as const` for compile-time type narrowing
    const keys = Object.keys(ROUTE);
    expect(keys).toHaveLength(19);
    expect(keys).toContain("ROOT");
    expect(keys).toContain("LOGIN");
    expect(keys).toContain("CHAT");
    expect(keys).toContain("SPLASH");
    expect(keys).toContain("REGISTER");
    expect(keys).toContain("CHART");
    expect(keys).toContain("QUOTATIONS");
    expect(keys).toContain("ALERTS");
    expect(keys).toContain("PROFILE");
    expect(keys).toContain("SETTINGS");
    expect(keys).toContain("MESSAGES");
    expect(keys).toContain("ADMIN");
  });
});
