import { useState } from "react";
import { WorkbenchLayout } from "@/app/components/Layout/WorkbenchLayout";
import { PriceDashboard } from "@/app/components/Cards/PriceDashboard";
import { QuotationWorkbench } from "@/app/components/Cards/QuotationWorkbench";
import { TenderTracker } from "@/app/components/Cards/TenderTracker";
import { AlertCenter } from "@/app/components/Cards/AlertCenter";
import { TrendAnalysis } from "@/app/components/Cards/TrendAnalysis";
import { ChatPanel } from "@/app/components/Chat/ChatPanel";
import type { WorkbenchNavId } from "@/app/components/Layout/WorkbenchNav";
import { Bell } from "lucide-react";

const PAGE_TITLES: Record<WorkbenchNavId, string> = {
  price: "价格看板",
  quotation: "报价工作台",
  tender: "招标追踪",
  alert: "预警中心",
  trend: "趋势分析",
};

export default function WorkbenchPage() {
  const [activeNav, setActiveNav] = useState<WorkbenchNavId>("price");

  const renderContent = () => {
    switch (activeNav) {
      case "price": return <PriceDashboard />;
      case "quotation": return <QuotationWorkbench />;
      case "tender": return <TenderTracker />;
      case "alert": return <AlertCenter />;
      case "trend": return <TrendAnalysis />;
      default: return <PriceDashboard />;
    }
  };

  return (
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
            <h4 className="text-[13px] leading-[18px] font-medium flex items-center gap-2 mb-2">
              <Bell className="size-3.5" strokeWidth={2} />
              通知中心
            </h4>
            <p className="text-[12px] leading-[16px] text-muted-foreground">暂无通知</p>
          </div>
        </div>
      }
    >
      {renderContent()}
    </WorkbenchLayout>
  );
}
