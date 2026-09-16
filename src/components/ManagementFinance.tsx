import React, { useState, useMemo } from "react";
import { formatRupiah, Product } from "../data";
import {
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Plus,
  Trash2,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Award,
  CreditCard,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

interface ManagementFinanceProps {
  orderHistory: any[];
  expenses: any[];
  setExpenses: any;
  productList: Product[];
  queueSync?: any;
}

const CATEGORY_COLORS = [
  "#D81B60", // Magenta/Pink
  "#0284C7", // Sky blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#6366F1", // Indigo
  "#F97316", // Orange
  "#64748B", // Slate
];

export default function ManagementFinance({
  orderHistory,
  expenses,
  setExpenses,
  productList,
  queueSync,
}: ManagementFinanceProps) {
  const [filter, setFilter] = useState<"DAILY" | "THIS_MONTH" | "ALL" | "CUSTOM">("THIS_MONTH");
  const [customStart, setCustomStart] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [customEnd, setCustomEnd] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Expense modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ desc: "", amount: "" });

  // Parse orders safely
  const parsedOrders = useMemo(() => {
    return (Array.isArray(orderHistory) ? orderHistory : []).map((o) => {
      const totalNum = Number(o.total) || 0;
      const subtotalNum = Number(o.subtotal) || totalNum;
      const discountNum = Number(o.discount) || 0;
      return {
        ...o,
        total: totalNum,
        subtotal: subtotalNum,
        discount: discountNum,
        timestamp: o.timestamp || o.date || new Date().toISOString(),
      };
    });
  }, [orderHistory]);

  // Filtered orders according to time range
  const filteredOrders = useMemo(() => {
    return parsedOrders.filter((o) => {
      if (!o || !o.timestamp) return false;
      const date = new Date(o.timestamp);
      if (isNaN(date.getTime())) return false;
      const now = new Date();
      if (filter === "DAILY") return date.toDateString() === now.toDateString();
      if (filter === "THIS_MONTH") {
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      }
      if (filter === "CUSTOM") {
        const dStr = date.toISOString().split("T")[0];
        return dStr >= customStart && dStr <= customEnd;
      }
      return true;
    });
  }, [parsedOrders, filter, customStart, customEnd]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    const list = Array.isArray(expenses) ? expenses : [];
    return list.filter((e) => {
      if (!e || !e.timestamp) return false;
      const date = new Date(e.timestamp);
      if (isNaN(date.getTime())) return false;
      const now = new Date();
      if (filter === "DAILY") return date.toDateString() === now.toDateString();
      if (filter === "THIS_MONTH") {
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      }
      if (filter === "CUSTOM") {
        const dStr = date.toISOString().split("T")[0];
        return dStr >= customStart && dStr <= customEnd;
      }
      return true;
    });
  }, [expenses, filter, customStart, customEnd]);

  // Financial Metrics Calculations
  const totalRevenue = useMemo(
    () => filteredOrders.reduce((acc, o) => acc + (o.total || 0), 0),
    [filteredOrders]
  );

  const totalCOGS = useMemo(() => {
    return filteredOrders.reduce((acc, o) => {
      let orderCogs = 0;
      if (Array.isArray(o.cartSnapshot) && o.cartSnapshot.length > 0) {
        orderCogs = o.cartSnapshot.reduce((sAcc: number, item: any) => {
          const itemCogs =
            item.cogs !== undefined
              ? Number(item.cogs)
              : productList.find((p) => p.id === item.id)?.cogs || 0;
          return sAcc + itemCogs * (Number(item.quantity) || 1);
        }, 0);
      } else if (typeof o.items === "string") {
        // Fallback parse string items
        const parts = o.items.split(",").map((s: string) => s.trim());
        parts.forEach((p: string) => {
          const match = p.match(/^(.+?)\s*\((\d+)x\)$/);
          if (match) {
            const name = match[1].trim();
            const qty = parseInt(match[2]) || 1;
            const matchedProd = productList.find(
              (prod) => prod.name.toLowerCase() === name.toLowerCase()
            );
            orderCogs += (matchedProd?.cogs || 0) * qty;
          }
        });
      }
      return acc + orderCogs;
    }, 0);
  }, [filteredOrders, productList]);

  const totalExpense = useMemo(
    () => filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0),
    [filteredExpenses]
  );

  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpense;
  const grossMarginPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "0";
  const netMarginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0";
  const orderCount = filteredOrders.length;
  const averageOrderValue = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

  // Chart Data: Timeline Trend (Daily / Grouped)
  const timelineChartData = useMemo(() => {
    const map: { [key: string]: { date: string; revenue: number; orders: number; label: string } } = {};

    filteredOrders.forEach((o) => {
      const d = new Date(o.timestamp);
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      if (!map[key]) {
        map[key] = { date: key, revenue: 0, orders: 0, label };
      }
      map[key].revenue += o.total || 0;
      map[key].orders += 1;
    });

    const sorted = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-14); // Show last 14 active days in range for clean rendering
  }, [filteredOrders]);

  // State for active bar tooltip on daily sales chart
  const [activeChartBar, setActiveChartBar] = useState<number | null>(null);

  // Maximum revenue for chart scale
  const maxDailyRevenue = useMemo(() => {
    if (timelineChartData.length === 0) return 100000;
    const max = Math.max(...timelineChartData.map((d) => d.revenue));
    return max > 0 ? max : 100000;
  }, [timelineChartData]);

  // Average daily revenue
  const avgDailyRevenue = useMemo(() => {
    if (timelineChartData.length === 0) return 0;
    const total = timelineChartData.reduce((acc, curr) => acc + curr.revenue, 0);
    return Math.round(total / timelineChartData.length);
  }, [timelineChartData]);

  // Product & Category Sales Matrix (Performance extraction)
  const { topProducts, categoryData, orderTypeData, paymentMethodData } = useMemo(() => {
    const productStats: { [name: string]: { name: string; qty: number; revenue: number; category: string } } = {};
    const categoryStats: { [cat: string]: number } = {};
    const orderTypes: { [type: string]: number } = { "Dine-in": 0, Takeaway: 0 };
    const paymentMethods: { [method: string]: number } = { Cash: 0, QRIS: 0, Transfer: 0 };

    filteredOrders.forEach((o) => {
      // Order type
      const ot = o.orderType || "Dine-in";
      orderTypes[ot] = (orderTypes[ot] || 0) + 1;

      // Payment method
      const pm = o.paymentMethod || "Cash";
      paymentMethods[pm] = (paymentMethods[pm] || 0) + 1;

      // Items parsing
      if (Array.isArray(o.cartSnapshot) && o.cartSnapshot.length > 0) {
        o.cartSnapshot.forEach((item: any) => {
          const name = item.name || "Menu Tanpa Nama";
          const qty = Number(item.quantity) || 1;
          const price = Number(item.price) || 0;
          const rev = price * qty;
          const matchedProd = productList.find((p) => p.name === name || p.id === item.id);
          const cat = matchedProd?.category || "Lainnya";

          if (!productStats[name]) {
            productStats[name] = { name, qty: 0, revenue: 0, category: cat };
          }
          productStats[name].qty += qty;
          productStats[name].revenue += rev;
          categoryStats[cat] = (categoryStats[cat] || 0) + rev;
        });
      } else if (typeof o.items === "string") {
        const parts = o.items.split(",").map((s: string) => s.trim());
        parts.forEach((p: string) => {
          const match = p.match(/^(.+?)\s*\((\d+)x\)$/);
          if (match) {
            let name = match[1].trim();
            name = name.replace(/\s*\(Rp\s*\d+[.,]?\d*\)/i, "").trim();
            const qty = parseInt(match[2]) || 1;
            const matchedProd = productList.find(
              (prod) => prod.name.toLowerCase() === name.toLowerCase()
            );
            const price = matchedProd?.price || 25000;
            const rev = price * qty;
            const cat = matchedProd?.category || "Lainnya";

            if (!productStats[name]) {
              productStats[name] = { name, qty: 0, revenue: 0, category: cat };
            }
            productStats[name].qty += qty;
            productStats[name].revenue += rev;
            categoryStats[cat] = (categoryStats[cat] || 0) + rev;
          }
        });
      }
    });

    const sortedProducts = Object.values(productStats).sort((a, b) => b.qty - a.qty);
    const catArray = Object.entries(categoryStats).map(([name, value]) => ({
      name,
      value,
    }));

    return {
      topProducts: sortedProducts,
      categoryData: catArray,
      orderTypeData: orderTypes,
      paymentMethodData: paymentMethods,
    };
  }, [filteredOrders, productList]);

  // Total Category Revenue for distribution calculation
  const totalCategoryRevenue = useMemo(() => {
    return categoryData.reduce((acc, curr) => acc + curr.value, 0);
  }, [categoryData]);

  // Add Expense Handler
  const handleAddExpense = () => {
    if (!expenseForm.desc || !expenseForm.amount) return;
    const amt = parseInt(expenseForm.amount.replace(/\D/g, ""));
    if (!isNaN(amt) && amt > 0) {
      const newExpense = {
        id: `EXP-${Date.now()}`,
        desc: expenseForm.desc,
        amount: amt,
        timestamp: new Date().toISOString(),
      };
      setExpenses((prev: any[]) => [newExpense, ...prev]);
      if (queueSync) {
        queueSync("EXPENSE", "UPSERT", newExpense);
      }
      setExpenseForm({ desc: "", amount: "" });
      setIsExpenseModalOpen(false);
    }
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev: any[]) => prev.filter((x) => x.id !== id));
    if (queueSync) {
      queueSync("EXPENSE", "DELETE", { id });
    }
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-y-auto custom-scrollbar space-y-6">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl sm:text-2xl font-black text-stone-900">
              Laporan Keuangan & <span className="text-[#D81B60]">Performa Bisnis</span>
            </h3>
            <span className="text-xs bg-pink-100 text-[#D81B60] font-black px-2.5 py-0.5 rounded-full">
              Komprehensif
            </span>
          </div>
          <p className="text-xs text-stone-600 font-bold mt-0.5">
            Analisis laba rugi, grafik tren penjualan, komparasi produk terlaris, dan pencatatan operasional.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-300">
            {(
              [
                { id: "DAILY", label: "Hari Ini" },
                { id: "THIS_MONTH", label: "Bulan Ini" },
                { id: "ALL", label: "Semua Waktu" },
                { id: "CUSTOM", label: "Kustom" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                  filter === f.id
                    ? "bg-[#D81B60] text-white shadow-xs"
                    : "text-stone-700 hover:text-black hover:bg-stone-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filter === "CUSTOM" && (
            <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-2xl border border-stone-300 text-xs font-bold">
              <Calendar size={14} className="text-stone-600 ml-1" />
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-white border border-stone-300 rounded-lg px-2 py-1 text-stone-900 outline-none"
              />
              <span className="text-stone-500">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-white border border-stone-300 rounded-lg px-2 py-1 text-stone-900 outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* 1. FINANCIAL SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 rounded-3xl border-2 border-emerald-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">
              Total Pemasukan (Omzet)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <TrendingUp size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            {formatRupiah(totalRevenue)}
          </div>
          <div className="text-[11px] font-bold text-emerald-800 mt-2 flex items-center gap-1">
            <span>{orderCount} Transaksi</span>
            <span>•</span>
            <span>Rata-rata: {formatRupiah(averageOrderValue)}</span>
          </div>
        </div>

        {/* COGS (HPP) */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-3xl border-2 border-blue-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-black text-blue-800 uppercase tracking-wider">
              Harga Pokok (HPP / COGS)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-xs">
              <Layers size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700 tracking-tight">
            {formatRupiah(totalCOGS)}
          </div>
          <div className="text-[11px] font-bold text-blue-800 mt-2">
            Margin Kotor: <span className="font-black text-blue-900">{grossMarginPct}%</span> ({formatRupiah(grossProfit)})
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-gradient-to-br from-rose-50 to-pink-50/50 p-4 rounded-3xl border-2 border-rose-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-black text-rose-800 uppercase tracking-wider">
              Beban Operasional
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
              <DollarSign size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 tracking-tight">
            {formatRupiah(totalExpense)}
          </div>
          <div className="text-[11px] font-bold text-rose-800 mt-2">
            {filteredExpenses.length} Pengeluaran Tercatat
          </div>
        </div>

        {/* Net Profit */}
        <div
          className={`p-4 rounded-3xl border-2 shadow-xs relative overflow-hidden ${
            netProfit >= 0
              ? "bg-gradient-to-br from-amber-50 to-yellow-50/60 border-amber-300"
              : "bg-gradient-to-br from-red-50 to-rose-50/60 border-red-300"
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span
              className={`text-[11px] font-black uppercase tracking-wider ${
                netProfit >= 0 ? "text-amber-800" : "text-red-800"
              }`}
            >
              Laba Bersih (Net Profit)
            </span>
            <div
              className={`w-8 h-8 rounded-xl text-white flex items-center justify-center shadow-xs ${
                netProfit >= 0 ? "bg-amber-500" : "bg-red-500"
              }`}
            >
              {netProfit >= 0 ? (
                <ArrowUpRight size={16} strokeWidth={2.5} />
              ) : (
                <ArrowDownRight size={16} strokeWidth={2.5} />
              )}
            </div>
          </div>
          <div
            className={`text-2xl font-black tracking-tight ${
              netProfit >= 0 ? "text-amber-700" : "text-red-700"
            }`}
          >
            {formatRupiah(netProfit)}
          </div>
          <div
            className={`text-[11px] font-bold mt-2 ${
              netProfit >= 0 ? "text-amber-800" : "text-red-800"
            }`}
          >
            Net Profit Margin: <span className="font-black">{netMarginPct}%</span>
          </div>
        </div>
      </div>

      {/* 2. COMPREHENSIVE SALES CHARTS SECTION (LIGHTWEIGHT, ZERO ANIMATION, FAST RENDERING) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simple Daily Sales Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl border-2 border-stone-200 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h4 className="text-base font-black text-stone-900 flex items-center gap-2">
                <BarChart3 size={18} className="text-[#D81B60]" />
                Grafik Tren Penjualan Harian
              </h4>
              <p className="text-xs text-stone-500 font-bold">
                Ringan, instan tanpa animasi berat. Menampilkan omzet harian & jumlah order.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                {orderCount} Transaksi
              </span>
              <span className="text-xs font-black text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-xl">
                Rata-rata: {formatRupiah(avgDailyRevenue)}/hari
              </span>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[220px] flex flex-col justify-end">
            {timelineChartData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-stone-400 font-bold text-xs bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                Tidak ada data transaksi pada rentang waktu ini.
              </div>
            ) : (
              <div className="relative pt-6 pb-2">
                {/* Horizontal Guide Lines with Rupiah values */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] font-bold text-stone-400 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-right shrink-0">{formatRupiah(maxDailyRevenue)}</span>
                    <div className="w-full border-b border-dashed border-stone-200"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-right shrink-0">{formatRupiah(Math.round(maxDailyRevenue / 2))}</span>
                    <div className="w-full border-b border-dashed border-stone-200"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-right shrink-0">Rp 0</span>
                    <div className="w-full border-b border-stone-200"></div>
                  </div>
                </div>

                {/* Bars Container */}
                <div className="relative pl-14 pr-2 h-44 flex items-end justify-between gap-1.5 sm:gap-3">
                  {timelineChartData.map((item, idx) => {
                    const heightPercent = maxDailyRevenue > 0
                      ? Math.max(item.revenue > 0 ? 8 : 2, Math.round((item.revenue / maxDailyRevenue) * 100))
                      : 0;
                    const isHovered = activeChartBar === idx;

                    return (
                      <div
                        key={item.date}
                        onMouseEnter={() => setActiveChartBar(idx)}
                        onMouseLeave={() => setActiveChartBar(null)}
                        onClick={() => setActiveChartBar(activeChartBar === idx ? null : idx)}
                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                      >
                        {/* Instant Tooltip (Hover / Click) */}
                        {isHovered && (
                          <div className="absolute -top-14 z-20 bg-stone-900 text-white text-[11px] font-bold py-1.5 px-2.5 rounded-xl shadow-lg pointer-events-none whitespace-nowrap border border-stone-700 flex flex-col items-center">
                            <span className="text-[10px] text-pink-300 font-black">{item.label}</span>
                            <span className="font-black text-white">{formatRupiah(item.revenue)}</span>
                            <span className="text-[9px] text-stone-400">{item.orders} pesanan</span>
                            <div className="w-2 h-2 bg-stone-900 rotate-45 -mb-1 mt-0.5 border-r border-b border-stone-700"></div>
                          </div>
                        )}

                        {/* Bar Body */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[38px] min-w-[14px] rounded-t-lg transition-colors duration-75 flex items-start justify-center pt-1 ${
                            isHovered
                              ? "bg-pink-700 ring-2 ring-pink-400"
                              : item.revenue > 0
                              ? "bg-[#D81B60] hover:bg-[#AD1457]"
                              : "bg-stone-200"
                          }`}
                        >
                          {heightPercent >= 28 && (
                            <span className="text-[9px] font-black text-white transform -rotate-90 sm:rotate-0 tracking-tighter sm:tracking-normal">
                              {(item.revenue / 1000).toFixed(0)}k
                            </span>
                          )}
                        </div>

                        {/* Date Label */}
                        <span className="text-[10px] font-bold text-stone-600 mt-2 truncate max-w-full text-center group-hover:text-stone-900">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Simple Category Composition Card (1 col) */}
        <div className="bg-white p-5 rounded-3xl border-2 border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-base font-black text-stone-900 flex items-center gap-2">
                  <PieChartIcon size={18} className="text-[#D81B60]" />
                  Komposisi Kategori
                </h4>
                <p className="text-xs text-stone-500 font-bold">
                  Distribusi omzet per kategori menu
                </p>
              </div>
              <span className="text-[11px] font-black text-stone-600 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">
                {categoryData.length} Kategori
              </span>
            </div>

            {categoryData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-stone-400 font-bold text-xs bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                Belum ada data kategori
              </div>
            ) : (
              <div className="space-y-4">
                {/* Horizontal Segmented Bar (Zero lag, pure CSS) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-stone-500">
                    <span>Proporsi Penjualan</span>
                    <span className="font-black text-stone-900">{formatRupiah(totalCategoryRevenue)}</span>
                  </div>
                  <div className="h-4 w-full bg-stone-100 rounded-full overflow-hidden flex border border-stone-200 shadow-inner">
                    {categoryData.map((c, idx) => {
                      const pct = totalCategoryRevenue > 0 ? (c.value / totalCategoryRevenue) * 100 : 0;
                      if (pct <= 0) return null;
                      return (
                        <div
                          key={idx}
                          style={{
                            width: `${pct}%`,
                            backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                          }}
                          className="h-full border-r border-white/20 first:rounded-l-full last:rounded-r-full hover:brightness-110 cursor-pointer transition-none"
                          title={`${c.name}: ${formatRupiah(c.value)} (${pct.toFixed(1)}%)`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Ranked Category List */}
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {categoryData.map((c, idx) => {
                    const pct = totalCategoryRevenue > 0 ? ((c.value / totalCategoryRevenue) * 100).toFixed(1) : "0";
                    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-200/80 hover:bg-stone-100/80 transition-none text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-md shrink-0 shadow-xs"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-black text-stone-900 truncate">
                            {c.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600">
                            {pct}%
                          </span>
                        </div>
                        <span className="font-black text-stone-900 shrink-0 ml-2">
                          {formatRupiah(c.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-stone-100 text-[11px] font-bold text-stone-500 flex justify-between items-center mt-3">
            <span>Kategori Terlaris:</span>
            <span className="font-black text-[#D81B60]">
              {categoryData[0]?.name || "-"} ({categoryData[0] ? formatRupiah(categoryData[0].value) : "Rp 0"})
            </span>
          </div>
        </div>
      </div>

      {/* 3. STRUCTURED P&L STATEMENT (Laporan Laba Rugi Terstruktur) */}
      <div className="bg-white p-5 rounded-3xl border-2 border-stone-200 shadow-xs">
        <h4 className="text-base font-black text-stone-900 mb-1 flex items-center gap-2">
          <Receipt size={18} className="text-[#D81B60]" />
          Laporan Laba Rugi Komprehensif (Income Statement)
        </h4>
        <p className="text-xs text-stone-500 font-bold mb-4">
          Struktur kalkulasi akuntansi bisnis Legiy Dessert secara transparan
        </p>

        <div className="divide-y divide-stone-100 text-xs sm:text-sm font-bold">
          <div className="py-2.5 flex justify-between text-stone-700">
            <span>(+) Total Pendapatan Kotor (Gross Sales)</span>
            <span className="font-mono font-black text-stone-900">{formatRupiah(totalRevenue)}</span>
          </div>
          <div className="py-2.5 flex justify-between text-stone-700">
            <span>(-) Biaya Pokok Penjualan (HPP / COGS)</span>
            <span className="font-mono font-black text-blue-700">-{formatRupiah(totalCOGS)}</span>
          </div>
          <div className="py-2.5 flex justify-between bg-blue-50/60 px-3 rounded-xl text-blue-950 font-black">
            <span>(=) Laba Kotor (Gross Profit)</span>
            <span className="font-mono text-blue-900">{formatRupiah(grossProfit)}</span>
          </div>
          <div className="py-2.5 flex justify-between text-stone-700">
            <span>(-) Total Pengeluaran & Beban Operasional</span>
            <span className="font-mono font-black text-rose-600">-{formatRupiah(totalExpense)}</span>
          </div>
          <div
            className={`py-3 flex justify-between px-3 rounded-xl font-black text-sm sm:text-base ${
              netProfit >= 0 ? "bg-amber-100/70 text-amber-950" : "bg-red-100/70 text-red-950"
            }`}
          >
            <span>(=) Laba Bersih Operasional (Net Income)</span>
            <span className="font-mono">{formatRupiah(netProfit)}</span>
          </div>
        </div>
      </div>

      {/* 4. PERFORMANCE MATRIX (PINDAHAN BAGIAN "PERFORMANCE" DI BAWAH LAPORAN KEUANGAN) */}
      <div className="bg-stone-50 p-5 rounded-3xl border-2 border-stone-300 shadow-xs space-y-6">
        <div className="border-b-2 border-stone-200 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#D81B60] text-white flex items-center justify-center font-black text-xs shadow-xs">
                <Award size={15} />
              </span>
              <h4 className="text-lg font-black text-stone-950">
                Business Performance & Analisis Menu
              </h4>
            </div>
            <p className="text-xs text-stone-600 font-bold mt-0.5">
              Peringkat menu favorit pelanggan, saluran pemesanan, dan metode transaksi
            </p>
          </div>
          <span className="text-[11px] font-black text-stone-700 bg-white border border-stone-300 px-3 py-1 rounded-full">
            {topProducts.length} Variasi Menu Terjual
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 10 Best Seller Menu (2 cols) */}
          <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
            <h5 className="font-black text-stone-900 text-sm mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              10 Menu Paling Laris (Top Best Sellers)
            </h5>

            {topProducts.length === 0 ? (
              <p className="text-xs text-stone-400 font-bold py-6 text-center">
                Belum ada data penjualan pada periode ini.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                {topProducts.slice(0, 10).map((prod, idx) => {
                  const sharePct =
                    totalRevenue > 0 ? ((prod.revenue / totalRevenue) * 100).toFixed(1) : "0";

                  return (
                    <div
                      key={prod.name}
                      className="flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:border-pink-300 bg-stone-50/50 hover:bg-pink-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                            idx === 0
                              ? "bg-amber-400 text-amber-950 shadow-xs"
                              : idx === 1
                              ? "bg-stone-300 text-stone-900"
                              : idx === 2
                              ? "bg-amber-700 text-amber-100"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-black text-stone-900 leading-snug">
                            {prod.name}
                          </p>
                          <span className="text-[10px] font-bold text-stone-500">
                            {prod.category} • Kontribusi: {sharePct}%
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-white bg-[#D81B60] px-2.5 py-1 rounded-lg inline-block">
                          {prod.qty} Terjual
                        </span>
                        <p className="text-[11px] font-mono font-bold text-stone-700 mt-1">
                          {formatRupiah(prod.revenue)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Distribution Cards (1 col) */}
          <div className="space-y-4 flex flex-col">
            {/* Order Types */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <h5 className="font-black text-stone-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                <ShoppingBag size={15} className="text-[#D81B60]" />
                Tipe Layanan (Order Types)
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-center">
                  <p className="text-2xl font-black text-blue-700">
                    {orderTypeData["Dine-in"] || 0}
                  </p>
                  <p className="text-[10px] font-black text-blue-900 uppercase tracking-wider mt-1">
                    Dine-In
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center">
                  <p className="text-2xl font-black text-amber-700">
                    {orderTypeData["Takeaway"] || 0}
                  </p>
                  <p className="text-[10px] font-black text-amber-900 uppercase tracking-wider mt-1">
                    Takeaway
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex-1">
              <h5 className="font-black text-stone-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                <CreditCard size={15} className="text-[#D81B60]" />
                Metode Pembayaran
              </h5>
              <div className="space-y-2">
                {Object.entries(paymentMethodData).map(([method, count]) => {
                  const numCount = Number(count) || 0;
                  const pct = orderCount > 0 ? Math.round((numCount / orderCount) * 100) : 0;
                  return (
                    <div key={method} className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                      <div className="flex justify-between text-xs font-black text-stone-900 mb-1">
                        <span>{method}</span>
                        <span>
                          {numCount} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#D81B60] h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. EXPENSES LOGGER (Catatan Pengeluaran Operasional) */}
      <div className="bg-white p-5 rounded-3xl border-2 border-stone-200 shadow-xs flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="text-base font-black text-stone-900 flex items-center gap-2">
              <DollarSign size={18} className="text-rose-600" />
              Daftar Pengeluaran Operasional
            </h4>
            <p className="text-xs text-stone-500 font-bold">
              Catat pengeluaran bahan baku tambahan, operasional, dan perlengkapan toko
            </p>
          </div>
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus size={15} strokeWidth={3} /> Tambah Pengeluaran
          </button>
        </div>

        {filteredExpenses.length === 0 ? (
          <p className="text-xs text-stone-400 font-bold py-6 text-center">
            Belum ada catatan pengeluaran di periode ini.
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {filteredExpenses.map((e, idx) => (
              <div
                key={`${e.id}-${idx}`}
                className="flex justify-between items-center bg-stone-50 hover:bg-stone-100/80 p-3 rounded-2xl border border-stone-200 transition-colors"
              >
                <div>
                  <p className="text-xs sm:text-sm font-black text-stone-900">{e.desc}</p>
                  <p className="text-[10px] text-stone-500 font-bold mt-0.5">
                    {new Date(e.timestamp).toLocaleDateString("id-ID")}{" "}
                    {new Date(e.timestamp).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-sm text-rose-600">
                    -{formatRupiah(e.amount)}
                  </span>
                  <button
                    onClick={() => handleDeleteExpense(e.id)}
                    className="w-7 h-7 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                    title="Hapus pengeluaran"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-stone-300 shadow-2xl rounded-3xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-black text-stone-900 mb-1">Tambah Pengeluaran</h3>
            <p className="text-xs text-stone-500 font-bold mb-4">
              Pengeluaran akan langsung mengurangi laba bersih periode terkait.
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs font-black text-stone-700 block mb-1">
                  Keterangan Pengeluaran
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Beli Susu Segar & Gula"
                  value={expenseForm.desc}
                  onChange={(e) => setExpenseForm({ ...expenseForm, desc: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 outline-none focus:border-rose-600"
                />
              </div>
              <div>
                <label className="text-xs font-black text-stone-700 block mb-1">
                  Nominal (Rp)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 75000"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      amount: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 outline-none focus:border-rose-600"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-black text-stone-600 hover:bg-stone-100"
              >
                Batal
              </button>
              <button
                onClick={handleAddExpense}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
              >
                Simpan Pengeluaran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
