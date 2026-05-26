import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  MessageCircle,
  TrendingUp,
  FileText,
  Bell,
  ChevronDown,
  Mail,
  Clock,
  Phone,
  Send,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { submitFeedback } from "@/app/api/feedback";

interface GuideItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

const GUIDE_ITEMS: GuideItem[] = [
  {
    icon: MessageCircle,
    title: "AI 智能对话",
    description: "随时查询钢材价格、行情走势、计算报价",
  },
  {
    icon: TrendingUp,
    title: "价格看板",
    description: "多品种/多地区价格实时对比与走势图",
  },
  {
    icon: FileText,
    title: "招标信息",
    description: "查看最新招标公告与截止时间",
  },
  {
    icon: Bell,
    title: "预警通知",
    description: "设置价格预警，把握市场机会",
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "如何查询钢材价格？",
    answer:
      "在对话界面输入钢材品种和规格，如「查询上海螺纹钢 HRB400E 20mm 价格」",
  },
  {
    question: "如何计算报价？",
    answer: "在对话界面输入「帮我算报价」，按提示输入规格和数量",
  },
  {
    question: "数据多久更新一次？",
    answer: "价格数据每个交易日 9:00 和 14:00 更新",
  },
  {
    question: "如何设置价格预警？",
    answer: "在价格看板或对话中，点击「设置预警」并输入目标价格",
  },
  {
    question: "如何收藏招标信息？",
    answer: "在招标详情页点击「收藏」按钮即可",
  },
];

interface FeedbackFormValues {
  type: string;
  content: string;
  contact: string;
}

const FEEDBACK_TYPES = [
  { value: "bug", label: "Bug 反馈" },
  { value: "suggestion", label: "功能建议" },
  { value: "question", label: "使用问题" },
  { value: "other", label: "其他" },
];

export default function HelpFeedbackPage() {
  const navigate = useNavigate();
  const [expandedFaqs, setExpandedFaqs] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeedbackFormValues>();

  const onFeedbackSubmit = async (data: FeedbackFormValues) => {
    setIsSubmitting(true);
    try {
      await submitFeedback(data);
      toast.success("感谢您的反馈！");
      reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "提交失败，请重试";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFaq = (index: number) => {
    setExpandedFaqs((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader title="帮助与反馈" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-auto">
        {/* =====================================================
            Usage Guide — 使用指南
            ===================================================== */}
        <div className="px-4 pt-6 pb-4">
          <h2 className="text-[18px] leading-[1.4] font-medium text-steel-ink mb-4">
            使用指南
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {GUIDE_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-steel-line bg-steel-canvas p-4"
                >
                  <Icon
                    className="h-5 w-5 text-steel-ink mb-3"
                    strokeWidth={1.75}
                  />
                  <h3 className="text-[15px] leading-[1.6] font-medium text-steel-ink mb-1">
                    {item.title}
                  </h3>
                  <p className="text-[12px] leading-[1.5] text-steel-muted">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* =====================================================
            FAQ — 常见问题
            ===================================================== */}
        <div className="px-4 pt-4 pb-4">
          <h2 className="text-[18px] leading-[1.4] font-medium text-steel-ink mb-4">
            常见问题
          </h2>
          <div className="rounded-2xl border border-steel-line overflow-hidden">
            {FAQ_ITEMS.map((item, index) => {
              const isExpanded = expandedFaqs.includes(index);
              const isLast = index === FAQ_ITEMS.length - 1;

              return (
                <div
                  key={index}
                  className={cn(!isLast && "border-b border-steel-line")}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-steel-surface transition-colors duration-150"
                  >
                    <span className="text-[15px] leading-[1.6] text-steel-ink pr-3">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 text-steel-muted shrink-0 transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                      strokeWidth={1.75}
                    />
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <p className="text-[15px] leading-[1.6] text-steel-body">
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* =====================================================
            Contact — 联系我们
            ===================================================== */}
        <div className="px-4 pt-4 pb-8">
          <h2 className="text-[18px] leading-[1.4] font-medium text-steel-ink mb-4">
            联系我们
          </h2>
          <div className="rounded-2xl border border-steel-line overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-4 border-b border-steel-line">
              <Mail
                className="h-5 w-5 text-steel-muted shrink-0"
                strokeWidth={1.75}
              />
              <span className="text-[12px] leading-[1.5] text-steel-muted w-16 shrink-0">
                反馈邮箱
              </span>
              <span className="text-[15px] leading-[1.6] text-steel-ink">
                feedback@steel-agent.com
              </span>
            </div>
            <div className="flex items-center gap-3 px-4 py-4 border-b border-steel-line">
              <Clock
                className="h-5 w-5 text-steel-muted shrink-0"
                strokeWidth={1.75}
              />
              <span className="text-[12px] leading-[1.5] text-steel-muted w-16 shrink-0">
                客服时间
              </span>
              <span className="text-[15px] leading-[1.6] text-steel-ink">
                工作日 9:00 - 18:00
              </span>
            </div>
            <div className="flex items-center gap-3 px-4 py-4">
              <Phone
                className="h-5 w-5 text-steel-muted shrink-0"
                strokeWidth={1.75}
              />
              <span className="text-[12px] leading-[1.5] text-steel-muted w-16 shrink-0">
                客服电话
              </span>
              <span className="text-[15px] leading-[1.6] text-steel-ink">
                400-888-8888
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4 pb-8">
          <h2 className="text-[18px] leading-[1.4] font-medium text-steel-ink mb-4">
            意见反馈
          </h2>
          <div className="rounded-2xl border border-steel-line bg-white p-5">
            <form onSubmit={handleSubmit(onFeedbackSubmit)} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="feedback-type"
                  className="block text-[14px] font-medium text-steel-ink mb-1.5"
                >
                  反馈类型
                </label>
                <select
                  id="feedback-type"
                  {...register("type", { required: "请选择反馈类型" })}
                  className={`h-11 rounded-xl border px-4 text-[15px] outline-none w-full bg-white ${errors.type ? "border-steel-down" : "border-steel-line focus:border-steel-ink"}`}
                  aria-invalid={!!errors.type}
                >
                  <option value="">请选择反馈类型</option>
                  {FEEDBACK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {errors.type && (
                  <p className="text-steel-down text-[12px] mt-1" role="alert">
                    {errors.type.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="feedback-content"
                  className="block text-[14px] font-medium text-steel-ink mb-1.5"
                >
                  反馈内容
                </label>
                <textarea
                  id="feedback-content"
                  {...register("content", { required: "请填写反馈内容" })}
                  placeholder="请详细描述您的问题或建议..."
                  rows={4}
                  className={`w-full rounded-xl border px-4 py-3 text-[15px] leading-[1.6] outline-none resize-none ${errors.content ? "border-steel-down" : "border-steel-line focus:border-steel-ink"}`}
                  aria-invalid={!!errors.content}
                />
                {errors.content && (
                  <p className="text-steel-down text-[12px] mt-1" role="alert">
                    {errors.content.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="feedback-contact"
                  className="block text-[14px] font-medium text-steel-ink mb-1.5"
                >
                  联系方式（选填）
                </label>
                <input
                  id="feedback-contact"
                  type="text"
                  {...register("contact")}
                  placeholder="手机号或邮箱，方便我们联系您"
                  className="h-11 rounded-xl border border-steel-line bg-white px-4 text-[15px] placeholder:text-steel-placeholder outline-none w-full focus:border-steel-ink"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-steel-ink text-white rounded-full h-12 text-[15px] font-medium hover:bg-steel-body transition-colors duration-150 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" strokeWidth={1.75} />
                {isSubmitting ? "提交中..." : "提交反馈"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
