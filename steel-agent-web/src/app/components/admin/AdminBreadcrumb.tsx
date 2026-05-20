import React from "react";
import { useNavigate } from "react-router-dom";
import { Slash } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface BreadcrumbItemData {
  label: string;
  path?: string;
}

interface AdminBreadcrumbProps {
  items: BreadcrumbItemData[];
}

export function AdminBreadcrumb({ items }: AdminBreadcrumbProps) {
  const navigate = useNavigate();

  // 如果 items 为空，默认显示"首页"
  const displayItems: BreadcrumbItemData[] =
    items.length === 0 ? [{ label: "首页" }] : items;

  return (
    <Breadcrumb aria-label="面包屑导航">
      <BreadcrumbList className="gap-1.5 sm:gap-1.5">
        {/* 首页固定项 */}
        <BreadcrumbItem>
          {displayItems.length === 1 && displayItems[0].label === "首页" ? (
            <BreadcrumbPage className="text-[13px] leading-[1.5] text-[#404040]">
              首页
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink
              onClick={(e) => {
                e.preventDefault();
                navigate("/admin");
              }}
              className={cn(
                "text-[13px] leading-[1.5] text-[#737373]",
                "hover:text-[#0A0A0A] transition-colors duration-150",
                "cursor-pointer no-underline hover:no-underline",
              )}
            >
              首页
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {displayItems.map((item, index) => {
          // 跳过首页（已单独渲染）
          if (index === 0 && item.label === "首页") return null;

          const isLast = index === displayItems.length - 1;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <BreadcrumbSeparator className="text-[#D4D4D4]">
                <Slash size={12} strokeWidth={1.75} />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLast || !item.path ? (
                  <BreadcrumbPage className="text-[13px] leading-[1.5] text-[#404040]">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.path) navigate(item.path);
                    }}
                    className={cn(
                      "text-[13px] leading-[1.5] text-[#737373]",
                      "hover:text-[#0A0A0A] transition-colors duration-150",
                      "cursor-pointer no-underline hover:no-underline",
                    )}
                  >
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
