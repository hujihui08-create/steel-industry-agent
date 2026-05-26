export const PHONE_REGEX = /^1[3-9]\d{9}$/;

export const CODE_REGEX = /^\d{6}$/;

export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,20}$/;

export const SMS_COUNTDOWN_SECONDS = 60;

export const PHONE_MAX_LENGTH = 11;

export const CODE_MAX_LENGTH = 6;

export const ROUTE = {
  ROOT: "/",
  LOGIN: "/login",
  CHAT: "/chat",
  SPLASH: "/splash",
  REGISTER: "/register",
  PRICE_BOARD: "/price-board",
  CHART: "/chart",
  NEWS_DETAIL: "/news/:id",
  QUOTATIONS: "/quotations",
  QUOTATION_DETAIL: "/quotations/:id",
  TENDERS: "/tenders",
  TENDER_DETAIL: "/tenders/:id",
  ALERTS: "/alerts",
  KNOWLEDGE: "/knowledge",
  PROFILE: "/profile",
  PROFILE_EDIT: "/profile/edit",
  MESSAGES: "/messages",
  SETTINGS: "/settings",
  ADMIN: "/admin",
  ADMIN_LOGIN: "/admin/login",
  CALENDAR: "/calendar",
  FAVORITES: "/favorites",
  HELP: "/help",
  CERTIFICATION: "/certification",
  ONBOARDING: "/onboarding",
  KNOWLEDGE_DETAIL: "/knowledge/:id",
} as const;
