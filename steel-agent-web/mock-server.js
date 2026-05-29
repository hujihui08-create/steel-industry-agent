import http from "http";

const PORT = 8081;

// ============ Mock Data ============

const tenders = [
  {
    id: "1",
    title: "2026年Q2螺纹钢集中采购招标",
    status: "open",
    budget: 5800000,
    description: "本项目为2026年第二季度螺纹钢集中采购，需HRB400E 20mm螺纹钢约1500吨，用于华东地区基础设施建设。要求供应商具备年产能50万吨以上资质，ISO9001质量体系认证。交货期：2026年6月-8月，分三批交付。付款方式：到货验收合格后30天内付90%，质保期满付10%。",
    deadline: "2026-06-15T00:00:00Z",
    bid_deadline: "2026-06-30T00:00:00Z",
    source_url: "https://www.mysteel.com/tender/2026-q2-rebar",
    region: "上海",
    category: "螺纹钢",
  },
  {
    id: "2",
    title: "华南高速桥梁用热轧卷板招标",
    status: "open",
    budget: 12000000,
    description: "华南高速公路桥梁段建设用Q345B热轧卷板采购，厚度范围8-40mm，总需求约3000吨。供应商需具备桥梁用钢生产资质。",
    deadline: "2026-06-20T00:00:00Z",
    bid_deadline: "2026-07-10T00:00:00Z",
    source_url: "https://www.mysteel.com/tender/huanan-bridge",
    region: "广州",
    category: "热卷",
  },
  {
    id: "3",
    title: "北京地铁12号线冷轧薄板采购",
    status: "closed",
    budget: 3500000,
    description: "北京地铁12号线站台装修用冷轧薄板采购，规格SPCC 1.2mm，需求约800吨。",
    deadline: "2026-04-01T00:00:00Z",
    bid_deadline: "2026-04-15T00:00:00Z",
    source_url: "",
    region: "北京",
    category: "冷轧",
  },
  {
    id: "4",
    title: "武汉钢结构厂房中厚板招标",
    status: "open",
    budget: 8900000,
    description: "武汉光谷智能制造产业园钢结构厂房建设中厚板采购，Q355B材质，厚度20-60mm，约2000吨。",
    deadline: "2026-07-01T00:00:00Z",
    bid_deadline: "2026-07-20T00:00:00Z",
    source_url: "https://www.mysteel.com/tender/wuhan-steel",
    region: "武汉",
    category: "中厚板",
  },
  {
    id: "5",
    title: "成都地铁5号线盘螺招标",
    status: "won",
    budget: 4200000,
    description: "成都地铁5号线延长段建设用HRB400盘螺采购，规格8-12mm，约1000吨。已中标：宝武钢铁集团。",
    deadline: "2026-03-10T00:00:00Z",
    bid_deadline: "2026-03-25T00:00:00Z",
    source_url: "",
    region: "成都",
    category: "盘螺",
  },
  {
    id: "6",
    title: "南京过江通道耐候钢采购",
    status: "open",
    budget: 15000000,
    description: "南京长江过江通道建设工程用耐候钢Q355NH采购，需求约4000吨。要求供应商有大型桥梁供货业绩。",
    deadline: "2026-08-01T00:00:00Z",
    bid_deadline: "2026-08-20T00:00:00Z",
    source_url: "https://www.mysteel.com/tender/nanjing-bridge",
    region: "南京",
    category: "耐候钢",
  },
  {
    id: "7",
    title: "杭州亚运场馆续建用不锈钢管招标",
    status: "lost",
    budget: 2800000,
    description: "杭州亚运场馆续建工程装饰用304不锈钢管采购，规格DN25-DN100，约500吨。",
    deadline: "2026-02-01T00:00:00Z",
    bid_deadline: "2026-02-20T00:00:00Z",
    source_url: "",
    region: "杭州",
    category: "不锈钢",
  },
];

const quotations = [
  {
    id: 1,
    title: "螺纹钢采购报价单",
    customer_name: "中铁十二局",
    category: "螺纹钢",
    spec: "HRB400E 20mm",
    quantity: 500,
    unit: "吨",
    material_cost: 1925000,
    process_cost: 75000,
    freight_cost: 12500,
    tax_cost: 261625,
    total_price: 2274125,
    status: "sent",
    delivery_location: "上海市浦东新区",
    created_at: "2026-05-20T10:30:00Z",
  },
  {
    id: 2,
    title: "热卷板报价单-华南项目",
    customer_name: "广东建工集团",
    category: "热卷",
    spec: "Q235B 5.5mm",
    quantity: 800,
    unit: "吨",
    material_cost: 3136000,
    process_cost: 96000,
    freight_cost: 24000,
    tax_cost: 423280,
    total_price: 3679280,
    status: "draft",
    delivery_location: "广州市天河区",
    created_at: "2026-05-22T14:00:00Z",
  },
  {
    id: 3,
    title: "冷轧板报价单-无锡项目",
    customer_name: "无锡精工制造",
    category: "冷轧",
    spec: "SPCC 1.2mm",
    quantity: 300,
    unit: "吨",
    material_cost: 1440000,
    process_cost: 42000,
    freight_cost: 9000,
    tax_cost: 193830,
    total_price: 1684830,
    status: "accepted",
    delivery_location: "无锡市新区",
    created_at: "2026-05-18T09:00:00Z",
  },
  {
    id: 4,
    title: "中厚板报价单-天津项目",
    customer_name: "天津港建设",
    category: "中厚板",
    spec: "Q355B 30mm",
    quantity: 600,
    unit: "吨",
    material_cost: 2640000,
    process_cost: 78000,
    freight_cost: 18000,
    tax_cost: 355680,
    total_price: 3091680,
    status: "rejected",
    delivery_location: "天津市滨海新区",
    created_at: "2026-05-15T16:30:00Z",
  },
];

const alerts = [
  {
    id: 1,
    category: "螺纹钢",
    spec: "HRB400E 20mm",
    region: "上海",
    target_price: 3800,
    condition: "below",
    is_active: true,
    created_at: "2026-05-10T08:00:00Z",
  },
  {
    id: 2,
    category: "热卷",
    spec: "Q235B 5.5mm",
    region: "上海",
    target_price: 4000,
    condition: "above",
    is_active: true,
    created_at: "2026-05-12T10:30:00Z",
  },
  {
    id: 3,
    category: "冷轧",
    spec: "SPCC 1.2mm",
    region: "广州",
    target_price: 4800,
    condition: "below",
    is_active: false,
    created_at: "2026-04-20T14:00:00Z",
  },
  {
    id: 4,
    category: "中厚板",
    spec: "Q355B 30mm",
    region: "北京",
    target_price: 4500,
    condition: "above",
    is_active: true,
    created_at: "2026-05-15T09:00:00Z",
  },
];

const adminPrices = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  category: ["螺纹钢", "热卷", "冷轧", "中厚板", "盘螺", "不锈钢"][i % 6],
  spec: ["HRB400E 20mm", "Q235B 5.5mm", "SPCC 1.2mm", "Q355B 30mm", "HRB400 10mm", "304 DN50"][i % 6],
  region: ["上海", "北京", "广州", "武汉", "成都", "天津"][i % 6],
  price: 3800 + i * 25,
  change: (i % 3 === 0) ? 12 : (i % 3 === 1) ? -8 : 5,
  change_pct: (i % 3 === 0) ? 0.31 : (i % 3 === 1) ? -0.21 : 0.13,
  source: ["Wind终端", "Mysteel", "钢联数据"][i % 3],
  price_date: new Date(Date.now() - i * 86400000).toISOString().split("T")[0],
  created_at: new Date().toISOString(),
}));

// ============ Server ============

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const json = (code, data) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  console.log(`${method} ${path}`);

  try {
    // ---- Tenders ----
    if (method === "GET" && path === "/api/v1/tenders") {
      return json(200, { code: 200, message: "success", data: tenders });
    }
    const tenderMatch = path.match(/^\/api\/v1\/tenders\/(\d+)$/);
    if (method === "GET" && tenderMatch) {
      const tender = tenders.find((t) => t.id === tenderMatch[1]);
      return tender ? json(200, { code: 200, message: "success", data: tender }) : json(404, { code: 404, message: "not found", data: null });
    }
    if (method === "GET" && path === "/api/v1/tenders/favorites") {
      return json(200, { code: 200, message: "success", data: [1, 2, 4, 6] });
    }
    if (method === "POST" && /^\/api\/v1\/tenders\/\d+\/favorite$/.test(path)) {
      return json(200, { code: 200, message: "success", data: null });
    }
    if (method === "DELETE" && /^\/api\/v1\/tenders\/\d+\/favorite$/.test(path)) {
      return json(200, { code: 200, message: "success", data: null });
    }

    // ---- Quotations ----
    if (method === "GET" && path === "/api/v1/quotations") {
      return json(200, { code: 200, message: "success", data: quotations });
    }
    const quotMatch = path.match(/^\/api\/v1\/quotations\/(\d+)$/);
    if (method === "GET" && quotMatch) {
      const q = quotations.find((q) => q.id === Number(quotMatch[1]));
      return q ? json(200, { code: 200, message: "success", data: q }) : json(404, { code: 404, message: "not found", data: null });
    }

    // ---- Alerts ----
    if (method === "GET" && path === "/api/v1/alerts") {
      return json(200, { code: 200, message: "success", data: alerts });
    }
    if (method === "DELETE" && /^\/api\/v1\/alerts\/\d+$/.test(path)) {
      return json(200, { code: 200, message: "success", data: null });
    }

    // ---- Admin Prices ----
    if (method === "GET" && path === "/api/v1/admin/prices") {
      const limit = Number(url.searchParams.get("limit")) || 20;
      const offset = Number(url.searchParams.get("offset")) || 0;
      const page = adminPrices.slice(offset, offset + limit);
      return json(200, { code: 200, message: "success", data: page });
    }
    if (method === "GET" && path === "/api/v1/admin/tenders") {
      const limit = Number(url.searchParams.get("limit")) || 20;
      const offset = Number(url.searchParams.get("offset")) || 0;
      const page = tenders.slice(offset, offset + limit);
      return json(200, { code: 200, message: "success", data: page });
    }
    if (method === "GET" && path === "/api/v1/admin/news") {
      return json(200, { code: 200, message: "success", data: [] });
    }

    // ---- Admin Auth (fake login) ----
    if (method === "POST" && path === "/api/v1/admin/auth/login") {
      return json(200, {
        code: 200,
        message: "success",
        data: { token: "mock-jwt-token-for-admin", nickname: "管理员", role: "super_admin" },
      });
    }
    if (method === "GET" && path === "/api/v1/admin/auth/info") {
      return json(200, {
        code: 200,
        message: "success",
        data: { id: 1, nickname: "管理员", role: "super_admin", avatar: "" },
      });
    }

    // ---- Dashboard stats ----
    if (method === "GET" && path === "/api/v1/admin/dashboard") {
      return json(200, {
        code: 200, message: "success",
        data: { total_users: 1234, active_users: 456, total_messages: 8900, total_api_calls: 12000 },
      });
    }

    // ---- User Auth (password login) ----
    if (method === "POST" && path === "/api/v1/auth/login-password") {
      return json(200, {
        code: 200, message: "success",
        data: { access_token: "mock-user-jwt-token", refresh_token: "mock-refresh-token" },
      });
    }
    if (method === "POST" && path === "/api/v1/auth/sms-code") {
      return json(200, { code: 200, message: "success", data: { code: "123456" } });
    }
    if (method === "POST" && path === "/api/v1/auth/register") {
      return json(200, {
        code: 200, message: "success",
        data: { access_token: "mock-user-jwt-token", refresh_token: "mock-refresh-token" },
      });
    }

    // ---- Calendar ----
    if (method === "GET" && path === "/api/v1/calendar") {
      return json(200, { code: 200, message: "success", data: { dates: [], total: 0 } });
    }

    // ---- Catch-all for other admin APIs ----
    if (path.startsWith("/api/v1/admin/")) {
      // Return empty/success for unhandled admin endpoints
      if (method === "GET") {
        return json(200, { code: 200, message: "success", data: [] });
      }
      return json(200, { code: 200, message: "success", data: null });
    }

    // 404
    console.log(`  -> 404 for ${method} ${path}`);
    json(404, { code: 404, message: `Mock: not found ${path}`, data: null });
  } catch (err) {
    console.error("Mock server error:", err);
    json(500, { code: 500, message: "Mock server error", data: null });
  }
});

server.listen(PORT, () => {
  console.log(`\n Mock API server running at http://localhost:${PORT}`);
  console.log("   GET  /api/v1/tenders         - 7 tenders");
  console.log("   GET  /api/v1/tenders/:id     - tender detail");
  console.log("   GET  /api/v1/tenders/favorites - favorited IDs");
  console.log("   GET  /api/v1/quotations      - 4 quotations");
  console.log("   GET  /api/v1/alerts          - 4 alerts");
  console.log("   GET  /api/v1/admin/prices    - 25 price records");
  console.log("   GET  /api/v1/admin/tenders   - tender admin list");
  console.log("   POST /api/v1/admin/auth/login - mock login\n");
});
