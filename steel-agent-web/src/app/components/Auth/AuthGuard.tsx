import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/app/stores/authStore";
import { ROUTE } from "@/app/constants/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  // hydrate 尚未完成时不重定向（避免闪烁）
  if (!isHydrated) return null;
  
  if (!isAuthenticated) {
    return <Navigate to={ROUTE.LOGIN} replace />;
  }

  return <>{children}</>;
}
