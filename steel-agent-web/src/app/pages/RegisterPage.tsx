import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { sendSmsCode, register } from "@/app/api/auth";
import { useAuthStore } from "@/app/stores/authStore";
import { useCountdown } from "@/app/hooks/useCountdown";
import {
  PHONE_REGEX,
  CODE_REGEX,
  PASSWORD_REGEX,
  SMS_COUNTDOWN_SECONDS,
  PHONE_MAX_LENGTH,
  CODE_MAX_LENGTH,
  ROUTE,
} from "@/app/constants/auth";
import type { RegisterRequest } from "@/app/types/api";

interface RegisterFormValues {
  phone: string;
  code: string;
  password: string;
  confirmPassword: string;
  nickname: string;
  company: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const { countdown, startCountdown } = useCountdown();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RegisterFormValues>({
    defaultValues: {
      phone: "",
      code: "",
      password: "",
      confirmPassword: "",
      nickname: "",
      company: "",
    },
  });

  const handleSendSms = async () => {
    const valid = await form.trigger("phone");
    if (!valid) return;
    const phone = form.getValues("phone");
    try {
      await sendSmsCode(phone);
      toast.success("验证码已发送");
      startCountdown(SMS_COUNTDOWN_SECONDS);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "验证码发送失败，请稍后重试";
      toast.error(message);
    }
  };

  const onSubmit = async (values: RegisterFormValues) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload: RegisterRequest = {
        phone: values.phone,
        code: values.code,
        password: values.password,
      };
      if (values.nickname.trim()) payload.nickname = values.nickname.trim();
      if (values.company.trim()) payload.company = values.company.trim();

      const data = await register(payload);
      setTokens(data.access_token, data.refresh_token);
      toast.success("注册成功");
      navigate(ROUTE.CHAT, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "注册失败，请稍后重试";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col px-6 pt-4 pb-8">
      {/* 返回按钮 */}
      <button
        type="button"
        onClick={() => navigate(ROUTE.LOGIN)}
        className="w-10 h-10 flex items-center justify-center rounded-full text-steel-ink hover:bg-steel-surface transition-colors duration-150"
        aria-label="返回登录"
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
      </button>

      {/* 标题区 */}
      <div className="flex flex-col items-center mt-6 mb-10">
        <div className="w-16 h-16 rounded-2xl bg-steel-surface border border-steel-line flex items-center justify-center mb-4">
          <Sparkles className="h-10 w-10 text-steel-ink" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <h1 className="text-[24px] leading-[1.3] font-medium text-steel-ink">
          创建账号
        </h1>
        <p className="text-[15px] leading-[1.6] text-steel-muted mt-2">
          注册后即可使用全部功能
        </p>
      </div>

      {/* 表单 */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          {/* 手机号 */}
          <FormField
            control={form.control}
            name="phone"
            rules={{
              required: "请输入手机号",
              pattern: {
                value: PHONE_REGEX,
                message: "请输入正确的手机号",
              },
            }}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormControl>
                  <div className="flex items-center rounded-lg border border-steel-line bg-steel-canvas h-12 overflow-hidden">
                    <span className="pl-4 pr-2 text-[15px] text-steel-muted shrink-0" aria-hidden="true">
                      +86
                    </span>
                    <Input
                      placeholder="请输入手机号"
                      type="tel"
                      maxLength={PHONE_MAX_LENGTH}
                      aria-invalid={!!fieldState.error}
                      aria-describedby={fieldState.error ? "reg-phone-error" : undefined}
                      className="rounded-none border-0 bg-transparent px-1 h-full text-[15px] placeholder:text-steel-placeholder flex-1 focus-visible:ring-0"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage id="reg-phone-error" className="text-[12px]" role="alert" />
              </FormItem>
            )}
          />

          {/* 验证码 */}
          <FormField
            control={form.control}
            name="code"
            rules={{
              required: "请输入6位验证码",
              pattern: {
                value: CODE_REGEX,
                message: "请输入6位验证码",
              },
            }}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormControl>
                  <div className="flex gap-3">
                    <Input
                      placeholder="请输入验证码"
                      type="text"
                      maxLength={CODE_MAX_LENGTH}
                      aria-invalid={!!fieldState.error}
                      aria-describedby={fieldState.error ? "reg-code-error" : undefined}
                      className="rounded-lg border-steel-line bg-steel-canvas px-4 h-12 text-[15px] placeholder:text-steel-placeholder flex-1"
                      {...field}
                    />
                    <Button
                      type="button"
                      disabled={countdown > 0}
                      onClick={handleSendSms}
                      aria-label={countdown > 0 ? `${countdown}s后重试` : "获取验证码"}
                      className="rounded-sm border border-steel-line bg-steel-canvas text-steel-ink hover:bg-steel-surface h-12 px-4 text-[12px] shrink-0 disabled:text-steel-placeholder"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      {countdown > 0 ? `${countdown}s后重试` : "获取验证码"}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage id="reg-code-error" className="text-[12px]" role="alert" />
              </FormItem>
            )}
          />

          {/* 设置密码 */}
          <FormField
            control={form.control}
            name="password"
            rules={{
              required: "请设置密码",
              pattern: {
                value: PASSWORD_REGEX,
                message: "密码需8-20位，包含字母和数字",
              },
            }}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="设置密码（8-20位，含字母和数字）"
                    type="password"
                    aria-invalid={!!fieldState.error}
                    aria-describedby={fieldState.error ? "reg-password-error" : undefined}
                    className="rounded-lg border-steel-line bg-steel-canvas px-4 h-12 text-[15px] placeholder:text-steel-placeholder"
                    {...field}
                  />
                </FormControl>
                <FormMessage id="reg-password-error" className="text-[12px]" role="alert" />
              </FormItem>
            )}
          />

          {/* 确认密码 */}
          <FormField
            control={form.control}
            name="confirmPassword"
            rules={{
              required: "请再次输入密码",
              validate: (value) =>
                value === form.getValues("password") || "两次输入的密码不一致",
            }}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="确认密码"
                    type="password"
                    aria-invalid={!!fieldState.error}
                    aria-describedby={fieldState.error ? "reg-confirm-error" : undefined}
                    className="rounded-lg border-steel-line bg-steel-canvas px-4 h-12 text-[15px] placeholder:text-steel-placeholder"
                    {...field}
                  />
                </FormControl>
                <FormMessage id="reg-confirm-error" className="text-[12px]" role="alert" />
              </FormItem>
            )}
          />

          {/* 昵称（可选） */}
          <FormField
            control={form.control}
            name="nickname"
            rules={{
              maxLength: {
                value: 50,
                message: "昵称不超过50个字符",
              },
            }}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="昵称（选填）"
                    type="text"
                    maxLength={50}
                    aria-invalid={!!fieldState.error}
                    aria-describedby={fieldState.error ? "reg-nickname-error" : undefined}
                    className="rounded-lg border-steel-line bg-steel-canvas px-4 h-12 text-[15px] placeholder:text-steel-placeholder"
                    {...field}
                  />
                </FormControl>
                <FormMessage id="reg-nickname-error" className="text-[12px]" role="alert" />
              </FormItem>
            )}
          />

          {/* 公司名称（可选） */}
          <FormField
            control={form.control}
            name="company"
            rules={{
              maxLength: {
                value: 100,
                message: "公司名称不超过100个字符",
              },
            }}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="公司名称（选填）"
                    type="text"
                    maxLength={100}
                    aria-invalid={!!fieldState.error}
                    aria-describedby={fieldState.error ? "reg-company-error" : undefined}
                    className="rounded-lg border-steel-line bg-steel-canvas px-4 h-12 text-[15px] placeholder:text-steel-placeholder"
                    {...field}
                  />
                </FormControl>
                <FormMessage id="reg-company-error" className="text-[12px]" role="alert" />
              </FormItem>
            )}
          />

          {/* 注册按钮 */}
          <div className="pt-3">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-steel-ink text-steel-canvas hover:bg-steel-body rounded-full h-12 text-[15px] disabled:opacity-50"
            >
              {submitting ? "注册中..." : "注册"}
            </Button>
          </div>
        </form>
      </Form>

      {/* 底部跳转 */}
      <div className="mt-auto pt-8 text-center">
        <p className="text-[15px] leading-[1.6] text-steel-muted">
          已有账号？
          <button
            type="button"
            onClick={() => navigate(ROUTE.LOGIN)}
            aria-label="去登录"
            className="text-steel-ink underline underline-offset-2 hover:text-steel-body transition-colors duration-150"
          >
            去登录
          </button>
        </p>
      </div>
    </div>
  );
}
