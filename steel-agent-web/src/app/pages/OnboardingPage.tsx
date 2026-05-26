import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, BarChart3, Calculator, Target, Bell, type LucideIcon } from "lucide-react";

import { ROUTE } from "@/app/constants/auth";

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: Sparkles,
    title: "AI 智能对话",
    description: "随时查询钢材价格、行情走势，智能分析市场动态",
  },
  {
    icon: BarChart3,
    title: "价格看板",
    description: "多品种、多地区价格实时对比，走势一目了然",
  },
  {
    icon: Calculator,
    title: "智能报价",
    description: "输入规格参数，AI 自动计算精确报价",
  },
  {
    icon: Target,
    title: "招标信息",
    description: "最新招标公告实时推送，截止时间不错过",
  },
  {
    icon: Bell,
    title: "预警通知",
    description: "设置价格预警，把握市场最佳时机",
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      navigate(ROUTE.CHAT, { replace: true });
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSkip = () => {
    navigate(ROUTE.CHAT, { replace: true });
  };

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <div className="flex justify-end px-5 pt-4">
        <button
          onClick={handleSkip}
          className="text-[15px] text-steel-muted hover:text-steel-ink transition-colors duration-150 h-11 px-3"
        >
          跳过
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-20 h-20 rounded-full bg-steel-surface border border-steel-line flex items-center justify-center mb-8">
          <CurrentIcon className="h-10 w-10 text-steel-ink" strokeWidth={1.75} />
        </div>
        <h2 className="text-[24px] leading-[1.3] font-medium text-steel-ink mb-3 text-center">
          {steps[currentStep].title}
        </h2>
        <p className="text-[15px] leading-[1.6] text-steel-body text-center max-w-[280px]">
          {steps[currentStep].description}
        </p>
      </div>

      <div className="flex justify-center gap-2 py-4">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors duration-150 ${
              index === currentStep
                ? "bg-steel-ink"
                : "border border-steel-line bg-transparent"
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between px-5 pb-8 pt-2">
        <div className="w-16 flex justify-start">
          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              className="text-[15px] text-steel-muted hover:text-steel-ink transition-colors duration-150 h-11"
            >
              上一步
            </button>
          )}
        </div>
        <button
          onClick={handleNext}
          className="bg-steel-ink text-white text-[15px] font-medium rounded-full px-6 h-11 hover:bg-[#404040] transition-colors duration-150 active:scale-[0.97]"
        >
          {isLastStep ? "开始使用" : "下一步"}
        </button>
      </div>
    </div>
  );
}
