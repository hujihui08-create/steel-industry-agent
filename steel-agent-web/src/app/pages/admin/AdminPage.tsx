import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AdminLayout } from "@/app/components/admin/AdminLayout";

const Dashboard = lazy(() => import("@/app/components/admin/Dashboard"));
const AgentConfig = lazy(() =>
  import("@/app/components/admin/AgentConfig").then((m) => ({ default: m.AgentConfigPage }))
);
const IntentManagement = lazy(() =>
  import("@/app/components/admin/IntentManagement").then((m) => ({ default: m.IntentManagement }))
);
const BadCaseManagement = lazy(() => import("@/app/components/admin/BadCaseManagement"));
const MobileUserManagement = lazy(() => import("@/app/components/admin/MobileUserManagement"));
const AdminUserManagement = lazy(() => import("@/app/components/admin/AdminUserManagement"));
const RolePermissionManagement = lazy(() =>
  import("@/app/components/admin/RolePermissionManagement").then((m) => ({ default: m.RolePermissionManagement }))
);
const OperationLogs = lazy(() => import("@/app/components/admin/OperationLogs"));
const SystemSettings = lazy(() => import("@/app/components/admin/SystemSettings"));
const DataBackup = lazy(() => import("@/app/components/admin/DataBackup"));
const KnowledgeManage = lazy(() => import("@/app/components/admin/KnowledgeManage"));
const CrawlerManage = lazy(() => import("@/app/components/admin/CrawlerManage"));
const VectorSearchTest = lazy(() => import("@/app/components/admin/VectorSearchTest"));
const RetrievalConfig = lazy(() => import("@/app/components/admin/RetrievalConfig"));
const AgentDebugTool = lazy(() => import("@/app/components/admin/AgentDebugTool"));
const AdminProfilePage = lazy(() => import("@/app/pages/admin/AdminProfilePage"));
const AdminChangePasswordPage = lazy(() => import("@/app/pages/admin/AdminChangePasswordPage"));
const CategoryManage = lazy(() => import("@/app/pages/admin/CategoryManage"));
const LoginLogs = lazy(() =>
  import("@/app/components/admin/LoginLogs").then((m) => ({ default: m.LoginLogs }))
);
const ApiStats = lazy(() =>
  import("@/app/components/admin/ApiStats").then((m) => ({ default: m.ApiStats }))
);
const ScheduledTasks = lazy(() =>
  import("@/app/components/admin/ScheduledTasks").then((m) => ({ default: m.ScheduledTasks }))
);
const FeedbackManage = lazy(() => import("@/app/components/admin/FeedbackManage"));
const CertificationManage = lazy(() => import("@/app/components/admin/CertificationManage"));
const MenuManagement = lazy(() =>
  import("@/app/components/admin/MenuManagement").then((m) => ({ default: m.MenuManagement }))
);
const SteelDataList = lazy(() => import("@/app/components/admin/SteelDataList"));
const EntityConfig = lazy(() =>
  import("@/app/components/admin/EntityConfig").then((m) => ({ default: m.EntityConfig }))
);

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="w-6 h-6 border-2 border-[#E5E5E5] border-t-[#0A0A0A] rounded-full animate-spin" />
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="agent-config" element={<AgentConfig />} />
          <Route path="intent-management" element={<IntentManagement />} />
          <Route path="entity-config" element={<EntityConfig />} />
          <Route path="bad-case" element={<BadCaseManagement />} />
          <Route path="knowledge-manage" element={<KnowledgeManage />} />
          <Route path="crawler-manage" element={<CrawlerManage />} />
          <Route path="vector-search-test" element={<VectorSearchTest />} />
          <Route path="retrieval-config" element={<RetrievalConfig />} />
          <Route path="agent-debug" element={<AgentDebugTool />} />
          <Route path="mobile-users" element={<MobileUserManagement />} />
          <Route path="admin-users" element={<AdminUserManagement />} />
          <Route path="role-permission" element={<RolePermissionManagement />} />
          <Route path="operation-logs" element={<OperationLogs />} />
          <Route path="system-settings" element={<SystemSettings />} />
          <Route path="data-backup" element={<DataBackup />} />
          <Route path="category-manage" element={<CategoryManage />} />
          <Route path="login-logs" element={<LoginLogs />} />
          <Route path="api-stats" element={<ApiStats />} />
          <Route path="scheduled-tasks" element={<ScheduledTasks />} />
          <Route path="menu-management" element={<MenuManagement />} />
          <Route path="profile" element={<AdminProfilePage />} />
          <Route path="change-password" element={<AdminChangePasswordPage />} />
          <Route path="data-list" element={<SteelDataList />} />
          <Route path="feedbacks" element={<FeedbackManage />} />
          <Route path="certifications" element={<CertificationManage />} />
        </Routes>
      </Suspense>
    </AdminLayout>
  );
}
