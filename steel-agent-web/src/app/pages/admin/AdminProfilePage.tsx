import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { adminGetInfo, adminUpdateProfile } from "@/app/api/admin-auth";
import { AdminPageShell } from "@/app/components/admin/AdminPageShell";
import type { AdminUser, AdminRole } from "@/app/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "超级管理员",
  operator: "运营管理员",
  data_admin: "数据管理员",
  viewer: "只读观察员",
};

function formatTime(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${h}:${min}`;
  } catch {
    return dateStr;
  }
}

function roleLabel(role: AdminRole | undefined): string {
  if (!role) return "-";
  return ROLE_LABELS[role] || role;
}

export default function AdminProfilePage() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const info = await adminGetInfo();
      setAdmin(info);
      setNickname(info.nickname);
    } catch (err: any) {
      toast.error(err?.message || "获取管理员信息失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      toast.error("昵称不能为空");
      return;
    }
    try {
      setSaving(true);
      await adminUpdateProfile(trimmed);
      toast.success("个人信息已更新");
      setAdmin((prev) => (prev ? { ...prev, nickname: trimmed } : prev));
    } catch (err: any) {
      toast.error(err?.message || "更新个人资料失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminPageShell
        title="个人信息"
        breadcrumbs={[{ label: "我的账号" }, { label: "个人信息" }]}
      >
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-6 h-6 border-2 border-[#E5E5E5] border-t-[#0A0A0A] rounded-full animate-spin" />
        </div>
      </AdminPageShell>
    );
  }

  if (!admin) {
    return (
      <AdminPageShell
        title="个人信息"
        breadcrumbs={[{ label: "我的账号" }, { label: "个人信息" }]}
      >
        <div className="text-[15px] text-[#737373]">未获取到用户信息</div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="个人信息"
      breadcrumbs={[{ label: "我的账号" }, { label: "个人信息" }]}
    >
      <div className="max-w-2xl space-y-6">
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6">
          <h2 className="text-[18px] leading-[1.4] font-medium text-[#0A0A0A] mb-6">
            基本信息
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-[14px] text-[#404040] mb-2">
                管理员账号
              </label>
              <Input
                value={admin.username}
                disabled
                className="h-12 rounded-lg bg-[#FAFAFA] border-[#E5E5E5] text-[15px]"
              />
            </div>

            <div>
              <label className="block text-[14px] text-[#404040] mb-2">
                昵称
              </label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="h-12 rounded-lg border-[#E5E5E5] text-[15px]"
              />
            </div>

            <div>
              <label className="block text-[14px] text-[#404040] mb-2">
                角色
              </label>
              <Input
                value={roleLabel(admin.role)}
                disabled
                className="h-12 rounded-lg bg-[#FAFAFA] border-[#E5E5E5] text-[15px]"
              />
            </div>

            <div>
              <label className="block text-[14px] text-[#404040] mb-2">
                最后登录
              </label>
              <Input
                value={formatTime(admin.lastLoginAt)}
                disabled
                className="h-12 rounded-lg bg-[#FAFAFA] border-[#E5E5E5] text-[15px]"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-6 border-t border-[#E5E5E5]">
            <Button
              onClick={handleSave}
              disabled={saving || nickname === admin.nickname}
              className="bg-[#0A0A0A] text-white hover:bg-[#404040] rounded-full h-10 px-6 text-[14px]"
            >
              {saving ? "保存中..." : "保存修改"}
            </Button>
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
