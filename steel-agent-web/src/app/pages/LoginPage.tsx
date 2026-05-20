import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Building2, MessageCircle, Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
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
  ROUTE,
} from "@/app/constants/auth";

interface CodeFormValues {
  phone: string;
  code: string;
}

interface PasswordFormValues {
  phone: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const { countdown, startCountdown } = useCountdown();

  const codeForm = useForm<CodeFormValues>({
    defaultValues: { phone: "", code: "" },
  });

  const passwordForm = useForm<PasswordFormValues>({
    defaultValues: { phone: "", password: "" },
  });

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
    try {
      const data = await loginByCode(values.phone, values.code);
      setTokens(data.access_token, data.refresh_token);
      navigate(ROUTE.CHAT);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "登录失败，请稍后重试";
      toast.error(message);
    }
  };

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    try {
      const data = await loginByPassword(values.phone, values.password);
      setTokens(data.access_token, data.refresh_token);
      navigate(ROUTE.CHAT);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "登录失败，请稍后重试";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col px-6 pt-16 pb-8">
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-steel-surface border border-steel-line flex items-center justify-center mb-4">
          <Building2 className="h-12 w-12 text-steel-ink" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h1 className="text-[24px] leading-[1.3] font-medium text-steel-ink">
          钢铁行业智能助手
        </h1>
      </div>

      <Tabs defaultValue="code" className="w-full">
        <TabsList className="w-full bg-transparent border-b border-steel-line rounded-none h-auto p-0 gap-8">
          <TabsTrigger
            value="code"
            className="relative rounded-none border-0 border-b-2 border-transparent bg-transparent px-1 py-3 text-steel-muted text-[15px] font-normal shadow-none transition-colors duration-200 hover:text-steel-body data-[state=active]:border-steel-ink data-[state=active]:text-steel-ink data-[state=active]:font-medium"
          >
            验证码登录
          </TabsTrigger>
          <TabsTrigger
            value="password"
            className="relative rounded-none border-0 border-b-2 border-transparent bg-transparent px-1 py-3 text-steel-muted text-[15px] font-normal shadow-none transition-colors duration-200 hover:text-steel-body data-[state=active]:border-steel-ink data-[state=active]:text-steel-ink data-[state=active]:font-medium"
          >
            密码登录
          </TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="mt-6">
          <Form {...codeForm}>
            <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-5">
              <FormField
                control={codeForm.control}
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
                      <Input
                        placeholder="请输入手机号"
                        type="tel"
                        maxLength={PHONE_MAX_LENGTH}
                        aria-invalid={!!fieldState.error}
                        aria-describedby={fieldState.error ? "code-phone-error" : undefined}
                        className="rounded-lg border-steel-line bg-steel-canvas px-4 h-12 text-[15px] placeholder:text-steel-placeholder"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage id="code-phone-error" className="text-[12px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={codeForm.control}
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
                          aria-describedby={fieldState.error ? "code-code-error" : undefined}
                          className="rounded-lg border-steel-line bg-steel-canvas px-4 h-12 text-[15px] placeholder:text-steel-placeholder flex-1"
                          {...field}
                        />
                        <Button
                          type="button"
                          disabled={countdown > 0}
                          onClick={handleSendSms}
                          className={cn(
                            "rounded-sm border border-steel-line bg-steel-canvas text-steel-ink hover:bg-steel-surface h-12 px-4 text-[12px] shrink-0",
                            countdown > 0 && "text-steel-placeholder"
                          )}
                        >
                          <MessageCircle className="h-4 w-4" />
                          {countdown > 0 ? `${countdown}s后重试` : "获取验证码"}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage id="code-code-error" className="text-[12px]" />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <div className="flex items-center gap-3 mb-4">
                  <Separator className="flex-1 bg-steel-line" aria-hidden="true" />
                  <span className="text-[12px] text-steel-placeholder shrink-0">
                    其他登录方式
                  </span>
                  <Separator className="flex-1 bg-steel-line" aria-hidden="true" />
                </div>

                <div className="flex items-center justify-center gap-8">
                  <div className="flex flex-col items-center gap-1 opacity-50">
                    <div className="w-10 h-10 rounded-full bg-steel-surface border border-steel-line flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-steel-muted" aria-hidden="true" />
                    </div>
                    <span className="text-[12px] text-steel-placeholder">
                      微信
                    </span>
                    <span className="text-[11px] text-steel-placeholder">
                      (即将开放)
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1 opacity-50">
                    <div className="w-10 h-10 rounded-full bg-steel-surface border border-steel-line flex items-center justify-center">
                      <Bell className="h-5 w-5 text-steel-muted" aria-hidden="true" />
                    </div>
                    <span className="text-[12px] text-steel-placeholder">
                      钉钉
                    </span>
                    <span className="text-[11px] text-steel-placeholder">
                      (即将开放)
                    </span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-steel-ink text-steel-canvas hover:bg-steel-body rounded-full h-12 text-[15px]"
              >
                登录/注册
              </Button>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="password" className="mt-6">
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5">
              <FormField
                control={passwordForm.control}
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
                      <Input
                        placeholder="请输入手机号"
                        type="tel"
                        maxLength={PHONE_MAX_LENGTH}
                        aria-invalid={!!fieldState.error}
                        aria-describedby={fieldState.error ? "pwd-phone-error" : undefined}
                        className="rounded-lg border-steel-line bg-steel-canvas px-4 h-12 text-[15px] placeholder:text-steel-placeholder"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage id="pwd-phone-error" className="text-[12px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="password"
                rules={{
                  required: "请输入密码",
                  pattern: {
                    value: PASSWORD_REGEX,
                    message: "密码需8-20位，包含字母和数字",
                  },
                }}
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="请输入密码"
                        type="password"
                        aria-invalid={!!fieldState.error}
                        aria-describedby={fieldState.error ? "pwd-password-error" : undefined}
                        className="rounded-lg border-steel-line bg-steel-canvas px-4 h-12 text-[15px] placeholder:text-steel-placeholder"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage id="pwd-password-error" className="text-[12px]" />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <div className="flex items-center gap-3 mb-4">
                  <Separator className="flex-1 bg-steel-line" aria-hidden="true" />
                  <span className="text-[12px] text-steel-placeholder shrink-0">
                    其他登录方式
                  </span>
                  <Separator className="flex-1 bg-steel-line" aria-hidden="true" />
                </div>

                <div className="flex items-center justify-center gap-8">
                  <div className="flex flex-col items-center gap-1 opacity-50">
                    <div className="w-10 h-10 rounded-full bg-steel-surface border border-steel-line flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-steel-muted" aria-hidden="true" />
                    </div>
                    <span className="text-[12px] text-steel-placeholder">
                      微信
                    </span>
                    <span className="text-[11px] text-steel-placeholder">
                      (即将开放)
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1 opacity-50">
                    <div className="w-10 h-10 rounded-full bg-steel-surface border border-steel-line flex items-center justify-center">
                      <Bell className="h-5 w-5 text-steel-muted" aria-hidden="true" />
                    </div>
                    <span className="text-[12px] text-steel-placeholder">
                      钉钉
                    </span>
                    <span className="text-[11px] text-steel-placeholder">
                      (即将开放)
                    </span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-steel-ink text-steel-canvas hover:bg-steel-body rounded-full h-12 text-[15px]"
              >
                登录
              </Button>
            </form>
          </Form>
        </TabsContent>
      </Tabs>

      <div className="mt-auto pt-8 text-center">
        <p className="text-[12px] leading-[1.5] text-steel-placeholder">
          登录即表示同意
          <span
            role="button"
            tabIndex={0}
            aria-label="查看用户协议"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); } }}
            className="text-steel-ink underline cursor-pointer"
          >
            《用户协议》
          </span>
          和
          <span
            role="button"
            tabIndex={0}
            aria-label="查看隐私政策"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); } }}
            className="text-steel-ink underline cursor-pointer"
          >
            《隐私政策》
          </span>
        </p>
      </div>
    </div>
  );
}
