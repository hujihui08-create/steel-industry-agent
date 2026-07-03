import { useState } from "react";
import { WorkbenchLayout } from "./components/Layout/WorkbenchLayout";
import { PriceDashboard } from "./components/Cards/PriceDashboard";
import { QuotationWorkbench } from "./components/Cards/QuotationWorkbench";
import { TenderTracker } from "./components/Cards/TenderTracker";
import { AlertCenter } from "./components/Cards/AlertCenter";
import { TrendAnalysis } from "./components/Cards/TrendAnalysis";
import { ChatPanel } from "./components/Chat/ChatPanel";
import { NotificationCenter } from "./components/Cards/NotificationCenter";
import type { WorkbenchNavId } from "./components/Layout/WorkbenchNav";
import { Toaster } from "@/components/ui/sonner";

const PAGE_TITLES: Record<WorkbenchNavId, string> = {
  price: "价格看板",
  quotation: "报价工作台",
  tender: "招标追踪",
  alert: "预警中心",
  trend: "趋势分析",
};

export default function App() {
  const [activeNav, setActiveNav] = useState<WorkbenchNavId>("price");

  const renderContent = () => {
    switch (activeNav) {
      case "price":
        return <PriceDashboard />;
      case "quotation":
        return <QuotationWorkbench />;
      case "tender":
        return <TenderTracker />;
      case "alert":
        return <AlertCenter />;
      case "trend":
        return <TrendAnalysis />;
      default:
        return <PriceDashboard />;
    }
  };

  return (
    <>
      <Toaster />
      <WorkbenchLayout
        activeNav={activeNav}
        onNavigate={setActiveNav}
        pageTitle={PAGE_TITLES[activeNav]}
        rightPanelContent={
          <div className="flex flex-col h-full">
            <div className="flex-1 min-h-0">
              <ChatPanel />
            </div>
            <div className="border-t border-border px-4 py-3 shrink-0">
              <NotificationCenter />
            </div>
          </div>
        }
      >
        {renderContent()}
      </WorkbenchLayout>
    </>
  );
}
