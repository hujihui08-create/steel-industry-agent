import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  RefreshCw,
  Database,
  FileText,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageShell } from "./AdminPageShell";
import { AdminTable, type TableColumn } from "./AdminTable";
import { AdminStatCard } from "./AdminStatCard";
import { AdminModal } from "./AdminModal";
import { AdminLoading } from "./AdminLoading";
import { AdminEmpty } from "./AdminEmpty";
import { AdminStatusBadge } from "./AdminStatusBadge";
import { showSuccessToast, showErrorToast, showWarningToast } from "./AdminToast";
import * as adminKnowledgeApi from "@/app/api/admin-knowledge";
import type { KnowledgeItem, KnowledgeStats, KnowledgeDetail } from "@/app/types/knowledge";

const TYPE_OPTIONS = [
  { value: "", label: "全部类型" },
  { value: "standard", label: "标准" },
  { value: "grade", label: "牌号" },
  { value: "term", label: "术语" },
  { value: "tool", label: "工具" },
];

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "pending", label: "待向量化" },
  { value: "vectorized", label: "已向量化" },
  { value: "failed", label: "失败" },
];

const PAGE_SIZE = 20;

export default function KnowledgeManage() {
  const [data, setData] = useState<KnowledgeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [detailData, setDetailData] = useState<KnowledgeDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({ type: "standard", title: "", category: "", standard_no: "", content: "", keywords: "", vectorize: false });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importContent, setImportContent] = useState("");
  const [importAutoVectorize, setImportAutoVectorize] = useState(true);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importDragOver, setImportDragOver] = useState(false);
  const [importMode, setImportMode] = useState<"file" | "text">("file");
  const [importLoading, setImportLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { list, total: t } = await adminKnowledgeApi.adminListKnowledge({
        type: filterType || undefined,
        status: filterStatus || undefined,
        category: filterCategory || undefined,
        keyword: searchKeyword || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setData(list ?? []);
      setTotal(t);
    } catch { showErrorToast("加载知识库失败"); } finally { setLoading(false); }
  }, [page, searchKeyword, filterType, filterStatus, filterCategory]);

  const loadStats = useCallback(async () => {
    try { setStats(await adminKnowledgeApi.adminGetKnowledgeStats()); } catch { /* silent */ }
  }, []);

  useEffect(() => { loadData(); loadStats(); }, [loadData, loadStats]);

  const handleSearch = () => { setPage(1); loadData(); };
  const handleFilterChange = (setter: (v: string) => void, value: string) => { setter(value); setPage(1); setTimeout(() => loadData(), 0); };

  const openCreateModal = () => { setIsEditing(false); setFormData({ type: "standard", title: "", category: "", standard_no: "", content: "", keywords: "", vectorize: false }); setFormModalOpen(true); };
  const openEditModal = (item: KnowledgeItem) => {
    setIsEditing(true);
    setFormData({ type: item.type, title: item.title, category: item.category ?? "", standard_no: item.standard_no ?? "", content: typeof item.content === "string" ? item.content : "", keywords: item.keywords ?? "", vectorize: false });
    setFormModalOpen(true);
  };

  const handleFormSubmit = useCallback(async () => {
    setFormLoading(true);
    try {
      if (isEditing && selectedItem) {
        await adminKnowledgeApi.adminUpdateKnowledge(selectedItem.id, formData);
        if (formData.vectorize) await adminKnowledgeApi.adminTriggerVectorization(selectedItem.id);
        showSuccessToast("文档已更新");
      } else {
        const created = await adminKnowledgeApi.adminCreateKnowledge(formData);
        if (formData.vectorize) await adminKnowledgeApi.adminTriggerVectorization(created.id);
        showSuccessToast("文档已创建");
      }
      setFormModalOpen(false);
      loadData();
      loadStats();
    } catch { showErrorToast(isEditing ? "更新失败" : "创建失败"); } finally { setFormLoading(false); }
  }, [isEditing, selectedItem, formData, loadData, loadStats]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try { await adminKnowledgeApi.adminDeleteKnowledge(deleteTarget.id); showSuccessToast("已删除"); setDeleteModalOpen(false); loadData(); loadStats(); } catch { showErrorToast("删除失败"); } finally { setDeleteLoading(false); }
  }, [deleteTarget, loadData, loadStats]);

  const handleBatchImport = useCallback(async () => {
    setImportLoading(true);
    try {
      if (importMode === "file" && importFiles.length > 0) {
        const result = await adminKnowledgeApi.adminUploadFiles(importFiles, importAutoVectorize);
        showSuccessToast(`导入成功，共 ${result.count} 个文档`);
      } else if (importContent.trim()) {
        const lines = importContent.trim().split("\n").filter(Boolean);
        const files = lines.map((line) => { const p = line.split("|").map(s => s.trim()); return { file_name: p[0] ?? "未命名", content: p[5] ?? p.join(" ") }; });
        if (files.length === 0) { showWarningToast("未解析到有效文档"); return; }
        const result = await adminKnowledgeApi.adminBatchImport({ files, auto_vectorize: importAutoVectorize });
        showSuccessToast(`导入成功，共 ${result.count} 个文档`);
      } else { showWarningToast("请选择文件或输入文档内容"); return; }
      setImportModalOpen(false); setImportContent(""); setImportFiles([]); setPage(1); loadData(); loadStats();
    } catch { showErrorToast("批量导入失败"); } finally { setImportLoading(false); }
  }, [importContent, importAutoVectorize, importFiles, importMode, loadData, loadStats]);

  const openDetail = async (item: KnowledgeItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
    try { setDetailData(await adminKnowledgeApi.adminGetKnowledgeDetail(item.id)); } catch { setDetailData(null); }
  };

  const columns: TableColumn<KnowledgeItem>[] = [
    { key: "title" as keyof KnowledgeItem, title: "标题", render: (_: unknown, row: KnowledgeItem) => (
      <span className="text-[13px] leading-[1.5] text-[#0A0A0A] cursor-pointer hover:underline">{row.title}</span>
    )},
    { key: "type" as keyof KnowledgeItem, title: "类型", render: (v: unknown) => (
      <AdminStatusBadge status={(v as string) === "standard" ? "active" : (v as string) === "grade" ? "success" : "normal"} label={(v as string) === "standard" ? "标准" : (v as string) === "grade" ? "牌号" : (v as string) === "term" ? "术语" : String(v)} />
    )},
    { key: "category" as keyof KnowledgeItem, title: "分类", render: (v: unknown) => <span className="text-[13px] text-[#404040]">{String(v ?? "—")}</span> },
    { key: "status" as keyof KnowledgeItem, title: "状态", render: (v: unknown) => {
      const s = v as string;
      return <AdminStatusBadge status={s === "vectorized" ? "success" : s === "failed" ? "error" : "warning"} label={s === "vectorized" ? "已向量化" : s === "failed" ? "失败" : "待处理"} />;
    }},
    { key: "chunk_count" as keyof KnowledgeItem, title: "分块数", render: (v: unknown) => <span className="text-[13px] text-[#404040]">{String(v ?? 0)}</span> },
    { key: "updated_at" as keyof KnowledgeItem, title: "更新时间", render: (v: unknown) => <span className="text-[12px] text-[#737373]">{String(v ?? "").slice(0, 10)}</span> },
    { key: "actions" as keyof KnowledgeItem, title: "操作", render: (_: unknown, row: KnowledgeItem) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { setSelectedItem(row); openEditModal(row); }} className="p-1 rounded hover:bg-[#FAFAFA] text-[#737373] hover:text-[#0A0A0A]"><Pencil size={14} strokeWidth={1.75} /></button>
        <button onClick={() => { setDeleteTarget(row); setDeleteModalOpen(true); }} className="p-1 rounded hover:bg-[#FAFAFA] text-[#737373] hover:text-[#B42318]"><Trash2 size={14} strokeWidth={1.75} /></button>
      </div>
    )},
  ];

  return (
    <AdminPageShell title="知识库管理" breadcrumbs={[{ label: "首页", path: "/admin" }, { label: "数据管理" }, { label: "知识库管理" }]}>
      <div className="flex flex-col gap-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <AdminStatCard icon={<Database size={16} strokeWidth={1.75} />} label="文档总数" value={stats.total} />
            <AdminStatCard icon={<CheckCircle2 size={16} strokeWidth={1.75} />} label="已向量化" value={stats.vectorized} />
            <AdminStatCard icon={<AlertCircle size={16} strokeWidth={1.75} />} label="待处理" value={stats.pending} />
            <AdminStatCard icon={<XCircle size={16} strokeWidth={1.75} />} label="向量维度" value={isNaN(Number(stats.vector_dimension)) ? 1536 : stats.vector_dimension} />
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} strokeWidth={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
            <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }} placeholder="搜索标题、关键词..."
              className={cn("w-[200px] h-8 pl-8 pr-3 rounded-[10px] border border-[#E5E5E5] bg-white text-[13px] leading-[1.5] text-[#404040] placeholder:text-[#A3A3A3] outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10 transition-colors duration-150")} />
          </div>
          <Select value={filterType || "all"} onValueChange={(v) => handleFilterChange(setFilterType, v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-[110px] rounded-[10px] border-[#E5E5E5] bg-white text-[13px] text-[#404040] focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A]/10">
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent className="border-[#E5E5E5] rounded-[10px]">
              <SelectItem value="all" className="text-[13px]">全部类型</SelectItem>
              {TYPE_OPTIONS.filter(o => o.value !== "").map(o => <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus || "all"} onValueChange={(v) => handleFilterChange(setFilterStatus, v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-[110px] rounded-[10px] border-[#E5E5E5] bg-white text-[13px] text-[#404040] focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A]/10">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent className="border-[#E5E5E5] rounded-[10px]">
              <SelectItem value="all" className="text-[13px]">全部状态</SelectItem>
              {STATUS_OPTIONS.filter(o => o.value !== "").map(o => <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <input type="text" value={filterCategory} onChange={(e) => handleFilterChange(setFilterCategory, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }} placeholder="输入分类..."
            className="h-8 px-3 rounded-[10px] w-[120px] border border-[#E5E5E5] bg-white text-[13px] text-[#404040] placeholder:text-[#A3A3A3] outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10 transition-colors duration-150" />
          <button type="button" onClick={handleSearch}
            className={cn("h-8 px-3 rounded-md bg-[#0A0A0A] text-white text-[13px] leading-[1.5] hover:bg-[#404040] transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10")}>搜索</button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={openCreateModal}
              className={cn("inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[#E5E5E5] text-[13px] text-[#404040] hover:bg-[#FAFAFA] hover:border-[#0A0A0A] transition-colors duration-150")}>
              <Plus size={14} strokeWidth={1.75} />添加文档</button>
            <button type="button" onClick={() => { setImportContent(""); setImportFiles([]); setImportAutoVectorize(true); setImportMode("file"); setImportModalOpen(true); }}
              className={cn("inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[#E5E5E5] text-[13px] text-[#404040] hover:bg-[#FAFAFA] hover:border-[#0A0A0A] transition-colors duration-150")}>
              <Upload size={14} strokeWidth={1.75} />批量导入</button>
            <button type="button" onClick={() => { loadData(); loadStats(); }}
              className={cn("inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[#E5E5E5] text-[13px] text-[#404040] hover:bg-[#FAFAFA] hover:border-[#0A0A0A] transition-colors duration-150")}>
              <RefreshCw size={14} strokeWidth={1.75} />刷新</button>
          </div>
          <button type="button"
            className={cn("inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[#E5E5E5] text-[13px] text-[#404040] hover:bg-[#FAFAFA] hover:border-[#0A0A0A] transition-colors duration-150")}>
            <Download size={14} strokeWidth={1.75} />导出</button>
        </div>

        {/* Table */}
        {loading ? <AdminLoading /> : (data ?? []).length === 0 ? <AdminEmpty /> : (
          <AdminTable<KnowledgeItem>
            columns={columns}
            data={data}
            onRowClick={(row: KnowledgeItem) => openDetail(row)}
          />
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#737373]">共 {total} 条</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="h-8 px-3 rounded-md border border-[#E5E5E5] text-[13px] text-[#404040] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#0A0A0A]">上一页</button>
              <span className="text-[13px] text-[#404040]">{page} / {Math.ceil(total / PAGE_SIZE)}</span>
              <button disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}
                className="h-8 px-3 rounded-md border border-[#E5E5E5] text-[13px] text-[#404040] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#0A0A0A]">下一页</button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AdminModal open={formModalOpen} onOpenChange={setFormModalOpen} title={isEditing ? "编辑文档" : "添加文档"} confirmLabel={isEditing ? "保存" : "创建"} onConfirm={handleFormSubmit} loading={formLoading} size="md">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-[#737373]">文档类型</label>
              <Select value={formData.type} onValueChange={(v) => setFormData(p => ({ ...p, type: v }))}>
                <SelectTrigger className="h-9 rounded-[10px] border-[#E5E5E5] bg-white text-[13px] text-[#404040] focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A]/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#E5E5E5] rounded-[10px]">
                  {TYPE_OPTIONS.filter(o => o.value !== "").map(o => <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-[#737373]">所属分类</label>
              <input type="text" value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))} placeholder="如：建筑用钢"
                className="h-9 px-3 rounded-[10px] border border-[#E5E5E5] bg-white text-[13px] text-[#404040] placeholder:text-[#A3A3A3] outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10 transition-colors duration-150" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#737373]">文档标题</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="输入文档标题"
              className="h-9 px-3 rounded-[10px] border border-[#E5E5E5] bg-white text-[13px] text-[#404040] placeholder:text-[#A3A3A3] outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10 transition-colors duration-150" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#737373]">标准编号</label>
            <input type="text" value={formData.standard_no} onChange={(e) => setFormData(p => ({ ...p, standard_no: e.target.value }))} placeholder="如：GB/T 700"
              className="h-9 px-3 rounded-[10px] border border-[#E5E5E5] bg-white text-[13px] text-[#404040] font-mono placeholder:text-[#A3A3A3] outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10 transition-colors duration-150" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#737373]">关键词</label>
            <input type="text" value={formData.keywords} onChange={(e) => setFormData(p => ({ ...p, keywords: e.target.value }))} placeholder="逗号分隔多个关键词"
              className="h-9 px-3 rounded-[10px] border border-[#E5E5E5] bg-white text-[13px] text-[#404040] placeholder:text-[#A3A3A3] outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10 transition-colors duration-150" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#737373]">文档内容 (Markdown)</label>
            <textarea value={formData.content} onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))} rows={8} placeholder="输入文档内容..."
              className="w-full px-3 py-2.5 rounded-[10px] border border-[#E5E5E5] bg-white text-[13px] leading-[1.6] text-[#404040] placeholder:text-[#A3A3A3] resize-y outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10 transition-colors duration-150" />
          </div>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <Checkbox id="form-vectorize" checked={formData.vectorize} onCheckedChange={(v) => setFormData(p => ({ ...p, vectorize: v === true }))} />
              <label htmlFor="form-vectorize" className="text-[13px] text-[#404040] cursor-pointer select-none">创建后立即向量化</label>
            </div>
          )}
        </div>
      </AdminModal>

      {/* Detail Drawer */}
      {detailOpen && selectedItem && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/20" onClick={() => setDetailOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[480px] bg-white border-l border-[#E5E5E5] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5]">
              <h2 className="text-[18px] leading-[1.4] font-medium text-[#0A0A0A]">文档详情</h2>
              <button onClick={() => setDetailOpen(false)} className="p-1 rounded hover:bg-[#FAFAFA]"><X size={18} strokeWidth={1.75} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <span className="text-[11px] tracking-[0.18em] uppercase text-[#737373]">基本信息</span>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between"><span className="text-[13px] text-[#737373]">标题</span><span className="text-[13px] text-[#404040]">{selectedItem.title}</span></div>
                  <div className="flex justify-between"><span className="text-[13px] text-[#737373]">类型</span><span className="text-[13px] text-[#404040]">{selectedItem.type}</span></div>
                  <div className="flex justify-between"><span className="text-[13px] text-[#737373]">分类</span><span className="text-[13px] text-[#404040]">{selectedItem.category ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-[13px] text-[#737373]">标准编号</span><span className="text-[13px] text-[#404040]">{selectedItem.standard_no ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-[13px] text-[#737373]">状态</span><AdminStatusBadge status={selectedItem.status === "vectorized" ? "success" : "warning"} label={selectedItem.status} /></div>
                </div>
              </div>
              <div>
                <span className="text-[11px] tracking-[0.18em] uppercase text-[#737373]">文档内容</span>
                <pre className="mt-3 p-4 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] text-[13px] leading-[1.6] text-[#404040] whitespace-pre-wrap overflow-auto max-h-[300px]">{String(selectedItem.content ?? "")}</pre>
              </div>
              {detailData?.chunks && detailData.chunks.length > 0 && (
                <div>
                  <span className="text-[11px] tracking-[0.18em] uppercase text-[#737373]">向量分块 ({detailData.chunks.length})</span>
                  <div className="mt-3 space-y-2">
                    {detailData.chunks.map((ch, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                        <div className="flex items-center justify-between mb-1"><span className="text-[12px] text-[#737373]">分块 {ch.chunk_index}</span><span className="text-[11px] font-mono text-[#A3A3A3]">{ch.vector_id}</span></div>
                        <p className="text-[13px] leading-[1.6] text-[#404040]">{String(ch.chunk_content).slice(0, 200)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-[#E5E5E5] flex gap-3">
              <button onClick={() => adminKnowledgeApi.adminTriggerVectorization(selectedItem.id).then(() => { showSuccessToast("向量化已触发"); loadStats(); }).catch(() => showErrorToast("操作失败"))}
                className="h-9 px-4 rounded-full border border-[#E5E5E5] text-[13px] text-[#404040] hover:border-[#0A0A0A]">重新向量化</button>
              <button onClick={() => { setDeleteTarget(selectedItem); setDetailOpen(false); setDeleteModalOpen(true); }}
                className="h-9 px-4 rounded-full border border-[#E5E5E5] text-[13px] text-[#B42318] hover:border-[#B42318]">删除文档</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <AdminModal open={deleteModalOpen} onOpenChange={setDeleteModalOpen} title="确认删除" confirmLabel="删除" onConfirm={handleDelete} loading={deleteLoading} size="sm">
        <p className="text-[14px] leading-[1.6] text-[#404040]">确定要删除文档「{deleteTarget?.title}」吗？此操作同时删除关联的向量数据，不可恢复。</p>
      </AdminModal>

      {/* Batch Import Modal */}
      <AdminModal open={importModalOpen} onOpenChange={setImportModalOpen} title="批量导入文档" confirmLabel="开始导入" onConfirm={handleBatchImport} loading={importLoading} size="md">
        <div className="flex flex-col gap-4">
          <div className="flex bg-[#FAFAFA] rounded-full p-1 border border-[#E5E5E5]">
            <button type="button" onClick={() => { setImportMode("file"); setImportFiles([]); }}
              className={cn("flex-1 h-8 rounded-full text-[13px] transition-colors", importMode === "file" ? "bg-[#0A0A0A] text-white" : "text-[#737373] hover:text-[#0A0A0A]")}>上传文件</button>
            <button type="button" onClick={() => { setImportMode("text"); setImportFiles([]); }}
              className={cn("flex-1 h-8 rounded-full text-[13px] transition-colors", importMode === "text" ? "bg-[#0A0A0A] text-white" : "text-[#737373] hover:text-[#0A0A0A]")}>粘贴文本</button>
          </div>
          {importMode === "file" ? (
            <>
              <label className={cn("p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors", importDragOver ? "border-[#0A0A0A] bg-[#FAFAFA]" : "border-[#E5E5E5] bg-[#FAFAFA]")}
                onDragOver={(e) => { e.preventDefault(); setImportDragOver(true); }} onDragLeave={() => setImportDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setImportDragOver(false); const dropped = Array.from(e.dataTransfer.files).filter(f => /\.(pdf|docx|doc|txt|md)$/i.test(f.name)); if (dropped.length) setImportFiles(prev => [...prev, ...dropped]); }}>
                <Upload size={32} strokeWidth={1.75} className="text-[#A3A3A3]" />
                <div className="text-center"><p className="text-[13px] text-[#737373]">拖拽文件到此处，或点击选择</p><p className="text-[11px] text-[#A3A3A3] mt-0.5">支持 .pdf / .docx / .doc / .txt / .md</p></div>
                <input type="file" multiple accept=".pdf,.docx,.doc,.txt,.md" className="hidden" onChange={(e) => { const sel = Array.from(e.target.files ?? []); if (sel.length) setImportFiles(prev => [...prev, ...sel]); e.target.value = ""; }} />
              </label>
              {importFiles.length > 0 && (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {importFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-[#E5E5E5] bg-white">
                      <FileText size={14} strokeWidth={1.75} className="text-[#A3A3A3] shrink-0" />
                      <span className="text-[13px] text-[#404040] truncate flex-1">{f.name}</span>
                      <span className="text-[11px] text-[#A3A3A3] shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      <button type="button" onClick={() => setImportFiles(prev => prev.filter((_, j) => j !== i))} className="text-[#A3A3A3] hover:text-[#B42318]"><X size={14} strokeWidth={1.75} /></button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setImportFiles([])} className="text-[12px] text-[#A3A3A3] hover:text-[#B42318]">清空全部</button>
                    <span className="text-[12px] text-[#A3A3A3]">共 {importFiles.length} 个文件</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <textarea value={importContent} onChange={(e) => setImportContent(e.target.value)} rows={10}
              className="w-full px-3 py-2.5 rounded-[10px] border border-[#E5E5E5] bg-white text-[13px] leading-[1.6] text-[#404040] placeholder:text-[#A3A3A3] resize-y outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10 transition-colors"
              placeholder={["标准文档 | standard | 建筑用钢 | GB/T 700 | Q235B,碳素结构钢 | Q235B是普通碳素结构钢...", "术语文档 | term | 基础知识 |  | 屈服强度,力学性能 | 屈服强度是金属材料发生屈服现象时的屈服极限..."].join("\n")} />
          )}
          <div className="flex items-center gap-2">
            <Checkbox id="import-vectorize" checked={importAutoVectorize} onCheckedChange={(v) => setImportAutoVectorize(v === true)} />
            <label htmlFor="import-vectorize" className="text-[13px] text-[#404040] cursor-pointer select-none">导入后自动向量化</label>
          </div>
        </div>
      </AdminModal>
    </AdminPageShell>
  );
}
