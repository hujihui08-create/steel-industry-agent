// ============================================================
// Sensitive Data Masking Utilities
// 敏感数据脱敏工具函数
// 设计系统: 钢铁行业 Agent · 极简组件规范
// ============================================================

/**
 * 手机号脱敏：138****1234
 * 11 位手机号：前 3 位 + **** + 后 4 位
 * 其他长度：按比例隐藏中间部分
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  if (phone.length === 11) {
    return phone.slice(0, 3) + "****" + phone.slice(7);
  }
  // 通用脱敏：保留首尾可见部分，中间用 * 替换
  const visible = Math.min(3, Math.floor(phone.length / 3));
  const hidden = Math.min(4, phone.length - visible * 2);
  return (
    phone.slice(0, visible) +
    "*".repeat(hidden) +
    phone.slice(visible + hidden)
  );
}

/**
 * 邮箱脱敏：user***@domain.com
 * local 部分保留前 4 个字符，其余用 *** 替换
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `***@${domain}`;
  return local.slice(0, 4) + "***@" + domain;
}

/**
 * 身份证号脱敏：330102********1234
 * 保留前 6 位 + ******** + 后 4 位
 */
export function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 8) return idCard;
  return idCard.slice(0, 6) + "********" + idCard.slice(-4);
}
