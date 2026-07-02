// ============================================================
// RootLayout — 根布局，所有页面共用
// 条件渲染 MobileBottomNav，admin 路由下隐藏
// ============================================================

import { Outlet, useLocation } from "react-router-dom";
import { MobileBottomNav } from "./MobileBottomNav";

export default function RootLayout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <>
      <Outlet />
      {!isAdminRoute && <MobileBottomNav />}
    </>
  );
}
