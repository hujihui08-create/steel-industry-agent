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
  // Loading counter prevents premature isLoading=false when
  // multiple async operations are in flight concurrently.
  _loadingCount: number;
  isLoading: boolean;
  error: string | null;

  _startLoading: () => void;
  _endLoading: () => void;

  fetchAlerts: () => Promise<void>;
  createAlert: (data: CreateAlertParams) => Promise<PriceAlert>;
  updateAlert: (id: number, data: UpdateAlertParams) => Promise<PriceAlert>;
  deleteAlert: (id: number) => Promise<void>;
  reset: () => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  _loadingCount: 0,
  isLoading: false,
  error: null,

  _startLoading: () => {
    const count = get()._loadingCount + 1;
    set({ _loadingCount: count, isLoading: true });
  },

  _endLoading: () => {
    const count = Math.max(0, get()._loadingCount - 1);
    set({ _loadingCount: count, isLoading: count > 0 });
  },

  fetchAlerts: async () => {
    get()._startLoading();
    set({ error: null });
    try {
      const alerts = await getAlertList();
      set({ alerts });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "获取预警列表失败";
      set({ error: message });
    } finally {
      get()._endLoading();
    }
  },

  createAlert: async (data: CreateAlertParams) => {
    get()._startLoading();
    set({ error: null });
    try {
      const newAlert = await createAlertApi(data);
      const { alerts } = get();
      set({ alerts: [newAlert, ...alerts] });
      return newAlert;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "创建预警失败";
      set({ error: message });
      return {} as PriceAlert;
    } finally {
      get()._endLoading();
    }
  },

  updateAlert: async (id: number, data: UpdateAlertParams) => {
    get()._startLoading();
    set({ error: null });
    try {
      const updatedAlert = await updateAlertApi(id, data);
      const { alerts } = get();
      set({
        alerts: alerts.map((a) => (a.id === id ? updatedAlert : a)),
      });
      return updatedAlert;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "更新预警失败";
      set({ error: message });
      return {} as PriceAlert;
    } finally {
      get()._endLoading();
    }
  },

  deleteAlert: async (id: number) => {
    get()._startLoading();
    set({ error: null });
    try {
      await deleteAlert(id);
      const { alerts } = get();
      set({
        alerts: alerts.filter((a) => a.id !== id),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "删除预警失败";
      set({ error: message });
    } finally {
      get()._endLoading();
    }
  },

  reset: () =>
    set({
      alerts: [],
      _loadingCount: 0,
      isLoading: false,
      error: null,
    }),
}));
