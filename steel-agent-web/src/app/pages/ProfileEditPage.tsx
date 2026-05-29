// ============================================================
// ProfileEditPage — 编辑个人资料页面
// react-hook-form 表单，支持修改昵称、公司名称、地区
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// ============================================================

import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useRef } from "react";
import { toast } from "sonner";
import { User } from "lucide-react";

import { PageHeader } from "@/app/components/shared/PageHeader";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { ErrorState } from "@/app/components/shared/ErrorState";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { getProfile, updateProfile } from "@/app/api/users";
import type { ProfileUpdateData } from "@/app/types/user";

// -----------------------------------------------------------
// Form values
// -----------------------------------------------------------

interface ProfileFormValues {
  nickname: string;
  company: string;
  region: string;
}

// -----------------------------------------------------------
// ProfileEditPage
// -----------------------------------------------------------

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    staleTime: 60_000,
  });

  const form = useForm<ProfileFormValues>({
    values: {
      nickname: profile?.nickname || "",
      company: profile?.company || "",
      region: profile?.region || "",
    },
  });

  // -----------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------

  const handleAvatarChange = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Mock: just show toast for now
      toast.success("头像已更新");
    }
    // Reset so same file can be selected again
    e.target.value = "";
  };

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      const data: ProfileUpdateData = {};
      if (values.nickname !== profile?.nickname) data.nickname = values.nickname;
      if (values.company !== profile?.company) data.company = values.company;
      if (values.region !== profile?.region) data.region = values.region;

      if (Object.keys(data).length === 0) {
        toast.info("未检测到修改");
        return;
      }

      await updateProfile(data);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("保存成功");
      navigate(-1);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "保存失败，请稍后重试";
      toast.error(message);
    }
  };

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------

  const renderContent = () => {
    // Loading
    if (isLoading) {
      return (
        <div className="px-4 pt-6">
          <LoadingSkeleton variant="card" count={1} />
        </div>
      );
    }

    // Error
    if (isError) {
      return <ErrorState onRetry={() => refetch()} />;
    }

    if (!profile) {
      return (
        <ErrorState
          message="未获取到用户信息"
          onRetry={() => refetch()}
        />
      );
    }

    const firstChar = profile.nickname
      ? profile.nickname.charAt(0)
      : "";

    return (
      <div className="max-w-[720px] mx-auto px-4 py-6 space-y-5">
        {/* ---- Avatar Section ---- */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-steel-surface border-2 border-steel-ink flex items-center justify-center">
            {firstChar ? (
              <span className="text-[24px] leading-[1.3] font-medium text-steel-ink">
                {firstChar}
              </span>
            ) : (
              <User className="h-10 w-10 text-steel-placeholder" strokeWidth={1.75} />
            )}
          </div>

          <button
            type="button"
            onClick={handleAvatarChange}
            className="text-[13px] text-steel-ink border-b border-steel-ink hover:opacity-70 transition-opacity duration-150"
          >
            更换头像
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
            aria-label="选择头像图片"
          />
        </div>

        <div className="h-4" />

        {/* ---- Form ---- */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
          >
            {/* Nickname */}
            <FormField
              control={form.control}
              name="nickname"
              rules={{
                required: "请输入昵称",
                maxLength: {
                  value: 50,
                  message: "昵称不能超过50个字符",
                },
              }}
              render={({ field, fieldState }) => (
                <FormItem>
                  <label className="block text-[12px] text-steel-muted mb-1">
                    昵称
                  </label>
                  <FormControl>
                    <Input
                      placeholder="请输入昵称"
                      aria-invalid={!!fieldState.error}
                      aria-describedby={fieldState.error ? "profile-nickname-error" : undefined}
                      className="rounded-[10px] border-steel-line bg-steel-canvas text-[15px] h-11 px-3 focus-visible:border-steel-ink focus-visible:ring-0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage id="profile-nickname-error" className="text-[12px]" />
                </FormItem>
              )}
            />

            {/* Company */}
            <FormField
              control={form.control}
              name="company"
              rules={{
                maxLength: {
                  value: 100,
                  message: "公司名称不能超过100个字符",
                },
              }}
              render={({ field, fieldState }) => (
                <FormItem>
                  <label className="block text-[12px] text-steel-muted mb-1">
                    公司名称
                  </label>
                  <FormControl>
                    <Input
                      placeholder="请输入公司名称"
                      aria-invalid={!!fieldState.error}
                      aria-describedby={fieldState.error ? "profile-company-error" : undefined}
                      className="rounded-[10px] border-steel-line bg-steel-canvas text-[15px] h-11 px-3 focus-visible:border-steel-ink focus-visible:ring-0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage id="profile-company-error" className="text-[12px]" />
                </FormItem>
              )}
            />

            {/* Region */}
            <FormField
              control={form.control}
              name="region"
              rules={{
                maxLength: {
                  value: 50,
                  message: "地区不能超过50个字符",
                },
              }}
              render={({ field, fieldState }) => (
                <FormItem>
                  <label className="block text-[12px] text-steel-muted mb-1">
                    地区
                  </label>
                  <FormControl>
                    <Input
                      placeholder="例如：上海"
                      aria-invalid={!!fieldState.error}
                      aria-describedby={fieldState.error ? "profile-region-error" : undefined}
                      className="rounded-[10px] border-steel-line bg-steel-canvas text-[15px] h-11 px-3 focus-visible:border-steel-ink focus-visible:ring-0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage id="profile-region-error" className="text-[12px]" />
                </FormItem>
              )}
            />

            {/* Save button */}
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full h-12 bg-steel-ink text-steel-canvas rounded-full text-[15px] font-medium hover:bg-steel-body transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              保存
            </button>
          </form>
        </Form>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader
        title="编辑资料"
        onBack={() => navigate(-1)}
      />

      <div className="flex-1">{renderContent()}</div>
    </div>
  );
}
