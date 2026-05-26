import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

import { PageHeader } from "@/app/components/shared/PageHeader";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { ErrorState } from "@/app/components/shared/ErrorState";
import { EmptyState } from "@/app/components/shared/EmptyState";

import { getCalendar } from "@/app/api/tenders";
import type { CalendarData, CalendarItem } from "@/app/api/tenders";

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  open: { label: "进行中", className: "bg-steel-ink text-white" },
  closed: { label: "已截止", className: "bg-steel-surface text-steel-muted border border-steel-line" },
};

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getTodayStr(): string {
  return formatDateStr(new Date());
}

function getDaysInMonth(
  year: number,
  month: number
): { day: number; isCurrentMonth: boolean; dateStr: string }[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();

  const days: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const d = new Date(year, month - 1, day);
    days.push({ day, isCurrentMonth: false, dateStr: formatDateStr(d) });
  }

  const totalDays = lastDay.getDate();
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    days.push({ day, isCurrentMonth: true, dateStr: formatDateStr(d) });
  }

  const remaining = 42 - days.length;
  for (let day = 1; day <= remaining; day++) {
    const d = new Date(year, month + 1, day);
    days.push({ day, isCurrentMonth: false, dateStr: formatDateStr(d) });
  }

  return days;
}

function getStatusConfig(status: string) {
  return STATUS_MAP[status] ?? { label: status, className: "bg-steel-surface text-steel-muted border border-steel-line" };
}

export default function TenderCalendarPage() {
  const navigate = useNavigate();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const {
    data: calendarData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CalendarData>({
    queryKey: ["tender-calendar"],
    queryFn: getCalendar,
    staleTime: 60_000,
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const tenderDateSet = useMemo(() => {
    if (!calendarData?.dates) return new Set<string>();
    return new Set(calendarData.dates.map((d) => d.date));
  }, [calendarData]);

  const selectedTenders = useMemo(() => {
    if (!selectedDate || !calendarData?.dates) return null;
    const entry = calendarData.dates.find((d) => d.date === selectedDate);
    return entry?.items ?? [];
  }, [selectedDate, calendarData]);

  const todayStr = getTodayStr();

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const formatMonthLabel = () => {
    return `${year}年${month + 1}月`;
  };

  const renderCalendar = () => {
    return (
      <div className="rounded-2xl border border-steel-line bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="上个月"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-steel-ink hover:bg-steel-surface transition-colors duration-150"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <span className="text-[16px] leading-[1.4] font-medium text-steel-ink">
            {formatMonthLabel()}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="下个月"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-steel-ink hover:bg-steel-surface transition-colors duration-150"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="grid grid-cols-7 px-2 pb-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="flex items-center justify-center h-8 text-[12px] leading-[1.5] text-steel-muted"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 px-2 pb-3">
          {days.map((d, idx) => {
            const isToday = d.dateStr === todayStr;
            const hasTender = tenderDateSet.has(d.dateStr);
            const isSelected = d.dateStr === selectedDate;
            const isCurrentMonth = d.isCurrentMonth;

            let cellClass =
              "flex items-center justify-center w-9 h-9 mx-auto text-[14px] leading-[1.4] rounded-lg transition-colors duration-150";

            if (!isCurrentMonth) {
              cellClass += " text-steel-placeholder cursor-default";
            } else if (hasTender) {
              cellClass += " bg-steel-ink text-white rounded-full font-medium cursor-pointer hover:opacity-80";
            } else {
              cellClass += " text-steel-ink cursor-pointer hover:bg-steel-surface";
            }

            if (isToday && !hasTender) {
              cellClass += " font-medium border border-steel-ink";
            }

            if (isSelected && !hasTender) {
              cellClass += " ring-1 ring-steel-ink";
            }

            if (isSelected && hasTender) {
              cellClass += " outline outline-2 outline-offset-1 outline-steel-ink";
            }

            const handleClick = isCurrentMonth
              ? () => setSelectedDate(d.dateStr)
              : undefined;

            return (
              <div key={idx} className="flex items-center justify-center py-0.5">
                <button
                  type="button"
                  onClick={handleClick}
                  disabled={!isCurrentMonth}
                  className={cellClass}
                  aria-label={d.dateStr}
                >
                  {d.day}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTenderList = () => {
    if (!selectedDate) {
      return (
        <EmptyState
          icon={<Calendar className="h-10 w-10" strokeWidth={1.75} />}
          title="点击日历上的高亮日期查看招标详情"
        />
      );
    }

    if (!selectedTenders || selectedTenders.length === 0) {
      return (
        <EmptyState
          icon={<Calendar className="h-10 w-10" strokeWidth={1.75} />}
          title="该日期暂无招标截止"
        />
      );
    }

    return (
      <div className="space-y-2">
        <p className="text-[12px] leading-[1.5] text-steel-muted px-1">
          {selectedDate} · {selectedTenders.length} 个招标截止
        </p>
        {selectedTenders.map((item: CalendarItem) => {
          const status = getStatusConfig(item.status);

          const deadlineTime = (() => {
            try {
              const d = new Date(item.deadline);
              if (isNaN(d.getTime())) return item.deadline;
              const hh = String(d.getHours()).padStart(2, "0");
              const mm = String(d.getMinutes()).padStart(2, "0");
              return `${hh}:${mm}`;
            } catch {
              return item.deadline;
            }
          })();

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/tenders/${item.id}`)}
              className="w-full text-left rounded-xl border border-steel-line bg-white p-3 hover:bg-steel-surface transition-colors duration-150 block"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-[15px] leading-[1.6] font-medium text-steel-ink flex-1 min-w-0 line-clamp-2">
                  {item.title}
                </h4>
                <span
                  className={`inline-flex items-center shrink-0 rounded-full px-2 h-5 text-[11px] leading-[1.5] ${status.className}`}
                >
                  {status.label}
                </span>
              </div>
              <p className="text-[12px] leading-[1.5] text-steel-muted mt-1.5">
                截止 {deadlineTime}
              </p>
            </button>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSkeleton variant="card" count={1} className="px-4 pt-4" />;
    }

    if (isError) {
      return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;
    }

    return (
      <div className="px-4 pt-4 pb-6 space-y-4">
        {renderCalendar()}
        {renderTenderList()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader
        title="投标日历"
        onBack={() => navigate(-1)}
      />

      <div className="flex-1">
        {renderContent()}
      </div>
    </div>
  );
}
