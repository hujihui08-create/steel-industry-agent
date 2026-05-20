import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { useAuthStore } from "@/app/stores/authStore";
import "./styles/index.css";

// 渲染前从 localStorage 恢复登录态，避免页面闪烁
useAuthStore.getState().hydrate();

createRoot(document.getElementById("root")!).render(<App />);
