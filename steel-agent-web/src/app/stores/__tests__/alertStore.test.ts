// ============================================================
// 价格预警 Zustand Store 单元测试
// 覆盖：fetchAlerts / createAlert / updateAlert / deleteAlert / reset
// ============================================================

import { act } from "@testing-library/react";
import { useAlertStore } from "@/app/stores/alertStore";
import { vi } from "vitest";

// ---------------------------------------------------------------------------
// hoisted 变量 —— vi.mock 工厂内引用时必须是 hoisted 的
// ---------------------------------------------------------------------------
const {
  mockGetAlertList,
  mockCreateAlert,
  mockUpdateAlert,
  mockDeleteAlert,
} = vi.hoisted(() => ({
  mockGetAlertList: vi.fn(),
  mockCreateAlert: vi.fn(),
  mockUpdateAlert: vi.fn(),
  mockDeleteAlert: vi.fn(),
}));

vi.mock("@/app/api/alerts", () => ({
  getAlertList: mockGetAlertList,
  createAlert: mockCreateAlert,
  updateAlert: mockUpdateAlert,
  deleteAlert: mockDeleteAlert,
}));

// ---------------------------------------------------------------------------
// 辅助：构造一个完整的 PriceAlert 对象
// ---------------------------------------------------------------------------
function makeAlert(overrides: Partial<typeof sampleAlert> = {}) {
  return {
    id: 1,
    category: "螺纹钢",
    spec: "HRB400E 20mm",
    region: "上海",
    target_price: 4200,
    condition: "above" as const,
    is_active: true,
    created_at: "2026-05-26T10:00:00+08:00",
    ...overrides,
  };
}

const sampleAlert = makeAlert();

// ---------------------------------------------------------------------------
// 每个测试前重置 store + mock
// ---------------------------------------------------------------------------
beforeEach(() => {
  useAlertStore.getState().reset();
  vi.clearAllMocks();
});

// ===========================================================================
// 1. fetchAlerts
// ===========================================================================
describe("fetchAlerts", () => {
  it("success: should set alerts and isLoading=false", async () => {
    mockGetAlertList.mockResolvedValue([sampleAlert]);

    expect(useAlertStore.getState().alerts).toHaveLength(0);

    await act(async () => {
      await useAlertStore.getState().fetchAlerts();
    });

    const state = useAlertStore.getState();
    expect(state.alerts).toEqual([sampleAlert]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("success: should handle empty list", async () => {
    mockGetAlertList.mockResolvedValue([]);

    await act(async () => {
      await useAlertStore.getState().fetchAlerts();
    });

    const state = useAlertStore.getState();
    expect(state.alerts).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("error: should set error message when API rejects", async () => {
    mockGetAlertList.mockRejectedValue(new Error("网络错误"));

    await act(async () => {
      await useAlertStore.getState().fetchAlerts();
    });

    const state = useAlertStore.getState();
    expect(state.error).toBe("网络错误");
    expect(state.isLoading).toBe(false);
    expect(state.alerts).toEqual([]);
  });

  it("error: should handle non-Error rejection", async () => {
    mockGetAlertList.mockRejectedValue("非标准错误");

    await act(async () => {
      await useAlertStore.getState().fetchAlerts();
    });

    const state = useAlertStore.getState();
    expect(state.error).toBe("获取预警列表失败");
    expect(state.isLoading).toBe(false);
  });
});

// ===========================================================================
// 2. createAlert
// ===========================================================================
describe("createAlert", () => {
  const createParams = {
    category: "热卷",
    spec: "Q235B 5.75mm",
    region: "广州",
    target_price: 3800,
    condition: "below" as const,
  };

  it("success: should prepend new alert and return it", async () => {
    const newAlert = makeAlert({ id: 2, ...createParams });

    // 先放入一个已有报警
    useAlertStore.setState({ alerts: [sampleAlert] });

    mockCreateAlert.mockResolvedValue(newAlert);

    let result: Awaited<ReturnType<typeof useAlertStore.getState>["createAlert"]>;

    await act(async () => {
      result = await useAlertStore.getState().createAlert(createParams);
    });

    const state = useAlertStore.getState();
    expect(result!).toEqual(newAlert);
    expect(state.alerts).toHaveLength(2);
    expect(state.alerts[0]).toEqual(newAlert); // 新报警在数组开头
    expect(state.alerts[1]).toEqual(sampleAlert);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("success: should work on empty alerts list", async () => {
    const newAlert = makeAlert({ id: 1, ...createParams });
    mockCreateAlert.mockResolvedValue(newAlert);

    await act(async () => {
      await useAlertStore.getState().createAlert(createParams);
    });

    const state = useAlertStore.getState();
    expect(state.alerts).toEqual([newAlert]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("error: should set error and throw", async () => {
    mockCreateAlert.mockRejectedValue(new Error("创建预警失败"));

    await act(async () => {
      try {
        await useAlertStore.getState().createAlert(createParams);
      } catch {}
    });

    const state = useAlertStore.getState();
    expect(state.error).toBe("创建预警失败");
    expect(state.isLoading).toBe(false);
    expect(state.alerts).toEqual([]);
  });

  it("error: should set error in store instead of rethrowing", async () => {
    const err = new Error("服务端错误");
    mockCreateAlert.mockRejectedValue(err);

    await act(async () => {
      await useAlertStore.getState().createAlert(createParams);
    });

    expect(useAlertStore.getState().error).toBe("服务端错误");
    expect(useAlertStore.getState().isLoading).toBe(false);
  });
});

// ===========================================================================
// 3. updateAlert
// ===========================================================================
describe("updateAlert", () => {
  const updateParams = { target_price: 5000 };

  it("success: should replace the matched alert", async () => {
    const existing1 = makeAlert({ id: 1, category: "螺纹钢" });
    const existing2 = makeAlert({ id: 2, category: "热卷" });
    useAlertStore.setState({ alerts: [existing1, existing2] });

    const updated = makeAlert({ id: 1, category: "螺纹钢", target_price: 5000 });
    mockUpdateAlert.mockResolvedValue(updated);

    let result: Awaited<ReturnType<typeof useAlertStore.getState>["updateAlert"]>;

    await act(async () => {
      result = await useAlertStore.getState().updateAlert(1, updateParams);
    });

    const state = useAlertStore.getState();
    expect(result!).toEqual(updated);
    expect(state.alerts).toHaveLength(2);
    expect(state.alerts.find((a) => a.id === 1)).toEqual(updated);
    expect(state.alerts.find((a) => a.id === 2)).toEqual(existing2);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("success: should replace all items with matching id (map behaviour)", async () => {
    const a1 = makeAlert({ id: 1, target_price: 4000 });
    const a2 = makeAlert({ id: 1, target_price: 4000 }); // 同名id
    useAlertStore.setState({ alerts: [a1, a2] });

    const updated = makeAlert({ id: 1, target_price: 5000 });
    mockUpdateAlert.mockResolvedValue(updated);

    await act(async () => {
      await useAlertStore.getState().updateAlert(1, updateParams);
    });

    const state = useAlertStore.getState();
    expect(state.alerts).toHaveLength(2);
    // map 会替换所有 id===1 的元素
    expect(state.alerts[0].target_price).toBe(5000);
    expect(state.alerts[1].target_price).toBe(5000);
  });

  it("success: should leave list unchanged when id not found", async () => {
    const existing = makeAlert({ id: 1, category: "螺纹钢" });
    useAlertStore.setState({ alerts: [existing] });

    const updated = makeAlert({ id: 999, category: "不存在" });
    mockUpdateAlert.mockResolvedValue(updated);

    await act(async () => {
      await useAlertStore.getState().updateAlert(999, updateParams);
    });

    const state = useAlertStore.getState();
    expect(state.alerts).toEqual([existing]);
  });

  it("error: should set error and throw", async () => {
    useAlertStore.setState({ alerts: [sampleAlert] });
    mockUpdateAlert.mockRejectedValue(new Error("更新预警失败"));

    await act(async () => {
      try {
        await useAlertStore.getState().updateAlert(1, updateParams);
      } catch {}
    });

    const state = useAlertStore.getState();
    expect(state.error).toBe("更新预警失败");
    expect(state.isLoading).toBe(false);
    expect(state.alerts).toEqual([sampleAlert]); // 原始数据不变
  });
});

// ===========================================================================
// 4. deleteAlert
// ===========================================================================
describe("deleteAlert", () => {
  it("success: should remove the alert by id", async () => {
    const a1 = makeAlert({ id: 1, category: "螺纹钢" });
    const a2 = makeAlert({ id: 2, category: "热卷" });
    useAlertStore.setState({ alerts: [a1, a2] });

    mockDeleteAlert.mockResolvedValue(undefined);

    await act(async () => {
      await useAlertStore.getState().deleteAlert(1);
    });

    const state = useAlertStore.getState();
    expect(state.alerts).toEqual([a2]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("success: should leave list unchanged when id not found", async () => {
    const a1 = makeAlert({ id: 1 });
    useAlertStore.setState({ alerts: [a1] });

    mockDeleteAlert.mockResolvedValue(undefined);

    await act(async () => {
      await useAlertStore.getState().deleteAlert(999);
    });

    const state = useAlertStore.getState();
    expect(state.alerts).toEqual([a1]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("success: should result in empty array when deleting last alert", async () => {
    useAlertStore.setState({ alerts: [sampleAlert] });

    mockDeleteAlert.mockResolvedValue(undefined);

    await act(async () => {
      await useAlertStore.getState().deleteAlert(1);
    });

    const state = useAlertStore.getState();
    expect(state.alerts).toEqual([]);
  });

  it("error: should set error and NOT mutate alerts", async () => {
    useAlertStore.setState({ alerts: [sampleAlert] });
    mockDeleteAlert.mockRejectedValue(new Error("删除预警失败"));

    await act(async () => {
      await useAlertStore.getState().deleteAlert(1);
    });

    const state = useAlertStore.getState();
    expect(state.error).toBe("删除预警失败");
    expect(state.isLoading).toBe(false);
    expect(state.alerts).toEqual([sampleAlert]); // 原数组不变
  });
});

// ===========================================================================
// 5. reset
// ===========================================================================
describe("reset", () => {
  it("should clear alerts, error, and set isLoading=false", () => {
    // 先设置一些数据
    useAlertStore.setState({
      alerts: [sampleAlert],
      isLoading: true,
      error: "某个错误",
    });

    act(() => {
      useAlertStore.getState().reset();
    });

    const state = useAlertStore.getState();
    expect(state.alerts).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("should be idempotent - calling reset twice works", () => {
    useAlertStore.setState({
      alerts: [sampleAlert],
      isLoading: true,
      error: "某个错误",
    });

    act(() => {
      useAlertStore.getState().reset();
    });

    act(() => {
      useAlertStore.getState().reset();
    });

    const state = useAlertStore.getState();
    expect(state.alerts).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });
});

// ===========================================================================
// 6. complete flow: create -> read -> update -> delete -> reset
// ===========================================================================
describe("complete flow", () => {
  it("should handle create → update → delete → reset in sequence", async () => {
    const newAlert = makeAlert({ id: 1, category: "螺纹钢" });
    const updatedAlert = makeAlert({ id: 1, category: "螺纹钢", target_price: 4500 });

    mockCreateAlert.mockResolvedValue(newAlert);
    mockUpdateAlert.mockResolvedValue(updatedAlert);
    mockDeleteAlert.mockResolvedValue(undefined);

    // 1. create
    await act(async () => {
      await useAlertStore.getState().createAlert({
        category: "螺纹钢",
        spec: "HRB400E 20mm",
        region: "上海",
        target_price: 4200,
        condition: "above",
      });
    });
    expect(useAlertStore.getState().alerts).toEqual([newAlert]);

    // 2. update
    await act(async () => {
      await useAlertStore.getState().updateAlert(1, { target_price: 4500 });
    });
    expect(useAlertStore.getState().alerts).toEqual([updatedAlert]);

    // 3. delete
    await act(async () => {
      await useAlertStore.getState().deleteAlert(1);
    });
    expect(useAlertStore.getState().alerts).toEqual([]);

    // 4. reset
    act(() => {
      useAlertStore.getState().reset();
    });
    expect(useAlertStore.getState().alerts).toEqual([]);
    expect(useAlertStore.getState().isLoading).toBe(false);
    expect(useAlertStore.getState().error).toBeNull();
  });
});
