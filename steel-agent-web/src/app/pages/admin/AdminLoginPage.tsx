import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { adminLogin } from "@/app/api/admin-auth";
import { ROUTE } from "@/app/constants/auth";

interface AdminLoginFormValues {
  username: string;
  password: string;
}

export default function AdminLoginPage() {
  const navigate = useNavigate();

  const form = useForm<AdminLoginFormValues>({
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (values: AdminLoginFormValues) => {
    try {
      const data = await adminLogin(values.username.trim(), values.password);

      const stored = {
        state: {
          access_token: data.token,
          refresh_token: "",
          isAuthenticated: true,
        },
        version: 0,
      };
      localStorage.setItem("auth-storage", JSON.stringify(stored));

      navigate(ROUTE.ADMIN, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "登录失败，请稍后重试";

      if (message.includes("锁定")) {
        const secondsMatch = message.match(/(\d+)/);
        const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 60;
        const remaining = Math.max(1, seconds);
        form.setError("root", {
          message: `账号已被锁定，请${remaining}秒后重试`,
        });
      } else if (message.includes("密码错误")) {
        form.setError("password", { message });
        form.setError("root", { message });
      } else if (message.includes("账号")) {
        form.setError("username", { message });
        form.setError("root", { message });
      } else {
        form.setError("root", { message });
        toast.error(message);
      }
    }
  };

  const isSubmitting = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.message;

  return (
    <div className="min-h-screen bg-steel-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] rounded-2xl border border-steel-line bg-white p-8">
        <h1 className="text-[24px] leading-[1.3] font-medium text-steel-ink text-center mb-2">
          钢铁 Agent 管理后台
        </h1>
        <p className="text-[14px] text-steel-muted text-center mb-8">
          管理员登录
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              rules={{ required: "请输入管理员账号" }}
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="请输入管理员账号"
                      type="text"
                      aria-invalid={!!fieldState.error}
                      aria-describedby={
                        fieldState.error ? "admin-username-error" : undefined
                      }
                      disabled={isSubmitting}
                      className="rounded-lg border-steel-line bg-steel-canvas px-4 h-12 text-[15px] placeholder:text-steel-placeholder"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage
                    id="admin-username-error"
                    className="text-[12px]"
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              rules={{ required: "请输入密码" }}
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="请输入密码"
                      type="password"
                      aria-invalid={!!fieldState.error}
                      aria-describedby={
                        fieldState.error
                          ? "admin-password-error"
                          : undefined
                      }
                      disabled={isSubmitting}
                      className="rounded-lg border-steel-line bg-steel-canvas px-4 h-12 text-[15px] placeholder:text-steel-placeholder"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage
                    id="admin-password-error"
                    className="text-[12px]"
                  />
                </FormItem>
              )}
            />

            {rootError && (
              <p
                className="text-[13px] text-steel-down"
                role="alert"
                aria-live="assertive"
              >
                {rootError}
              </p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-steel-ink text-steel-canvas hover:bg-steel-body rounded-full h-12 text-[15px]"
            >
              {isSubmitting ? "登录中..." : "登录"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
