import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ROUTE } from "@/app/constants/auth";
import { adminGetInfo } from "@/app/api/admin-auth";

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [status, setStatus] = useState<"loading" | "ok" | "fail">("loading");

  useEffect(() => {
    const stored = localStorage.getItem("auth-storage");
    if (!stored) {
      setStatus("fail");
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      const token = parsed?.state?.access_token;
      if (!token) {
        setStatus("fail");
        return;
      }
      adminGetInfo()
        .then(() => setStatus("ok"))
        .catch(() => {
          localStorage.removeItem("auth-storage");
          setStatus("fail");
        });
    } catch {
      setStatus("fail");
    }
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#E5E5E5] border-t-[#0A0A0A] rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "fail") {
    return <Navigate to={ROUTE.ADMIN_LOGIN} replace />;
  }

  return <>{children}</>;
}
