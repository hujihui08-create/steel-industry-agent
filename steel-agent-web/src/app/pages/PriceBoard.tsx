// ============================================================
// PriceBoard — 价格看板页面
// 路由: /price-board
// 功能: 品种切换 / 区域筛选 / 列表-走势-对比视图 / 分页
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// ============================================================

import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutGrid,
  TrendingUp,
  Columns2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { PageHeader } from "@/app/components/shared/PageHeader";
import { ErrorState } from "@/app/components/shared/ErrorState";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { PriceCard } from "@/app/components/Cards/PriceCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PriceItem } from "@/app/components/Cards/PriceCard";
import { TrendCard } from "@/app/components/Cards/TrendCard";
import type { TrendDataPoint as TrendCardDataPoint } from "@/app/components/Cards/TrendCard";
import { CompareCard } from "@/app/components/Cards/CompareCard";
import type { CompareCategory, CompareRegion } from "@/app/components/Cards/CompareCard";

import { getPriceList } from "@/app/api/price";
import type { PriceData } from "@/app/api/price";
import { getPriceTrend } from "@/app/api/trend";
import { comparePrices } from "@/app/api/price";
import { getPublicCategories } from "@/app/api/admin";
import type { Category } from "@/app/types/admin";

import { ROUTE } from "@/app/constants/auth";

// -----------------------------------------------------------
// 常量（API 不可用时的兜底品种）
// -----------------------------------------------------------

const DEFAULT_CATEGORIES = ["螺纹钢", "热卷", "冷轧", "中厚板", "镀锌板", "彩涂板", "不锈钢", "型钢", "管材"];

const PERIODS = [
  { label: "1周", days: 7 },
  { label: "1月", days: 30 },
  { label: "3月", days: 90 },
  { label: "1年", days: 365 },
] as const;

type ViewMode = "list" | "trend" | "compare";

const PAGE_SIZE = 10;

// -----------------------------------------------------------
// 格式化日期 (price_date → 简短显示)
// -----------------------------------------------------------

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  // API 返回格式可能是 "2025-05-26" 或 "2025-05-26T..."
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.slice(0, 10);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
}

function formatDateFull(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// -----------------------------------------------------------
// 将 API PriceData[] 按 category+spec 分组为 PriceCard 数据
// -----------------------------------------------------------

interface GroupedPrice {
  category: string;
  spec: string;
  source: string;
  priceDate: string;
  prices: PriceItem[];
}

function groupPrices(items: PriceData[]): GroupedPrice[] {
  const map = new Map<string, GroupedPrice>();

  for (const item of items) {
    const key = `${item.category}|||${item.spec}`;
    if (!map.has(key)) {
      map.set(key, {
        category: item.category,
        spec: item.spec,
        source: item.source,
        priceDate: item.price_date,
        prices: [],
      });
    }
    const group = map.get(key)!;
    group.prices.push({
      region: item.region,
      price: item.price,
      change: item.change,
      changePct: item.change_pct,
    });
  }

  return Array.from(map.values());
}

// -----------------------------------------------------------
// 将 API TrendDataPoint[] 映射为 TrendCard 的 {date, value}[]
// -----------------------------------------------------------

function mapTrendData(apiData: { price_date: string; price: number; change_pct?: number }[]): {
  points: TrendCardDataPoint[];
  changePct: number | undefined;
} {
  const points: TrendCardDataPoint[] = apiData.map((d) => ({
    date: d.price_date.slice(0, 10),
    value: d.price,
  }));

  let changePct: number | undefined;
  if (points.length >= 2) {
    const first = points[0].value;
    const last = points[points.length - 1].value;
    if (first !== 0) {
      changePct = ((last - first) / first) * 100;
    }
  } else if (apiData.length === 1 && apiData[0].change_pct != null) {
    changePct = apiData[0].change_pct;
  }

  return { points, changePct };
}

// -----------------------------------------------------------
// 将 API comparePrices 结果映射为 CompareCategory[]
// -----------------------------------------------------------

function mapCompareData(data: Record<string, PriceData>): CompareCategory[] {
  const result: CompareCategory[] = [];

  for (const [category, pd] of Object.entries(data)) {
    // 按地区分组
    const regionMap = new Map<string, CompareRegion>();
    if (pd) {
      const key = pd.region;
      regionMap.set(key, {
        region: pd.region,
        price: pd.price,
        change: pd.change,
        changePct: pd.change_pct,
      });
    }

    result.push({
      name: pd?.category || category,
      spec: pd?.spec || "",
      regions: Array.from(regionMap.values()),
    });
  }

  return result;
}

// -----------------------------------------------------------
// 品种 Tab 组件
// -----------------------------------------------------------

interface CategoryTabsProps {
  categories: string[];
  active: string;
  onChange: (cat: string) => void;
}

function CategoryTabs({ categories, active, onChange }: CategoryTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat)}
          className={
            active === cat
              ? "bg-steel-ink text-steel-canvas rounded-full px-4 py-1.5 text-[13px] leading-[1.5] whitespace-nowrap shrink-0 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-steel-ink/10"
              : "border border-steel-line text-steel-ink rounded-full px-4 py-1.5 text-[13px] leading-[1.5] whitespace-nowrap shrink-0 hover:bg-steel-surface hover:border-steel-ink transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-steel-ink/10"
          }
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------
// View Mode Segmented Control
// -----------------------------------------------------------

interface ViewModeControlProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function ViewModeControl({ mode, onChange }: ViewModeControlProps) {
  const options: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: "list", label: "列表", icon: <LayoutGrid className="size-3.5" strokeWidth={1.75} /> },
    { key: "trend", label: "走势", icon: <TrendingUp className="size-3.5" strokeWidth={1.75} /> },
    { key: "compare", label: "对比", icon: <Columns2 className="size-3.5" strokeWidth={1.75} /> },
  ];

  return (
    <div className="flex rounded-full border border-steel-line p-0.5">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={
            mode === opt.key
              ? "bg-steel-ink text-steel-canvas rounded-full px-3 py-1.5 text-[13px] leading-[1.5] flex items-center gap-1.5 transition-colors duration-150"
              : "text-steel-muted rounded-full px-3 py-1.5 text-[13px] leading-[1.5] flex items-center gap-1.5 hover:text-steel-ink transition-colors duration-150"
          }
        >
          {opt.icon}
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------
// 周期 Tab 组件
// -----------------------------------------------------------

interface PeriodTabsProps {
  days: number;
  onChange: (days: number) => void;
}

function PeriodTabs({ days, onChange }: PeriodTabsProps) {
  return (
    <div className="flex items-center gap-2">
      {PERIODS.map((p) => (
        <button
          key={p.days}
          type="button"
          onClick={() => onChange(p.days)}
          className={
            days === p.days
              ? "bg-steel-ink text-steel-canvas rounded-full px-4 py-1.5 text-[13px] leading-[1.5] transition-colors duration-150"
              : "border border-steel-line text-steel-body rounded-full px-4 py-1.5 text-[13px] leading-[1.5] hover:bg-steel-surface transition-colors duration-150"
          }
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------
// 分页
// -----------------------------------------------------------

interface PaginationProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

function Pagination({ page, totalPages, onPrev, onNext }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <button
        type="button"
        onClick={onPrev}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 rounded-full border border-steel-line px-3 py-1.5 text-[13px] text-steel-ink hover:bg-steel-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
      >
        <ChevronLeft className="size-3.5" strokeWidth={1.75} />
        上一页
      </button>

      <span className="text-[13px] text-steel-muted">
        {page} / {totalPages}
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1 rounded-full border border-steel-line px-3 py-1.5 text-[13px] text-steel-ink hover:bg-steel-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
      >
        下一页
        <ChevronRight className="size-3.5" strokeWidth={1.75} />
      </button>
    </div>
  );
}

// ============================================================
// PriceBoard
// ============================================================

export default function PriceBoard() {
  const navigate = useNavigate();

  // ---- 本地筛选状态 ----
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [parentCategory, setParentCategory] = useState<string>("__all__");
  const [region, setRegion] = useState("__all__");
  const [spec, setSpec] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [trendDays, setTrendDays] = useState<number>(30);
  const [page, setPage] = useState(1);

  // ---- 品种列表（从后台品类管理 API 动态获取，禁用的自动过滤） ----
  const { data: categoriesData } = useQuery({
    queryKey: ["public-categories"],
    queryFn: getPublicCategories,
    staleTime: 10 * 60 * 1000,
  });

  const categoryTree = useMemo(() => {
    if (categoriesData?.spot && categoriesData.spot.length > 0) {
      return categoriesData.spot.filter((c) => c.status === "enabled");
    }
    return [];
  }, [categoriesData]);

  // 扁平名称列表（品类 + 品种）
  const allCategoryNames = useMemo(() => {
    const names: string[] = [];
    const walk = (items: Category[]) => {
      for (const item of items) {
        names.push(item.name);
        if (item.children && item.children.length > 0) walk(item.children);
      }
    };
    walk(categoryTree);
    return names.length > 0 ? names : DEFAULT_CATEGORIES;
  }, [categoryTree]);

  // 根据筛选的品类，生成可显示的 Tab 列表
  const categories = useMemo(() => {
    if (parentCategory === "__all__") return allCategoryNames;
    // 找到选中的父品类，展示其子品种名
    for (const root of categoryTree) {
      if (root.name === parentCategory && root.children && root.children.length > 0) {
        return root.children.map((c) => c.name);
      }
    }
    return [parentCategory];
  }, [allCategoryNames, parentCategory, categoryTree]);

  // 品类筛选选项（有子品种的根品类）
  const parentCategoryOptions = useMemo(() => {
    return categoryTree.filter((c) => c.children && c.children.length > 0);
  }, [categoryTree]);

  const safeActiveCategory = activeCategory || categories[0];

  // ---- 区域选项 ----
  const regions = useMemo(
    () => ["__all__", "上海", "北京", "广州", "杭州", "南京", "武汉", "成都"],
    [],
  );

  // ============================================================
  // 列表视图数据
  // ============================================================
  const {
    data: listData,
    isLoading: listLoading,
    isError: listError,
    error: listErrorObj,
    refetch: refetchList,
  } = useQuery({
    queryKey: ["price-list", { category: safeActiveCategory, region: region !== "__all__" ? region : undefined, spec: spec || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }],
    queryFn: () =>
      getPriceList({
        category: safeActiveCategory,
        region: region !== "__all__" ? region : undefined,
        spec: spec || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    enabled: viewMode === "list",
    staleTime: 1000 * 60 * 2,
  });

  const groupedPrices = useMemo(() => {
    if (!listData?.items) return [];
    return groupPrices(listData.items);
  }, [listData]);

  const totalPages = useMemo(() => {
    if (!listData?.total) return 1;
    return Math.max(1, Math.ceil(listData.total / PAGE_SIZE));
  }, [listData]);

  // ============================================================
  // 走势视图数据
  // ============================================================
  const {
    data: trendApiData,
    isLoading: trendLoading,
    isError: trendError,
    error: trendErrorObj,
    refetch: refetchTrend,
  } = useQuery({
    queryKey: ["price-trend", { category: safeActiveCategory, spec: spec || undefined, region: region || undefined, days: trendDays }],
    queryFn: () =>
      getPriceTrend({
        category: safeActiveCategory,
        spec: spec || undefined,
        region: region || undefined,
        days: trendDays,
      }),
    enabled: viewMode === "trend",
    staleTime: 1000 * 60 * 2,
  });

  const trendData = useMemo(() => {
    if (!trendApiData) return { points: [] as TrendCardDataPoint[], changePct: undefined };
    return mapTrendData(trendApiData);
  }, [trendApiData]);

  // ============================================================
  // 对比视图数据
  // ============================================================
  const {
    data: compareApiData,
    isLoading: compareLoading,
    isError: compareError,
    error: compareErrorObj,
    refetch: refetchCompare,
  } = useQuery({
    queryKey: ["price-compare", { categories: categories }],
    queryFn: () => comparePrices(categories),
    enabled: viewMode === "compare",
    staleTime: 1000 * 60 * 5,
  });

  const compareData = useMemo(() => {
    if (!compareApiData) return [] as CompareCategory[];
    return mapCompareData(compareApiData);
  }, [compareApiData]);

  // ============================================================
  // 操作回调
  // ============================================================

  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat);
    setPage(1);
  }, []);

  const handleParentCategoryChange = useCallback((parent: string) => {
    setParentCategory(parent);
    setActiveCategory("");
    setPage(1);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setPage(1);
  }, []);

  const handleViewTrend = useCallback(
    (category: string, specStr: string) => (_e: React.MouseEvent) => {
      navigate(`${ROUTE.CHART}?category=${encodeURIComponent(category)}&spec=${encodeURIComponent(specStr)}`);
    },
    [navigate],
  );

  const handlePrevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const handleSearch = useCallback(() => {
    setPage(1);
    if (viewMode === "list") refetchList();
    else if (viewMode === "trend") refetchTrend();
    else refetchCompare();
  }, [viewMode, refetchList, refetchTrend, refetchCompare]);

  // ============================================================
  // 渲染函数
  // ============================================================

  function renderListView() {
    if (listLoading) {
      return <LoadingSkeleton variant="card" count={3} className="space-y-4" />;
    }

    if (listError) {
      return (
        <ErrorState
          message={listErrorObj instanceof Error ? listErrorObj.message : "获取价格列表失败"}
          onRetry={() => refetchList()}
        />
      );
    }

    if (groupedPrices.length === 0) {
      return (
        <div className="flex items-center justify-center py-20">
          <p className="text-[13px] text-steel-muted">暂无价格数据</p>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groupedPrices.map((group) => (
            <PriceCard
              key={`${group.category}-${group.spec}`}
              eyebrow="PRICE"
              title={group.category}
              spec={group.spec}
              prices={group.prices}
              source={group.source}
              priceDate={formatDateFull(group.priceDate)}
              onViewTrend={handleViewTrend(group.category, group.spec)}
            />
          ))}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={handlePrevPage}
          onNext={handleNextPage}
        />
      </>
    );
  }

  function renderTrendView() {
    const trendTitle = [safeActiveCategory, spec].filter(Boolean).join(" · ");

    return (
      <>
        <div className="mb-4">
          <PeriodTabs days={trendDays} onChange={setTrendDays} />
        </div>

        {trendLoading ? (
          <TrendCard title={trendTitle || "价格走势"} data={[]} isLoading />
        ) : trendError ? (
          <ErrorState
            message={trendErrorObj instanceof Error ? trendErrorObj.message : "获取走势数据失败"}
            onRetry={() => refetchTrend()}
          />
        ) : trendData.points.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[13px] text-steel-muted">暂无走势数据</p>
          </div>
        ) : (
          <TrendCard
            title={trendTitle || "价格走势"}
            data={trendData.points}
            changePct={trendData.changePct}
            period={PERIODS.find((p) => p.days === trendDays)?.label}
          />
        )}
      </>
    );
  }

  function renderCompareView() {
    if (compareLoading) {
      return <CompareCard categories={[]} isLoading />;
    }

    if (compareError) {
      return (
        <ErrorState
          message={compareErrorObj instanceof Error ? compareErrorObj.message : "获取对比数据失败"}
          onRetry={() => refetchCompare()}
        />
      );
    }

    if (compareData.length === 0) {
      return (
        <div className="flex items-center justify-center py-20">
          <p className="text-[13px] text-steel-muted">暂无对比数据</p>
        </div>
      );
    }

    return <CompareCard categories={compareData} />;
  }

  // ============================================================
  // 主渲染
  // ============================================================

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader
        title="价格看板"
        onBack={() => navigate(-1)}
      />

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[960px] mx-auto px-3 sm:px-4 py-6">
          {/* 筛选栏 */}
          <div className="mb-5 space-y-3">
            {/* Row 1: 品类 + 品种两级联动（surface 容器包裹，视觉上形成一组） */}
            <div className="flex items-center gap-3 min-w-0 rounded-2xl bg-steel-surface px-3.5 py-2">
              <Select value={parentCategory} onValueChange={handleParentCategoryChange}>
                <SelectTrigger variant="filter" className="shrink-0 w-auto min-w-0" aria-label="品类筛选">
                  <SelectValue placeholder="全部品类" />
                </SelectTrigger>
                <SelectContent variant="filter">
                  <SelectItem value="__all__">全部品类</SelectItem>
                  {parentCategoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[11px] text-steel-muted shrink-0 select-none">品种</span>
              <CategoryTabs
                categories={categories}
                active={safeActiveCategory}
                onChange={handleCategoryChange}
              />
            </div>

            {/* Row 2: 区域 + 规格 + 查询 + 视图切换 */}
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={region}
                onValueChange={(v) => {
                  setRegion(v === "__all__" ? "__all__" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger variant="filter" className="w-auto min-w-0" aria-label="区域筛选">
                  <SelectValue placeholder="全部区域" />
                </SelectTrigger>
                <SelectContent variant="filter">
                  <SelectItem value="__all__">全部区域</SelectItem>
                  {regions.filter((r) => r !== "__all__").map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 rounded-full border border-steel-line px-3 py-1.5 focus-within:border-steel-ink transition-colors duration-150">
                <Search className="size-3.5 text-steel-placeholder shrink-0" strokeWidth={1.75} />
                <input
                  type="text"
                  value={spec}
                  onChange={(e) => setSpec(e.target.value)}
                  placeholder="规格型号"
                  className="bg-transparent border-0 outline-none text-[13px] text-steel-ink placeholder:text-steel-placeholder min-w-0 flex-1"
                  aria-label="规格型号"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleSearch}
                className="rounded-full bg-steel-ink text-steel-canvas px-4 py-1.5 text-[13px] hover:bg-steel-body transition-colors duration-150"
              >
                查询
              </button>

              <div className="sm:ml-auto flex-shrink-0">
                <ViewModeControl mode={viewMode} onChange={handleViewModeChange} />
              </div>
            </div>
          </div>

          {/* 主内容区域 */}
          <div>
            {viewMode === "list" && renderListView()}
            {viewMode === "trend" && renderTrendView()}
            {viewMode === "compare" && renderCompareView()}
          </div>
        </div>
      </div>
    </div>
  );
}