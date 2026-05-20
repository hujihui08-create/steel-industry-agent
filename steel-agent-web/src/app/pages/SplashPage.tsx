import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

import { ROUTE } from "@/app/constants/auth";

export default function SplashPage() {
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      navigate(ROUTE.CHAT, { replace: true });
    }, 1500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-steel-canvas flex items-center justify-center">
      <div
        className="flex flex-col items-center gap-3"
        style={{
          animation: "splash-in 400ms cubic-bezier(.2,.8,.2,1) both",
        }}
      >
        <div className="w-16 h-16 rounded-2xl bg-steel-surface border border-steel-line flex items-center justify-center">
          <Sparkles className="h-10 w-10 text-steel-ink" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <h1 className="text-[40px] leading-[1.1] font-medium text-steel-ink">
          钢铁Agent
        </h1>
        <p className="text-[15px] leading-[1.6] text-steel-muted">
          钢铁行业智能助手
        </p>
      </div>
    </div>
  );
}
