"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Lock, MessageCircle, Bell } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

import { sendSmsCode, loginByCode, loginByPassword } from "@/app/api/auth";
import { useAuthStore } from "@/app/stores/authStore";
import { useCountdown } from "@/app/hooks/useCountdown";
import {
  PHONE_REGEX,
  CODE_REGEX,
  PASSWORD_REGEX,
  SMS_COUNTDOWN_SECONDS,
  PHONE_MAX_LENGTH,
  CODE_MAX_LENGTH,
} from "@/app/constants/auth";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CodeFormValues {
  phone: string;
  code: string;
}

interface PasswordFormValues {
  phone: string;
  password: string;
}

const INPUT_CLASS =
  "rounded-[10px] border-steel-line bg-steel-canvas px-4 h-12 text-[15px] leading-[1.6] placeholder:text-steel-placeholder focus-visible:border-steel-ink focus-visible:ring-4 focus-visible:ring-steel-ink/5";

export default function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const setTokens = useAuthStore((s) => s.setTokens);
  const { countdown, startCountdown, resetCountdown } = useCountdown();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const codeForm = useForm<CodeFormValues>({
    defaultValues: { phone: "", code: "" },
  });

  const passwordForm = useForm<PasswordFormValues>({
    defaultValues: { phone: "", password: "" },
  });

  useEffect(() => {
    if (!open) {
      codeForm.reset();
      passwordForm.reset();
      resetCountdown();
      setIsSubmitting(false);
    }
  }, [open, codeForm, passwordForm, resetCountdown]);

  const handleSendSms = async () => {
    const valid = await codeForm.trigger("phone");
    if (!valid) return;

    const phone = codeForm.getValues("phone");
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

  const onCodeSubmit = async (values: CodeFormValues) => {
    setIsSubmitting(true);
    try {
      const data = await loginByCode(values.phone, values.code);
      setTokens(data.access_token, data.refresh_token);
      toast.success("登录成功");
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "登录失败，请稍后重试";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    setIsSubmitting(true);
    try {
      const data = await loginByPassword(values.phone, values.password);
      setTokens(data.access_token, data.refresh_token);
      toast.success("登录成功");
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "登录失败，请稍后重试";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        className="sm:max-w-[400px] p-6 gap-5 rounded-2xl border-steel-line !shadow-none"
      >
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="flex items-center gap-2.5 text-steel-ink text-[18px] leading-[1.4] font-medium">
            <div className="w-8 h-8 rounded-[10px] bg-steel-surface border border-steel-line flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4 text-steel-ink" strokeWidth={1.75} />
            </div>
            登录后继续操作
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-[1.5]">
            登录后即可使用AI对话、查看行情数据、智能报价等全部功能
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="code" className="w-full">
          <TabsList className="w-full bg-transparent border-b border-steel-line rounded-none h-auto p-0 gap-0">
            <TabsTrigger
              value="code"
              className="relative flex-1 rounded-none border-0 border-b-2 border-transparent bg-transparent py-2.5 text-steel-muted text-[14px] leading-[1.5] font-normal shadow-none transition-all duration-200 hover:text-steel-body data-[state=active]:border-steel-ink data-[state=active]:text-steel-ink data-[state=active]:font-medium"
            >
              验证码登录
            </TabsTrigger>
            <TabsTrigger
              value="password"
              className="relative flex-1 rounded-none border-0 border-b-2 border-transparent bg-transparent py-2.5 text-steel-muted text-[14px] leading-[1.5] font-normal shadow-none transition-all duration-200 hover:text-steel-body data-[state=active]:border-steel-ink data-[state=active]:text-steel-ink data-[state=active]:font-medium"
            >
              密码登录
            </TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="mt-5">
            <Form {...codeForm}>
              <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-4">
                <FormField
                  control={codeForm.control}
                  name="phone"
                  rules={{
                    required: "请输入手机号",
                    pattern: { value: PHONE_REGEX, message: "请输入有效的手机号" },
                  }}
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="手机号"
                          type="tel"
                          maxLength={PHONE_MAX_LENGTH}
                          aria-invalid={!!fieldState.error}
                          aria-describedby={fieldState.error ? "dlg-code-phone-error" : undefined}
                          className={INPUT_CLASS}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage id="dlg-code-phone-error" className="text-[12px] leading-[1.5]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={codeForm.control}
                  name="code"
                  rules={{
                    required: "请输入验证码",
                    pattern: { value: CODE_REGEX, message: "请输入6位数字验证码" },
                  }}
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex gap-2.5">
                          <Input
                            placeholder="验证码"
                            type="text"
                            maxLength={CODE_MAX_LENGTH}
                            aria-invalid={!!fieldState.error}
                            aria-describedby={fieldState.error ? "dlg-code-code-error" : undefined}
                            className={cn(INPUT_CLASS, "flex-1")}
                            {...field}
                          />
                          <Button
                            type="button"
                            disabled={countdown > 0}
                            onClick={handleSendSms}
                            className={cn(
                              "rounded-[10px] border border-steel-line bg-steel-canvas text-steel-ink hover:bg-steel-surface h-12 px-4 text-[13px] leading-[1.5] shrink-0 transition-colors duration-150",
                              countdown > 0 && "text-steel-muted bg-steel-surface",
                            )}
                          >
                            {countdown > 0 ? `${countdown}s` : "获取验证码"}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage id="dlg-code-code-error" className="text-[12px] leading-[1.5]" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-steel-ink text-steel-canvas hover:bg-steel-body rounded-full h-12 text-[15px] leading-[1.6] font-medium transition-all duration-200 disabled:opacity-50 active:scale-[0.97]"
                >
                  {isSubmitting ? "登录中..." : "登录/注册"}
                </Button>

                <div className="pt-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Separator className="flex-1 bg-steel-line" aria-hidden="true" />
                    <span className="text-[12px] text-steel-placeholder shrink-0 select-none">
                      其他登录方式
                    </span>
                    <Separator className="flex-1 bg-steel-line" aria-hidden="true" />
                  </div>

                  <div className="flex items-center justify-center gap-6">
                    <div className="flex flex-col items-center gap-1.5 opacity-40 cursor-not-allowed">
                      <div className="w-10 h-10 rounded-full bg-steel-surface border border-steel-line flex items-center justify-center">
                        <MessageCircle className="h-4 w-4 text-steel-muted" aria-hidden="true" />
                      </div>
                      <span className="text-[11px] leading-[1.5] text-steel-placeholder">微信</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 opacity-40 cursor-not-allowed">
                      <div className="w-10 h-10 rounded-full bg-steel-surface border border-steel-line flex items-center justify-center">
                        <Bell className="h-4 w-4 text-steel-muted" aria-hidden="true" />
                      </div>
                      <span className="text-[11px] leading-[1.5] text-steel-placeholder">钉钉</span>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="password" className="mt-5">
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="phone"
                  rules={{
                    required: "请输入手机号",
                    pattern: { value: PHONE_REGEX, message: "请输入有效的手机号" },
                  }}
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="手机号"
                          type="tel"
                          maxLength={PHONE_MAX_LENGTH}
                          aria-invalid={!!fieldState.error}
                          aria-describedby={fieldState.error ? "dlg-pwd-phone-error" : undefined}
                          className={INPUT_CLASS}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage id="dlg-pwd-phone-error" className="text-[12px] leading-[1.5]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="password"
                  rules={{
                    required: "请输入密码",
                    pattern: { value: PASSWORD_REGEX, message: "8-20位，包含字母和数字" },
                  }}
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="密码"
                          type="password"
                          aria-invalid={!!fieldState.error}
                          aria-describedby={fieldState.error ? "dlg-pwd-password-error" : undefined}
                          className={INPUT_CLASS}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage id="dlg-pwd-password-error" className="text-[12px] leading-[1.5]" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-steel-ink text-steel-canvas hover:bg-steel-body rounded-full h-12 text-[15px] leading-[1.6] font-medium transition-all duration-200 disabled:opacity-50 active:scale-[0.97]"
                >
                  {isSubmitting ? "登录中..." : "登录"}
                </Button>

                <div className="pt-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Separator className="flex-1 bg-steel-line" aria-hidden="true" />
                    <span className="text-[12px] text-steel-placeholder shrink-0 select-none">
                      其他登录方式
                    </span>
                    <Separator className="flex-1 bg-steel-line" aria-hidden="true" />
                  </div>

                  <div className="flex items-center justify-center gap-6">
                    <div className="flex flex-col items-center gap-1.5 opacity-40 cursor-not-allowed">
                      <div className="w-10 h-10 rounded-full bg-steel-surface border border-steel-line flex items-center justify-center">
                        <MessageCircle className="h-4 w-4 text-steel-muted" aria-hidden="true" />
                      </div>
                      <span className="text-[11px] leading-[1.5] text-steel-placeholder">微信</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 opacity-40 cursor-not-allowed">
                      <div className="w-10 h-10 rounded-full bg-steel-surface border border-steel-line flex items-center justify-center">
                        <Bell className="h-4 w-4 text-steel-muted" aria-hidden="true" />
                      </div>
                      <span className="text-[11px] leading-[1.5] text-steel-placeholder">钉钉</span>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        <p className="text-center text-[12px] leading-[1.5] text-steel-placeholder -mt-1">
          登录即表示同意
          <span
            role="button"
            tabIndex={0}
            aria-label="查看用户协议"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toast('用户协议页面即将开放'); } }}
            className="text-steel-ink underline cursor-pointer mx-0.5"
          >
            《用户协议》
          </span>
          和
          <span
            role="button"
            tabIndex={0}
            aria-label="查看隐私政策"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toast('隐私政策页面即将开放'); } }}
            className="text-steel-ink underline cursor-pointer mx-0.5"
          >
            《隐私政策》
          </span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
