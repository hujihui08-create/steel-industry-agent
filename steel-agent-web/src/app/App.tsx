import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { router } from "@/app/router";

// 导入 themeStore 以触发初始化（apply theme class + 监听系统主题变更）
import "@/app/stores/themeStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#FFFFFF",
            color: "#0A0A0A",
            border: "1px solid #E5E5E5",
            borderRadius: "10px",
            fontSize: "14px",
          },
        }}
      />
    </QueryClientProvider>
  );
}
