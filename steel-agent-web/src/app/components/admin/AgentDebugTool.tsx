import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { AdminPageShell } from "./AdminPageShell";
import { DebugDialogueTab } from "./DebugDialogueTab";
import { DebugToolTab } from "./DebugToolTab";

type TabKey = "dialogue" | "tool";

const TABS: { key: TabKey; label: string }[] = [
  { key: "dialogue", label: "多轮对话调试" },
  { key: "tool", label: "工具调试" },
];

export function AgentDebugTool() {
  const [activeTab, setActiveTab] = useState<TabKey>("dialogue");

  return (
    <AdminPageShell
      title="Agent调试工具"
      breadcrumbs={[
        { label: "首页", path: "/admin" },
        { label: "Agent调试工具" },
      ]}
    >
      {/* Tab 切换栏 */}
      <div className="flex items-center gap-0 border-b border-[#E5E5E5] mb-6">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative px-5 py-3",
                "text-[14px] leading-[1.5]",
                "transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                isActive
                  ? "text-[#0A0A0A] font-medium"
                  : "text-[#737373] hover:text-[#0A0A0A]",
              )}
            >
              {tab.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#0A0A0A]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 内容 */}
      {activeTab === "dialogue" ? <DebugDialogueTab /> : <DebugToolTab />}
    </AdminPageShell>
  );
}

export default AgentDebugTool;
