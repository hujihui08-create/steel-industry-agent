import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { adminUpdatePassword } from "@/app/api/admin-auth";
import { AdminPageShell } from "@/app/components/admin/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

interface PasswordFormValues {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function AdminChangePasswordPage() {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PasswordFormValues>({
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: PasswordFormValues) => {
    try {
      setSubmitting(true);
      await adminUpdatePassword(values.oldPassword.trim(), values.newPassword.trim());
      toast.success("密码修改成功，建议重新登录");
      form.reset();
    } catch (err: any) {
      toast.error(err?.message || "修改密码失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminPageShell
      title="修改密码"
      breadcrumbs={[{ label: "我的账号" }, { label: "修改密码" }]}
    >
      <div className="max-w-2xl">
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6">
          <h2 className="text-[18px] leading-[1.4] font-medium text-[#0A0A0A] mb-6">
            修改密码
          </h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="oldPassword"
                rules={{ required: "请输入旧密码" }}
                render={({ field }) => (
                  <FormItem>
                    <label className="block text-[14px] text-[#404040] mb-2">
                      旧密码
                    </label>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="请输入旧密码"
                        className="h-12 rounded-lg border-[#E5E5E5] text-[15px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[#B42318] text-[12px] leading-[1.5]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                rules={{
                  required: "请输入新密码",
                  minLength: { value: 6, message: "密码至少6位" },
                }}
                render={({ field }) => (
                  <FormItem>
                    <label className="block text-[14px] text-[#404040] mb-2">
                      新密码
                    </label>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="请输入新密码（至少6位）"
                        className="h-12 rounded-lg border-[#E5E5E5] text-[15px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[#B42318] text-[12px] leading-[1.5]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                rules={{
                  required: "请确认新密码",
                  validate: (value) =>
                    value === form.getValues("newPassword") || "两次密码不一致",
                }}
                render={({ field }) => (
                  <FormItem>
                    <label className="block text-[14px] text-[#404040] mb-2">
                      确认新密码
                    </label>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="请再次输入新密码"
                        className="h-12 rounded-lg border-[#E5E5E5] text-[15px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[#B42318] text-[12px] leading-[1.5]" />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4 border-t border-[#E5E5E5]">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#0A0A0A] text-white hover:bg-[#404040] rounded-full h-10 px-6 text-[14px]"
                >
                  {submitting ? "保存中..." : "修改密码"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </AdminPageShell>
  );
}
