// ============================================================
// 价格预警 Zustand 状态管理
// 管理预警列表、获取与删除
// ============================================================

import { create } from "zustand";
import type { PriceAlert } from "@/app/types/alert";
import {
  getAlertList,
  deleteAlert,
  createAlert as createAlertApi,
  updateAlert as updateAlertApi,
  type CreateAlertParams,
  type UpdateAlertParams,
} from "@/app/api/alerts";

interface AlertState {
  alerts: PriceAlert[];
  isLoading: boolean;
  error: string | null;

  fetchAlerts: () => Promise<void>;
  createAlert: (data: CreateAlertParams) => Promise<PriceAlert>;
  updateAlert: (id: string, data: UpdateAlertParams) => Promise<PriceAlert>;
  deleteAlert: (id: string) => Promise<void>;
  reset: () => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  isLoading: false,
  error: null,

  fetchAlerts: async () => {
    set({ isLoading: true, error: null });
    try {
      const alerts = await getAlertList();
      set({ alerts, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "获取预警列表失败";
      set({ error: message, isLoading: false });
    }
  },

  createAlert: async (data: CreateAlertParams) => {
    set({ isLoading: true, error: null });
    try {
      const newAlert = await createAlertApi(data);
      const { alerts } = get();
      set({ alerts: [newAlert, ...alerts], isLoading: false });
      return newAlert;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "创建预警失败";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  updateAlert: async (id: string, data: UpdateAlertParams) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAlert = await updateAlertApi(id, data);
      const { alerts } = get();
      set({
        alerts: alerts.map((a) => (a.id === id ? updatedAlert : a)),
        isLoading: false,
      });
      return updatedAlert;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "更新预警失败";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  deleteAlert: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteAlert(id);
      const { alerts } = get();
      set({
        alerts: alerts.filter((a) => a.id !== id),
        isLoading: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "删除预警失败";
      set({ error: message, isLoading: false });
    }
  },

  reset: () =>
    set({
      alerts: [],
      isLoading: false,
      error: null,
    }),
}));
