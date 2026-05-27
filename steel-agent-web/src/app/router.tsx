import { createBrowserRouter, Navigate, useLocation, useRouteError } from "react-router-dom";
import { lazy, Suspense } from "react";
import AuthGuard from "@/app/components/Auth/AuthGuard";
import AdminAuthGuard from "@/app/components/Auth/AdminAuthGuard";
import { ROUTE } from "@/app/constants/auth";

function RouteErrorBoundary() {
  const error = useRouteError();
  console.error("Route error:", error);
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : "";
  return (
    <div className="min-h-screen bg-steel-canvas flex items-center justify-center p-8">
      <div className="max-w-lg w-full rounded-2xl border border-steel-line bg-steel-surface p-6 space-y-4">
        <h1 className="text-[18px] font-medium text-steel-down">页面加载出错</h1>
        <pre className="text-[13px] text-steel-body whitespace-pre-wrap break-all bg-white p-4 rounded-lg border border-steel-line overflow-auto max-h-[300px]">{message}</pre>
        {stack && (
          <pre className="text-[11px] text-steel-muted whitespace-pre-wrap break-all bg-white p-4 rounded-lg border border-steel-line overflow-auto max-h-[400px]">{stack}</pre>
        )}
      </div>
    </div>
  );
}

// Eager-loaded pages (critical path)
import LoginPage from "@/app/pages/LoginPage";
import AdminLoginPage from "@/app/pages/admin/AdminLoginPage";
import ChatPage from "@/app/pages/ChatPage";

// Lazy-loaded pages
const SplashPage = lazy(() => import("@/app/pages/SplashPage"));
const RegisterPage = lazy(() => import("@/app/pages/RegisterPage"));
const PriceBoardPage = lazy(() => import("@/app/pages/PriceBoard"));
const ChartPage = lazy(() => import("@/app/pages/ChartPage"));
const NewsDetailPage = lazy(() => import("@/app/pages/NewsDetailPage"));
const QuotationListPage = lazy(() => import("@/app/pages/QuotationListPage"));
const QuotationDetailPage = lazy(() => import("@/app/pages/QuotationDetailPage"));
const TenderListPage = lazy(() => import("@/app/pages/TenderListPage"));
const TenderDetailPage = lazy(() => import("@/app/pages/TenderDetailPage"));
const AlertListPage = lazy(() => import("@/app/pages/AlertListPage"));
const ProfilePage = lazy(() => import("@/app/pages/ProfilePage"));
const ProfileEditPage = lazy(() => import("@/app/pages/ProfileEditPage"));
const MessageCenterPage = lazy(() => import("@/app/pages/MessageCenterPage"));
const SettingsPage = lazy(() => import("@/app/pages/SettingsPage"));

// Admin pages - single entry point with nested routes
const AdminPage = lazy(() => import("@/app/pages/admin/AdminPage"));
const KnowledgePage = lazy(() => import("@/app/pages/KnowledgePage"));

// New pages
const TenderCalendarPage = lazy(() => import("@/app/pages/TenderCalendarPage"));
const FavoritesPage = lazy(() => import("@/app/pages/FavoritesPage"));
const HelpFeedbackPage = lazy(() => import("@/app/pages/HelpFeedbackPage"));
const CertificationPage = lazy(() => import("@/app/pages/CertificationPage"));
const OnboardingPage = lazy(() => import("@/app/pages/OnboardingPage"));
const KnowledgeDetailPage = lazy(() => import("@/app/pages/KnowledgeDetailPage"));

function LazyFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="w-6 h-6 border-2 border-[#E5E5E5] border-t-[#0A0A0A] rounded-full animate-spin" />
    </div>
  );
}

function ChartRedirect() {
  const location = useLocation();
  return <Navigate to={ROUTE.PRICE_BOARD + location.search} replace />;
}

function withSuspense(children: React.ReactNode) {
  return <Suspense fallback={<LazyFallback />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: ROUTE.ROOT,
    element: <Navigate to={ROUTE.SPLASH} replace />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.LOGIN,
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.CHAT,
    element: <ChatPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.SPLASH,
    element: withSuspense(<SplashPage />),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.REGISTER,
    element: withSuspense(<RegisterPage />),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.PRICE_BOARD,
    element: withSuspense(
      <AuthGuard>
        <PriceBoardPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.CHART,
    element: (
      <AuthGuard>
        <ChartRedirect />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.NEWS_DETAIL,
    element: withSuspense(
      <AuthGuard>
        <NewsDetailPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.QUOTATIONS,
    element: withSuspense(
      <AuthGuard>
        <QuotationListPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.QUOTATION_DETAIL,
    element: withSuspense(
      <AuthGuard>
        <QuotationDetailPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.TENDERS,
    element: withSuspense(
      <AuthGuard>
        <TenderListPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.TENDER_DETAIL,
    element: withSuspense(
      <AuthGuard>
        <TenderDetailPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.ALERTS,
    element: withSuspense(
      <AuthGuard>
        <AlertListPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.KNOWLEDGE_DETAIL,
    element: withSuspense(
      <AuthGuard>
        <KnowledgeDetailPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.KNOWLEDGE,
    element: withSuspense(
      <AuthGuard>
        <KnowledgePage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.PROFILE,
    element: withSuspense(
      <AuthGuard>
        <ProfilePage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.PROFILE_EDIT,
    element: withSuspense(
      <AuthGuard>
        <ProfileEditPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.MESSAGES,
    element: withSuspense(
      <AuthGuard>
        <MessageCenterPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.SETTINGS,
    element: withSuspense(
      <AuthGuard>
        <SettingsPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.ADMIN_LOGIN,
    element: <AdminLoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: `${ROUTE.ADMIN}/*`,
    element: withSuspense(
      <AdminAuthGuard>
        <AdminPage />
      </AdminAuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.CALENDAR,
    element: withSuspense(
      <AuthGuard>
        <TenderCalendarPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.FAVORITES,
    element: withSuspense(
      <AuthGuard>
        <FavoritesPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.HELP,
    element: withSuspense(
      <AuthGuard>
        <HelpFeedbackPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.CERTIFICATION,
    element: withSuspense(
      <AuthGuard>
        <CertificationPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: ROUTE.ONBOARDING,
    element: withSuspense(<OnboardingPage />),
    errorElement: <RouteErrorBoundary />,
  },
]);
