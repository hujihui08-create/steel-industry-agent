// ============================================================
// SystemSettings -- 系统设置页面
//
// 包含功能：
//   1. 基础设置（网站名称、Logo上传、联系方式）
//   2. 通知配置（邮件通知、短信通知，开关控制显示/隐藏）
//   3. 安全设置（会话超时、登录锁定、IP白名单）
//
// Design tokens: 使用项目色板/字阶/圆角规范
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Building2,
  Mail,
  Phone,
  Bell,
  Eye,
  EyeOff,
  Plus,
  X,
  Upload,
  Shield,
  TriangleAlert,
  Loader2,
  Server,
  Hash,
  Key,
  FileSignature,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPageShell } from "./AdminPageShell";
import { AdminModal } from "./AdminModal";
import { showSuccessToast, showErrorToast, showWarningToast } from "./AdminToast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSystemSettings,
  saveSystemSettings,
  uploadLogo,
  testEmail,
  testSms,
} from "@/app/api/admin";
import type { SystemSettings as SystemSettingsType, SmtpEncryption } from "@/app/types/admin";

// ============================================================
// 常量
// ============================================================

/** 默认表单值 */
const DEFAULT_FORM: SystemSettingsType = {
  siteName: "钢铁行业Agent管理后台",
  logoUrl: "",
  contactEmail: "",
  contactPhone: "",
  emailEnabled: false,
  smtpServer: "",
  smtpPort: 465,
  smtpEncryption: "SSL",
  smtpEmail: "",
  smtpPassword: "",
  smsEnabled: true,
  smsProvider: "阿里云号码认证（个人开发者）",
  smsAccessKey: "",
  smsAccessSecret: "",
  smsSignName: "",
  smsTemplateCode: "",
  sessionTimeout: 30,
  loginLockCount: 5,
  ipWhitelistEnabled: false,
  ipWhitelist: [],
};

const SMS_PROVIDERS = [
  { value: "阿里云号码认证（个人开发者）", label: "阿里云号码认证（个人开发者）" },
  { value: "腾讯云短信", label: "腾讯云短信" },
  { value: "华为云短信", label: "华为云短信" },
];

const SMTP_ENCRYPTIONS: { value: SmtpEncryption; label: string }[] = [
  { value: "SSL", label: "SSL" },
  { value: "TLS", label: "TLS" },
  { value: "none", label: "无加密" },
];

// ============================================================
// 子组件：表单行（标签在左，输入在右）
// ============================================================

interface FormRowProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

function FormRow({ label, hint, children, className }: FormRowProps) {
  return (
    <div className={cn("flex items-start gap-6 py-3", className)}>
      <div className="w-[172px] shrink-0 pt-[6px]">
        <span className="text-[13px] leading-[1.5] text-[#404040]">
          {label}
        </span>
        {hint && (
          <p className="text-[11px] leading-[1.5] text-[#737373] mt-0.5">
            {hint}
          </p>
        )}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================

export default function SystemSettingsPage() {
  // ---------- 状态 ----------
  const [form, setForm] = useState<SystemSettingsType>(DEFAULT_FORM);
  const [initialForm, setInitialForm] = useState<SystemSettingsType>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");

  // 密码可见性
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showSmsAccessKey, setShowSmsAccessKey] = useState(false);
  const [showSmsAccessSecret, setShowSmsAccessSecret] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [testSmsPhone, setTestSmsPhone] = useState("");

  // IP 白名单输入
  const [newIp, setNewIp] = useState("");

  // 安全设置确认弹窗
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  // Logo 文件输入 ref
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ---------- 脏状态 ----------
  const isDirty = useCallback(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  // ---------- 数据加载 ----------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const settings = await getSystemSettings();
        if (!cancelled) {
          setForm(settings);
          setInitialForm(settings);
          setLogoPreview(settings.logoUrl);
        }
      } catch {
        if (!cancelled) {
          showErrorToast("加载系统设置失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- 表单更新 ----------
  function updateField<K extends keyof SystemSettingsType>(
    key: K,
    value: SystemSettingsType[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ---------- Logo 上传 ----------
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 校验文件类型
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      showErrorToast("仅支持 PNG/JPG 格式");
      return;
    }

    // 校验文件大小
    if (file.size > 2 * 1024 * 1024) {
      showErrorToast("文件大小不能超过 2MB");
      return;
    }

    // 本地预览
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setLogoPreview(dataUrl);
    };
    reader.readAsDataURL(file);

    // 上传到服务器
    setUploadingLogo(true);
    try {
      const url = await uploadLogo(file);
      updateField("logoUrl", url);
      showSuccessToast("Logo 上传成功");
    } catch {
      showErrorToast("Logo 上传失败");
    } finally {
      setUploadingLogo(false);
      // 重置 file input
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  }

  // ---------- 测试邮件 ----------
  async function handleTestEmail() {
    setTestingEmail(true);
    try {
      const result = await testEmail({
        smtpServer: form.smtpServer,
        smtpPort: form.smtpPort,
        smtpEncryption: form.smtpEncryption,
        smtpEmail: form.smtpEmail,
        smtpPassword: form.smtpPassword,
      });
      if (result.success) {
        showSuccessToast(result.message);
      } else {
        showErrorToast(result.message || "测试邮件发送失败");
      }
    } catch {
      showErrorToast("邮件测试请求失败");
    } finally {
      setTestingEmail(false);
    }
  }

  // ---------- IP 白名单操作 ----------
  function addIp() {
    const ip = newIp.trim();
    if (!ip) return;
    // 简单 IP 格式校验
    const ipRegex =
      /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^[0-9a-fA-F:.]+$/;
    if (!ipRegex.test(ip)) {
      showErrorToast("请输入有效的 IP 地址");
      return;
    }
    if (form.ipWhitelist.includes(ip)) {
      showWarningToast("该 IP 已在白名单中");
      return;
    }
    updateField("ipWhitelist", [...form.ipWhitelist, ip]);
    setNewIp("");
  }

  function removeIp(ip: string) {
    updateField(
      "ipWhitelist",
      form.ipWhitelist.filter((item) => item !== ip),
    );
  }

  // ---------- 保存 ----------
  async function doSave() {
    setSaving(true);
    try {
      await saveSystemSettings(form);
      setInitialForm({ ...form, ipWhitelist: [...form.ipWhitelist] });
      showSuccessToast("设置已保存");
    } catch {
      showErrorToast("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    // 安全设置相关字段有变更时，弹出强提醒
    const securityFields: (keyof SystemSettingsType)[] = [
      "sessionTimeout",
      "loginLockCount",
      "ipWhitelistEnabled",
      "ipWhitelist",
    ];
    const securityChanged = securityFields.some(
      (key) => JSON.stringify(form[key]) !== JSON.stringify(initialForm[key]),
    );

    if (securityChanged) {
      setPendingSave(true);
      setShowSecurityWarning(true);
    } else {
      doSave();
    }
  }

  function handleSecurityConfirm() {
    setShowSecurityWarning(false);
    setPendingSave(false);
    doSave();
  }

  // ---------- 加载状态 ----------
  if (loading) {
    return (
      <AdminPageShell
        title="系统设置"
        breadcrumbs={[
          { label: "首页", path: "/admin" },
          { label: "系统管理" },
          { label: "系统设置" },
        ]}
      >
        <div className="flex flex-col gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-[#E5E5E5] rounded-2xl p-5 animate-pulse"
            >
              <div className="h-5 w-24 bg-[#E5E5E5] rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex gap-6">
                    <div className="h-5 w-[172px] bg-[#F5F5F5] rounded" />
                    <div className="h-9 flex-1 bg-[#F5F5F5] rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AdminPageShell>
    );
  }

  // ---------- 渲染 ----------
  return (
    <>
      <AdminPageShell
        title="系统设置"
        breadcrumbs={[
          { label: "首页", path: "/admin" },
          { label: "系统管理" },
          { label: "系统设置" },
        ]}
        actions={
          <Button
            onClick={handleSave}
            disabled={saving || !isDirty()}
            className={cn(
              "h-9 px-5 rounded-full text-[13px] leading-[1.5] font-medium",
              "transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#0A0A0A]/10",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isDirty()
                ? "bg-[#0A0A0A] text-white hover:bg-[#404040]"
                : "bg-[#FAFAFA] text-[#A3A3A3] border border-[#E5E5E5]",
            )}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2
                  size={14}
                  strokeWidth={1.75}
                  className="animate-spin"
                />
                保存中...
              </span>
            ) : (
              "保存设置"
            )}
          </Button>
        }
      >
        <div className="flex flex-col gap-6">
          {/* ============================================================ */}
          {/* Section 1: 基础设置 */}
          {/* ============================================================ */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden">
            {/* 卡片标题 */}
            <div className="flex items-center gap-2 px-5 pt-5 pb-2">
              <Building2
                size={16}
                strokeWidth={1.75}
                className="text-[#0A0A0A]"
              />
              <h2 className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A]">
                基础设置
              </h2>
            </div>

            <div className="px-5 pb-5 divide-y divide-[#E5E5E5]">
              {/* 网站名称 */}
              <FormRow label="网站名称">
                <Input
                  value={form.siteName}
                  onChange={(e) => updateField("siteName", e.target.value)}
                  placeholder="输入网站名称"
                  className={cn(
                    "h-9 rounded-[10px] border-[#E5E5E5] bg-white",
                    "text-[13px] leading-[1.5] text-[#0A0A0A]",
                    "placeholder:text-[#A3A3A3]",
                    "focus-visible:border-[#0A0A0A] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/5",
                  )}
                />
              </FormRow>

              {/* Logo 上传 */}
              <FormRow label="Logo 上传">
                <div className="flex items-start gap-4">
                  {/* 预览区域 */}
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className={cn(
                      "w-[72px] h-[72px] rounded-lg border border-dashed border-[#E5E5E5]",
                      "flex flex-col items-center justify-center gap-1",
                      "cursor-pointer hover:border-[#0A0A0A] transition-colors duration-150",
                      "bg-[#FAFAFA]",
                      uploadingLogo && "opacity-50 pointer-events-none",
                    )}
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo 预览"
                        className="w-full h-full rounded-lg object-contain"
                      />
                    ) : (
                      <>
                        {uploadingLogo ? (
                          <Loader2
                            size={20}
                            strokeWidth={1.75}
                            className="text-[#737373] animate-spin"
                          />
                        ) : (
                          <Building2
                            size={20}
                            strokeWidth={1.75}
                            className="text-[#A3A3A3]"
                          />
                        )}
                        <span className="text-[10px] text-[#A3A3A3]">
                          点击上传
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] leading-[1.5] text-[#737373]">
                      支持 PNG/JPG，不超过 2MB
                    </span>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoPreview("");
                          updateField("logoUrl", "");
                        }}
                        className="text-[11px] text-[#737373] hover:text-[#B42318] transition-colors duration-150 self-start"
                      >
                        移除 Logo
                      </button>
                    )}
                  </div>

                  {/* 隐藏的文件输入 */}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </FormRow>

              {/* 联系邮箱 */}
              <FormRow label="联系邮箱">
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => updateField("contactEmail", e.target.value)}
                  placeholder="admin@steel-agent.com"
                  className={cn(
                    "h-9 rounded-[10px] border-[#E5E5E5] bg-white",
                    "text-[13px] leading-[1.5] text-[#0A0A0A]",
                    "placeholder:text-[#A3A3A3]",
                    "focus-visible:border-[#0A0A0A] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/5",
                  )}
                />
              </FormRow>

              {/* 联系电话 */}
              <FormRow label="联系电话">
                <Input
                  value={form.contactPhone}
                  onChange={(e) => updateField("contactPhone", e.target.value)}
                  placeholder="400-888-8888"
                  className={cn(
                    "h-9 rounded-[10px] border-[#E5E5E5] bg-white",
                    "text-[13px] leading-[1.5] text-[#0A0A0A]",
                    "placeholder:text-[#A3A3A3]",
                    "focus-visible:border-[#0A0A0A] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/5",
                  )}
                />
              </FormRow>
            </div>
          </div>

          {/* ============================================================ */}
          {/* Section 2: 通知配置 */}
          {/* ============================================================ */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden">
            {/* 卡片标题 */}
            <div className="flex items-center gap-2 px-5 pt-5 pb-2">
              <Bell size={16} strokeWidth={1.75} className="text-[#0A0A0A]" />
              <h2 className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A]">
                通知配置
              </h2>
            </div>

            <div className="px-5 pb-5 divide-y divide-[#E5E5E5]">
              {/* ---- 邮件通知 ---- */}
              <div className="py-3">
                <FormRow label="邮件通知">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={form.emailEnabled}
                      onCheckedChange={(v) => updateField("emailEnabled", v)}
                      className="data-[state=checked]:bg-[#0A0A0A]"
                    />
                    <span className="text-[13px] leading-[1.5] text-[#737373]">
                      {form.emailEnabled ? "启用" : "关闭"}
                    </span>
                  </div>
                </FormRow>

                {/* 邮件详细配置（启用时显示） */}
                {form.emailEnabled && (
                  <div className="mt-1 ml-0 space-y-0 divide-y divide-[#E5E5E5]">
                    {/* SMTP 服务器 */}
                    <FormRow label="SMTP 服务器">
                      <Input
                        value={form.smtpServer}
                        onChange={(e) =>
                          updateField("smtpServer", e.target.value)
                        }
                        placeholder="smtp.exmail.qq.com"
                        className={cn(
                          "h-9 rounded-[10px] border-[#E5E5E5] bg-white",
                          "text-[13px] leading-[1.5] text-[#0A0A0A]",
                          "placeholder:text-[#A3A3A3]",
                          "focus-visible:border-[#0A0A0A] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/5",
                        )}
                      />
                    </FormRow>

                    {/* 端口 + 加密 */}
                    <FormRow label="端口">
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          value={form.smtpPort === 0 ? "" : form.smtpPort}
                          onChange={(e) =>
                            updateField(
                              "smtpPort",
                              e.target.value === "" ? 0 : Number(e.target.value),
                            )
                          }
                          placeholder="465"
                          className={cn(
                            "h-9 w-[120px] rounded-[10px] border-[#E5E5E5] bg-white",
                            "text-[13px] leading-[1.5] text-[#0A0A0A]",
                            "placeholder:text-[#A3A3A3]",
                            "focus-visible:border-[#0A0A0A] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/5",
                          )}
                        />
                        <span className="text-[13px] text-[#737373]">
                          加密：
                        </span>
                        <Select
                          value={form.smtpEncryption}
                          onValueChange={(v) =>
                            updateField("smtpEncryption", v as SmtpEncryption)
                          }
                        >
                          <SelectTrigger
                            variant="filter"
                            className="h-9 w-[120px] text-[13px] leading-[1.5]"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent variant="filter">
                            {SMTP_ENCRYPTIONS.map((opt) => (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                                className="text-[13px]"
                              >
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </FormRow>

                    {/* 发件邮箱 */}
                    <FormRow label="发件邮箱">
                      <Input
                        value={form.smtpEmail}
                        onChange={(e) =>
                          updateField("smtpEmail", e.target.value)
                        }
                        placeholder="noreply@steel-agent.com"
                        className={cn(
                          "h-9 rounded-[10px] border-[#E5E5E5] bg-white",
                          "text-[13px] leading-[1.5] text-[#0A0A0A]",
                          "placeholder:text-[#A3A3A3]",
                          "focus-visible:border-[#0A0A0A] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/5",
                        )}
                      />
                    </FormRow>

                    {/* 密码 + 测试发送 */}
                    <FormRow label="密码">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <Input
                            type={showSmtpPassword ? "text" : "password"}
                            value={form.smtpPassword}
                            onChange={(e) =>
                              updateField("smtpPassword", e.target.value)
                            }
                            placeholder="输入 SMTP 密码"
                            className={cn(
                              "h-9 rounded-[10px] border-[#E5E5E5] bg-white pr-9",
                              "text-[13px] leading-[1.5] text-[#0A0A0A]",
                              "placeholder:text-[#A3A3A3]",
                              "focus-visible:border-[#0A0A0A] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/5",
                            )}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowSmtpPassword(!showSmtpPassword)
                            }
                            className={cn(
                              "absolute right-2 top-1/2 -translate-y-1/2",
                              "p-1 rounded hover:bg-[#F5F5F5] transition-colors duration-150",
                            )}
                            aria-label={
                              showSmtpPassword ? "隐藏密码" : "显示密码"
                            }
                          >
                            {showSmtpPassword ? (
                              <EyeOff
                                size={16}
                                strokeWidth={1.75}
                                className="text-[#737373]"
                              />
                            ) : (
                              <Eye
                                size={16}
                                strokeWidth={1.75}
                                className="text-[#737373]"
                              />
                            )}
                          </button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTestEmail}
                          disabled={testingEmail}
                          className={cn(
                            "h-9 px-4 rounded-full",
                            "border border-[#E5E5E5] bg-white",
                            "text-[13px] leading-[1.5] text-[#0A0A0A]",
                            "hover:bg-[#FAFAFA]",
                            "transition-colors duration-150",
                            "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                          )}
                        >
                          {testingEmail ? (
                            <span className="flex items-center gap-1.5">
                              <Loader2
                                size={12}
                                strokeWidth={1.75}
                                className="animate-spin"
                              />
                              发送中...
                            </span>
                          ) : (
                            "测试发送"
                          )}
                        </Button>
                      </div>
                    </FormRow>
                  </div>
                )}
              </div>

              {/* ---- 短信通知 ---- */}
              <div className="py-3">
                <FormRow label="短信通知">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={form.smsEnabled}
                      onCheckedChange={(v) => updateField("smsEnabled", v)}
                      className="data-[state=checked]:bg-[#0A0A0A]"
                    />
                    <span className="text-[13px] leading-[1.5] text-[#737373]">
                      {form.smsEnabled ? "启用" : "关闭"}
                    </span>
                  </div>
                </FormRow>

                {/* 短信详细配置（启用时显示） */}
                {form.smsEnabled && (
                  <div className="mt-1 ml-0 space-y-0 divide-y divide-[#E5E5E5]">
                    {/* 短信服务商 */}
                    <FormRow label="短信服务商">
                      <Select
                        value={form.smsProvider}
                        onValueChange={(v) => updateField("smsProvider", v)}
                      >
                        <SelectTrigger
                          variant="filter"
                          className="h-9 w-[280px] text-[13px] leading-[1.5]"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent variant="filter">
                          {SMS_PROVIDERS.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-[13px]"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormRow>

                    {/* AccessKey ID */}
                    <FormRow label="AccessKey ID">
                      <div className="relative">
                        <Input
                          type={showSmsAccessKey ? "text" : "password"}
                          value={form.smsAccessKey}
                          onChange={(e) =>
                            updateField("smsAccessKey", e.target.value)
                          }
                          placeholder="输入 AccessKey ID"
                          className={cn(
                            "h-9 rounded-[10px] border-[#E5E5E5] bg-white pr-9",
                            "text-[13px] leading-[1.5] text-[#0A0A0A]",
                            "placeholder:text-[#A3A3A3]",
                            "focus-visible:border-[#0A0A0A] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/5",
                          )}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowSmsAccessKey(!showSmsAccessKey)
                          }
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2",
                            "p-1 rounded hover:bg-[#F5F5F5] transition-colors duration-150",
                          )}
                          aria-label={
                            showSmsAccessKey ? "隐藏 AccessKey ID" : "显示 AccessKey ID"
                          }
                        >
                          {showSmsAccessKey ? (
                            <EyeOff
                              size={16}
                              strokeWidth={1.75}
                              className="text-[#737373]"
                            />
                          ) : (
                            <Eye
                              size={16}
                              strokeWidth={1.75}
                              className="text-[#737373]"
                            />
                          )}
                        </button>
                      </div>
                    </FormRow>

                    {/* AccessKey Secret */}
                    <FormRow label="AccessKey Secret">
                      <div className="relative">
                        <Input
                          type={showSmsAccessSecret ? "text" : "password"}
                          value={form.smsAccessSecret}
                          onChange={(e) =>
                            updateField("smsAccessSecret", e.target.value)
                          }
                          placeholder="输入 AccessKey Secret"
                          className={cn(
                            "h-9 rounded-[10px] border-[#E5E5E5] bg-white pr-9",
                            "text-[13px] leading-[1.5] text-[#0A0A0A]",
                            "placeholder:text-[#A3A3A3]",
                            "focus-visible:border-[#0A0A0A] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/5",
                          )}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowSmsAccessSecret(!showSmsAccessSecret)
                          }
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2",
                            "p-1 rounded hover:bg-[#F5F5F5] transition-colors duration-150",
                          )}
                          aria-label={
                            showSmsAccessSecret ? "隐藏 AccessKey Secret" : "显示 AccessKey Secret"
                          }
                        >
                          {showSmsAccessSecret ? (
                            <EyeOff
                              size={16}
                              strokeWidth={1.75}
                              className="text-[#737373]"
                            />
                          ) : (
                            <Eye
                              size={16}
                              strokeWidth={1.75}
                              className="text-[#737373]"
                            />
                          )}
                        </button>
                      </div>
                    </FormRow>

                    {/* 签名名称 */}
                    <FormRow label="签名名称（SignName）">
                      <Input
                        value={form.smsSignName}
                        onChange={(e) =>
                          updateField("smsSignName", e.target.value)
                        }
                        placeholder="系统赠送的签名名称，如：速通互联验证码"
                        className={cn(
                          "h-9 rounded-[10px] border-[#E5E5E5] bg-white",
                          "text-[13px] leading-[1.5] text-[#0A0A0A]",
                          "placeholder:text-[#A3A3A3]",
                          "focus-visible:border-[#0A0A0A] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/5",
                        )}
                      />
                      <p className="text-[11px] text-[#737373] mt-1">
                        必须使用阿里云系统赠送的签名名称，不支持自定义签名
                      </p>
                    </FormRow>

                    {/* 模板编号 */}
                    <FormRow label="模板编号（TemplateCode）">
                      <Input
                        value={form.smsTemplateCode}
                        onChange={(e) =>
                          updateField("smsTemplateCode", e.target.value)
                        }
                        placeholder="阿里云控制台中的模板编号"
                        className={cn(
                          "h-9 rounded-[10px] border-[#E5E5E5] bg-white",
                          "text-[13px] leading-[1.5] text-[#0A0A0A]",
                          "placeholder:text-[#A3A3A3]",
                          "focus-visible:border-[#0A0A0A] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/5",
                        )}
                      />
                    </FormRow>

                    {/* 测试短信发送 */}
                    <div className="py-3">
                      <span className="block text-[13px] leading-[1.5] text-[#404040] font-medium mb-2">
                        测试发送
                      </span>
                      <div className="flex items-center gap-2">
                        <Input
                          value={testSmsPhone}
                          onChange={(e) => setTestSmsPhone(e.target.value)}
                          placeholder="输入测试手机号"
                          className={cn(
                            "h-9 rounded-[10px] border-[#E5E5E5] bg-white flex-1 max-w-[200px]",
                            "text-[13px] leading-[1.5] text-[#0A0A0A]",
                            "placeholder:text-[#A3A3A3]",
                            "focus-visible:border-[#0A0A0A] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/5",
                          )}
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={testingSms || !testSmsPhone}
                          onClick={async () => {
                            setTestingSms(true);
                            try {
                              const result = await testSms(testSmsPhone);
                              if (result.success) {
                                showSuccessToast(result.message);
                              } else {
                                showErrorToast(result.message);
                              }
                            } catch {
                              showErrorToast("短信测试发送失败");
                            } finally {
                              setTestingSms(false);
                            }
                          }}
                          className="h-9 rounded-[10px] bg-[#0A0A0A] text-white hover:bg-[#404040] text-[13px] px-4"
                        >
                          {testingSms ? (
                            <Loader2 size={14} strokeWidth={1.75} className="animate-spin mr-1" />
                          ) : null}
                          发送测试短信
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* Section 3: 安全设置 */}
          {/* ============================================================ */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden">
            {/* 卡片标题 */}
            <div className="flex items-center gap-2 px-5 pt-5 pb-2">
              <Shield
                size={16}
                strokeWidth={1.75}
                className="text-[#0A0A0A]"
              />
              <h2 className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A]">
                安全设置
              </h2>
            </div>

            <div className="px-5 pb-5 divide-y divide-[#E5E5E5]">
              {/* 会话超时时间 */}
              <FormRow
                label="会话超时时间（分钟）"
                hint="超时后需重新登录"
              >
                <Input
                  type="number"
                  value={
                    form.sessionTimeout === 0 ? "" : form.sessionTimeout
                  }
                  onChange={(e) =>
                    updateField(
                      "sessionTimeout",
                      e.target.value === "" ? 0 : Number(e.target.value),
                    )
                  }
                  min={1}
                  max={1440}
                  className={cn(
                    "h-9 w-[120px] rounded-[10px] border-[#E5E5E5] bg-white",
                    "text-[13px] leading-[1.5] text-[#0A0A0A]",
                    "focus-visible:border-[#0A0A0A] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/5",
                  )}
                />
              </FormRow>

              {/* 登录失败锁定次数 */}
              <FormRow
                label="登录失败锁定次数"
                hint="连续失败 N 次后锁定账号"
              >
                <Input
                  type="number"
                  value={
                    form.loginLockCount === 0 ? "" : form.loginLockCount
                  }
                  onChange={(e) =>
                    updateField(
                      "loginLockCount",
                      e.target.value === "" ? 0 : Number(e.target.value),
                    )
                  }
                  min={1}
                  max={20}
                  className={cn(
                    "h-9 w-[120px] rounded-[10px] border-[#E5E5E5] bg-white",
                    "text-[13px] leading-[1.5] text-[#0A0A0A]",
                    "focus-visible:border-[#0A0A0A] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/5",
                  )}
                />
              </FormRow>

              {/* IP 白名单 */}
              <div className="py-3">
                <FormRow label="IP 白名单">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={form.ipWhitelistEnabled}
                      onCheckedChange={(v) =>
                        updateField("ipWhitelistEnabled", v)
                      }
                      className="data-[state=checked]:bg-[#0A0A0A]"
                    />
                    <span className="text-[13px] leading-[1.5] text-[#737373]">
                      {form.ipWhitelistEnabled
                        ? "已启用 IP 白名单"
                        : "关闭"}
                    </span>
                  </div>
                </FormRow>

                {/* IP 详细配置（启用时显示） */}
                {form.ipWhitelistEnabled && (
                  <div className="mt-1 ml-0 space-y-3">
                    {/* 已有 IP 列表 */}
                    {form.ipWhitelist.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {form.ipWhitelist.map((ip) => (
                          <span
                            key={ip}
                            className={cn(
                              "inline-flex items-center gap-1.5",
                              "h-7 px-2.5 rounded-full",
                              "border border-[#E5E5E5] bg-[#FAFAFA]",
                              "text-[11px] leading-[1.5] text-[#404040] font-mono",
                            )}
                          >
                            {ip}
                            <button
                              type="button"
                              onClick={() => removeIp(ip)}
                              className={cn(
                                "p-0.5 rounded-full",
                                "hover:bg-[#E5E5E5] transition-colors duration-150",
                              )}
                              aria-label={`移除 IP ${ip}`}
                            >
                              <X
                                size={12}
                                strokeWidth={1.75}
                                className="text-[#A3A3A3]"
                              />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 添加 IP */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={newIp}
                        onChange={(e) => setNewIp(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addIp();
                          }
                        }}
                        placeholder="输入 IP 地址，如 192.168.1.100"
                        className={cn(
                          "h-8 flex-1 rounded-[10px] border-[#E5E5E5] bg-white",
                          "text-[12px] leading-[1.5] text-[#0A0A0A] font-mono",
                          "placeholder:text-[#A3A3A3]",
                          "focus-visible:border-[#0A0A0A] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/5",
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addIp}
                        disabled={!newIp.trim()}
                        className={cn(
                          "h-8 px-3 rounded-full shrink-0",
                          "border border-[#E5E5E5] bg-white",
                          "text-[12px] leading-[1.5] text-[#0A0A0A]",
                          "hover:bg-[#FAFAFA]",
                          "transition-colors duration-150",
                          "disabled:opacity-40 disabled:cursor-not-allowed",
                        )}
                      >
                        <Plus size={14} strokeWidth={1.75} />
                        <span className="ml-1">添加 IP</span>
                      </Button>
                    </div>

                    {/* 说明文字 */}
                    <p className="text-[11px] leading-[1.5] text-[#737373]">
                      仅允许白名单内的 IP 访问管理后台，每行一个 IP 地址
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 安全设置警告横幅 */}
            <div
              className={cn(
                "mx-5 mb-5 flex items-start gap-2",
                "px-3 py-2.5 rounded-[10px]",
                "bg-[#FFFBEB] border border-[#FDE68A]",
              )}
            >
              <TriangleAlert
                size={14}
                strokeWidth={1.75}
                className="text-[#B45309] mt-[2px] shrink-0"
              />
              <p className="text-[12px] leading-[1.5] text-[#B45309]">
                修改安全设置后，当前会话将失效，需重新登录
              </p>
            </div>
          </div>
        </div>
      </AdminPageShell>

      {/* ============================================================ */}
      {/* 安全设置保存确认弹窗 */}
      {/* ============================================================ */}
      <AdminModal
        open={showSecurityWarning}
        onOpenChange={(open) => {
          setShowSecurityWarning(open);
          if (!open) setPendingSave(false);
        }}
        title="确认修改安全设置"
        description="您正在修改安全相关配置（会话超时、登录锁定、IP白名单），保存后将导致当前会话失效，需要重新登录。确定要继续吗？"
        confirmLabel="确认保存"
        cancelLabel="取消"
        variant="destructive"
        loading={saving}
        onConfirm={handleSecurityConfirm}
      />
    </>
  );
}
