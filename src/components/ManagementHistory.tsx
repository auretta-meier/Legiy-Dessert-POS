import React, { useState, useMemo } from "react";
import { formatRupiah, Product } from "../data";
import {
  Search,
  User,
  Printer,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Receipt,
  Eye,
  CheckSquare,
  Square,
  FileText,
  Clock,
  Sparkles,
  Phone,
  Utensils,
  Share2,
} from "lucide-react";

export interface ManagementHistoryProps {
  orderHistory: any[];
  printReceipt: (order?: any) => void;
  setOrderHistory: any;
  queueSync?: any;
  productList?: Product[];
}

export interface ParsedOrderItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  totalPrice: number;
  selectedAddons?: Array<{ optionName?: string; name?: string; price?: number }>;
  itemNotes?: string;
  category?: string;
}

/**
 * Extracts and normalizes items from an order regardless of storage format
 */
export function extractOrderItems(order: any, productList: Product[] = []): ParsedOrderItem[] {
  if (!order) return [];

  // 1. Try cartSnapshot if present
  let rawItems: any[] = [];
  if (order.cartSnapshot) {
    if (Array.isArray(order.cartSnapshot)) {
      rawItems = order.cartSnapshot;
    } else if (typeof order.cartSnapshot === "string") {
      try {
        const parsed = JSON.parse(order.cartSnapshot);
        if (Array.isArray(parsed)) rawItems = parsed;
      } catch (e) {}
    }
  }

  // 2. Fallback to order.items if array
  if (rawItems.length === 0 && Array.isArray(order.items) && order.items.length > 0) {
    rawItems = order.items;
  }

  if (rawItems.length > 0) {
    return rawItems.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      let unitPrice = Number(item.price) || 0;
      if (unitPrice === 0) {
        const found = productList.find(
          (p) => p.name.toLowerCase() === (item.name || "").toLowerCase()
        );
        if (found) unitPrice = found.price;
      }

      let addonsSum = 0;
      const addons = Array.isArray(item.selectedAddons)
        ? item.selectedAddons.map((a: any) => {
            const aPrice = Number(a.price) || 0;
            addonsSum += aPrice;
            return {
              name: a.name || a.optionName || "",
              optionName: a.optionName || a.name || "",
              price: aPrice,
            };
          })
        : undefined;

      const totalPrice = (unitPrice + addonsSum) * qty;

      return {
        id: item.id || item.cartId,
        name: item.name || "Menu",
        price: unitPrice,
        quantity: qty,
        totalPrice: totalPrice,
        selectedAddons: addons,
        itemNotes: item.itemNotes || item.notes || undefined,
        category: item.category,
      };
    });
  }

  // 3. Fallback: Parse string in order.items
  if (order.items && typeof order.items === "string") {
    const parsedList: ParsedOrderItem[] = [];
    const parts = order.items.split(", ");

    parts.forEach((p: string) => {
      let rawText = p.trim();
      if (!rawText) return;

      let quantity = 1;
      const match1 = rawText.match(/(.+?)\s*\((\d+)x\)$/i);
      if (match1) {
        rawText = match1[1].trim();
        quantity = parseInt(match1[2]) || 1;
      } else {
        const match2 = rawText.match(/^(\d+)x\s+(.+)$/i);
        if (match2) {
          quantity = parseInt(match2[1]) || 1;
          rawText = match2[2].trim();
        }
      }

      let itemNotes: string | undefined = undefined;
      const noteMatch = rawText.match(/\(Catatan:\s*(.+?)\)/i);
      if (noteMatch) {
        itemNotes = noteMatch[1].trim();
        rawText = rawText.replace(/\(Catatan:\s*.+?\)/i, "").trim();
      }

      let addons: Array<{ optionName: string; price?: number }> | undefined = undefined;
      const addonMatch = rawText.match(/\[(.*?)\]/);
      if (addonMatch) {
        const addonText = addonMatch[1].trim();
        if (addonText) {
          addons = addonText.split(",").map((s) => ({ optionName: s.trim() }));
        }
        rawText = rawText.replace(/\[.*?\]/, "").trim();
      }

      rawText = rawText.replace(/\s*\(Rp\s*[\d.,]+\)/i, "").trim();

      const found = productList.find(
        (prod) => prod.name.toLowerCase() === rawText.toLowerCase()
      );
      const unitPrice = found ? found.price : 0;
      const totalPrice = unitPrice * quantity;

      parsedList.push({
        name: rawText,
        price: unitPrice,
        quantity,
        totalPrice,
        selectedAddons: addons,
        itemNotes,
        category: found?.category,
      });
    });

    if (parsedList.length > 0) return parsedList;
  }

  return [];
}

export default function ManagementHistory({
  orderHistory,
  printReceipt,
  setOrderHistory,
  queueSync,
  productList = [],
}: ManagementHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<string>("ALL");
  const [filterPayment, setFilterPayment] = useState<string>("ALL");
  const [filterProcessStatus, setFilterProcessStatus] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("NEWEST");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [modalOrder, setModalOrder] = useState<any | null>(null);

  // Toggle detail expansion for a single card
  const toggleDetail = (orderId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // Toggle order status between PROSES and SELESAI (default: PROSES)
  const toggleOrderStatus = (order: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isCurrentlySelesai = order.orderStatus === "Selesai";
    const newStatus = isCurrentlySelesai ? "Proses" : "Selesai";
    const updatedOrder = { ...order, orderStatus: newStatus };

    setOrderHistory((prev: any[]) =>
      prev.map((o) => (o.orderId === order.orderId ? updatedOrder : o))
    );

    if (queueSync) {
      queueSync("ORDER", "UPSERT", updatedOrder);
    }
  };

  // Filter & sort orders
  const filteredOrders = useMemo(() => {
    const list = Array.isArray(orderHistory) ? [...orderHistory] : [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const filtered = list.filter((order) => {
      const orderTime = order.timestamp ? new Date(order.timestamp).getTime() : 0;

      // Period Filter
      if (filterPeriod === "TODAY" && orderTime < startOfToday) return false;
      if (filterPeriod === "7DAYS" && orderTime < sevenDaysAgo) return false;
      if (filterPeriod === "MONTH" && orderTime < startOfMonth) return false;

      // Payment Filter
      if (filterPayment !== "ALL" && order.paymentMethod !== filterPayment) {
        return false;
      }

      // Process Status Filter (default is Proses)
      const isSelesai = order.orderStatus === "Selesai";
      const status = isSelesai ? "Selesai" : "Proses";
      if (filterProcessStatus !== "ALL" && status !== filterProcessStatus) return false;

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesOrderId = (order.orderId || "").toLowerCase().includes(q);
        const matchesCustomer = (order.customerName || "").toLowerCase().includes(q);
        const matchesPhone = (order.customerPhone || "").toLowerCase().includes(q);
        const matchesPayment = (order.paymentMethod || "").toLowerCase().includes(q);

        const items = extractOrderItems(order, productList);
        const matchesItems = items.some(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            (item.itemNotes && item.itemNotes.toLowerCase().includes(q)) ||
            (item.selectedAddons &&
              item.selectedAddons.some((a) =>
                (a.name || a.optionName || "").toLowerCase().includes(q)
              ))
        );

        const matchesRawItems =
          typeof order.items === "string" && order.items.toLowerCase().includes(q);

        if (
          !matchesOrderId &&
          !matchesCustomer &&
          !matchesPhone &&
          !matchesPayment &&
          !matchesItems &&
          !matchesRawItems
        ) {
          return false;
        }
      }

      return true;
    });

    // Sort
    return filtered.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      const totA = typeof a.total === "number" ? a.total : parseFloat(a.total) || 0;
      const totB = typeof b.total === "number" ? b.total : parseFloat(b.total) || 0;

      if (sortBy === "NEWEST") return timeB - timeA;
      if (sortBy === "OLDEST") return timeA - timeB;
      if (sortBy === "HIGHEST") return totB - totA;
      if (sortBy === "LOWEST") return totA - totB;
      return timeB - timeA;
    });
  }, [
    orderHistory,
    filterPeriod,
    filterPayment,
    filterProcessStatus,
    searchQuery,
    sortBy,
    productList,
  ]);

  // Total revenue for filtered orders & all orders
  const totalFilteredRevenue = useMemo(() => {
    return filteredOrders.reduce((acc, o) => {
      const tot = typeof o.total === "number" ? o.total : parseFloat(o.total) || 0;
      return acc + tot;
    }, 0);
  }, [filteredOrders]);

  const totalOverallRevenue = useMemo(() => {
    const list = Array.isArray(orderHistory) ? orderHistory : [];
    return list.reduce((acc, o) => {
      const tot = typeof o.total === "number" ? o.total : parseFloat(o.total) || 0;
      return acc + tot;
    }, 0);
  }, [orderHistory]);

  // Copy order summary to clipboard for WhatsApp
  const handleCopyOrder = (order: any, items: ParsedOrderItem[], e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const itemsText = items
      .map(
        (it) =>
          `• ${it.quantity}x ${it.name} (${formatRupiah(it.price)})${
            it.selectedAddons && it.selectedAddons.length > 0
              ? ` [Addon: ${it.selectedAddons.map((a) => a.optionName || a.name).join(", ")}]`
              : ""
          }${it.itemNotes ? ` [Catatan: ${it.itemNotes}]` : ""} = ${formatRupiah(it.totalPrice)}`
      )
      .join("\n");

    const text =
      `*LEGIY DESSERT - BUKTI TRANSAKSI*\n` +
      `No. Order: #${order.orderId}\n` +
      `Tanggal: ${new Date(order.timestamp).toLocaleDateString("id-ID")} ${new Date(
        order.timestamp
      ).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}\n` +
      `Customer: ${order.customerName || "-"}\n` +
      `Tipe: ${order.orderType} | Bayar: ${order.paymentMethod}\n` +
      `--------------------------------\n` +
      `*PESANAN:*\n${itemsText}\n` +
      `--------------------------------\n` +
      `Subtotal: ${formatRupiah(order.subtotal || order.total)}\n` +
      (order.discount ? `Diskon: -${formatRupiah(order.discount)}\n` : "") +
      (order.tax ? `PB1: ${formatRupiah(order.tax)}\n` : "") +
      `*TOTAL: ${formatRupiah(order.total)}*\n` +
      (order.paymentMethod === "Cash" && order.change
        ? `Tunai: ${formatRupiah(order.cashGiven || order.total)} | Kembali: ${formatRupiah(
            order.change
          )}\n`
        : "") +
      `\nTerima kasih sudah menikmati Legiy Dessert! ✨`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedOrderId(order.orderId);
      setTimeout(() => setCopiedOrderId(null), 2000);
    });
  };

  const handleDeleteOrder = (order: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (
      confirm(
        `Yakin ingin menghapus Order #${order.orderId}? Transaksi ini akan dihapus dari riwayat.`
      )
    ) {
      setOrderHistory((prev: any[]) => prev.filter((x) => x.orderId !== order.orderId));
      if (queueSync) {
        queueSync("ORDER", "DELETE", { orderId: order.orderId });
      }
      if (modalOrder?.orderId === order.orderId) {
        setModalOrder(null);
      }
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6 flex flex-col gap-4 sm:gap-5">
      {/* 1. TOP SEARCH BAR */}
      <div className="w-full">
        <div className="relative bg-white rounded-2xl shadow-2xs border border-slate-200/90 overflow-hidden">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Cari order berdasarkan Nama Pelanggan atau Nomor Invoice/Order..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 sm:py-3.5 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-bold text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. FILTER BAR */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* PERIODE */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
              PERIODE
            </label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#D81B60] transition-all cursor-pointer"
            >
              <option value="ALL">Semua Waktu</option>
              <option value="TODAY">Hari Ini</option>
              <option value="7DAYS">7 Hari Terakhir</option>
              <option value="MONTH">Bulan Ini</option>
            </select>
          </div>

          {/* STATUS PESANAN */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
              STATUS PESANAN
            </label>
            <select
              value={filterProcessStatus}
              onChange={(e) => setFilterProcessStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#D81B60] transition-all cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="Proses">Proses (Belum Selesai)</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          {/* FILTER PEMBAYARAN */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
              METODE BAYAR
            </label>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#D81B60] transition-all cursor-pointer"
            >
              <option value="ALL">Semua Pembayaran</option>
              <option value="Cash">Cash (Tunai)</option>
              <option value="QRIS">QRIS</option>
              <option value="Transfer">Transfer</option>
              <option value="Debit">Debit</option>
            </select>
          </div>

          {/* URUTAN BERDASARKAN */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
              URUTAN BERDASARKAN
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#D81B60] transition-all cursor-pointer"
            >
              <option value="NEWEST">Terbaru (Tanggal Order)</option>
              <option value="OLDEST">Terlama</option>
              <option value="HIGHEST">Total Tertinggi</option>
              <option value="LOWEST">Total Terendah</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2.5 SUMMARY STATS STRIP (Integrating with Finance & Total Income) */}
      <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Menampilkan:</span>
          <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
            {filteredOrders.length} dari {orderHistory.length} Transaksi
          </span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Pemasukan Terfilter:
            </span>
            <span className="font-mono font-black text-emerald-600 text-sm">
              {formatRupiah(totalFilteredRevenue)}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Total Keseluruhan Pemasukan:
            </span>
            <span className="font-mono font-black text-slate-900 text-sm">
              {formatRupiah(totalOverallRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. ORDER CARDS GRID (4 CARDS PER ROW ON DESKTOP) */}
      <div className="w-full">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center flex flex-col items-center justify-center my-6 shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <FileText size={28} />
            </div>
            <h3 className="text-base font-black text-slate-800">
              Tidak Ada Transaksi yang Ditemukan
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Coba sesuaikan filter pencarian atau tanggal untuk melihat transaksi lainnya.
            </p>
            {(searchQuery ||
              filterPeriod !== "ALL" ||
              filterPayment !== "ALL" ||
              filterProcessStatus !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilterPeriod("ALL");
                  setFilterPayment("ALL");
                  setFilterProcessStatus("ALL");
                }}
                className="mt-4 px-4 py-2 bg-[#D81B60] text-white text-xs font-bold rounded-xl hover:bg-[#C2185B] transition-all"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4 pb-12">
            {filteredOrders.map((order, idx) => {
              const isExpanded = !!expandedCards[order.orderId];
              const items = extractOrderItems(order, productList);
              const displayTotal =
                typeof order.total === "number" ? order.total : parseFloat(order.total) || 0;
              const orderDate = order.timestamp ? new Date(order.timestamp) : new Date();

              // Process Status (default: PROSES)
              const isSelesai = order.orderStatus === "Selesai";

              // Summary text of items
              const summaryText = items
                .map((it) => `${it.quantity}x ${it.name}`)
                .join(", ");

              return (
                <div
                  key={`${order.orderId}-${idx}`}
                  className="bg-white rounded-3xl border border-slate-200/90 hover:border-slate-300 transition-all duration-150 shadow-2xs overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-4 space-y-3">
                    {/* TOP SECTION: Invoice ID, Date & Method Badges (Dropdowns removed) */}
                    <div className="flex items-start justify-between gap-2">
                      <div
                        onClick={() => setModalOrder(order)}
                        className="cursor-pointer group flex-1"
                        title="Klik untuk melihat nota / cetak"
                      >
                        {/* Order ID in Blue/Brand color */}
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-sm text-blue-600 group-hover:text-blue-700 tracking-tight">
                            INV-{order.orderId}
                          </span>
                          <Eye size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                        {/* Formatted Date & Time */}
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 leading-snug">
                          {orderDate.toLocaleDateString("id-ID")},{" "}
                          {orderDate.toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      {/* Right Badges */}
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {order.paymentMethod || "Cash"}
                        </span>
                        <span className="text-[10px] font-bold text-[#D81B60] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/80">
                          {order.orderType === "Dine-in" ? "Dine-in" : "Take Away"}
                        </span>
                      </div>
                    </div>

                    {/* CUSTOMER SECTION */}
                    <div className="flex items-center gap-2.5 pt-0.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                        <User size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
                          {order.customerName ? order.customerName : "Pelanggan Umum"}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium truncate">
                          {order.customerPhone ? order.customerPhone : "-"}
                        </div>
                      </div>
                    </div>

                    {/* DETAIL PESANAN (Expandable Accordion) */}
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => toggleDetail(order.orderId)}
                        className="w-full flex items-center justify-between text-left py-1 text-slate-400 hover:text-slate-700 transition-colors group"
                      >
                        <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 group-hover:text-slate-700">
                          DETAIL PESANAN
                        </span>
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-200 transition-all">
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </div>
                      </button>

                      {/* Items Preview / Full List */}
                      {isExpanded ? (
                        <div className="mt-2 bg-slate-50/80 rounded-2xl p-2.5 border border-slate-200 space-y-1.5 text-xs max-h-48 overflow-y-auto custom-scrollbar">
                          {items.map((it, itIdx) => (
                            <div
                              key={itIdx}
                              className="flex items-start justify-between gap-2 pb-1.5 border-b border-dashed border-slate-200 last:border-b-0 last:pb-0"
                            >
                              <div>
                                <div className="font-bold text-slate-900 text-[11px] sm:text-xs">
                                  <span className="text-[#D81B60] font-mono mr-1">
                                    {it.quantity}x
                                  </span>
                                  {it.name}
                                </div>
                                {it.selectedAddons && it.selectedAddons.length > 0 && (
                                  <div className="text-[10px] text-pink-700 mt-0.5">
                                    + {it.selectedAddons.map((a) => a.optionName || a.name).join(", ")}
                                  </div>
                                )}
                                {it.itemNotes && (
                                  <div className="text-[10px] text-amber-700 italic mt-0.5">
                                    * {it.itemNotes}
                                  </div>
                                )}
                              </div>
                              <span className="font-mono font-bold text-slate-700 text-[11px] shrink-0">
                                {formatRupiah(it.totalPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                          {summaryText || "Tidak ada detail item"}
                        </div>
                      )}
                    </div>

                    {/* STATUS CHECKBOX (SELESAI / PROSES - default PROSES) */}
                    <div
                      onClick={(e) => toggleOrderStatus(order, e)}
                      className={`cursor-pointer select-none rounded-xl border px-3 py-2 flex items-center justify-between transition-all ${
                        isSelesai
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50/70 text-amber-800 hover:border-amber-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSelesai ? (
                          <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                        ) : (
                          <Square size={16} className="text-amber-500 shrink-0" />
                        )}
                        <span className="text-xs font-black tracking-wide uppercase">
                          {isSelesai ? "SELESAI" : "PROSES"}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isSelesai
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isSelesai ? "Selesai" : "Diproses"}
                      </span>
                    </div>
                  </div>

                  {/* BOTTOM SECTION: Grand Total (Action buttons removed as requested) */}
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                      GRAND TOTAL
                    </span>
                    <span className="text-base font-mono font-black text-slate-900">
                      {formatRupiah(displayTotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULL RECEIPT MODAL VIEW (Triggered from Eye Button) */}
      {modalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-300 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-[#D81B60]" />
                <h3 className="font-black text-slate-900 text-sm">
                  Nota Pesanan #INV-{modalOrder.orderId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOrder(null)}
                className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold transition-all text-xs"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Customer</span>
                  <span className="font-black text-slate-900 text-sm">
                    {modalOrder.customerName ? modalOrder.customerName : "Pelanggan Umum"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Tipe & Bayar</span>
                  <span className="font-bold text-slate-800">
                    {modalOrder.orderType} • {modalOrder.paymentMethod}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200 text-slate-500 font-mono text-[11px]">
                  {new Date(modalOrder.timestamp).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  {new Date(modalOrder.timestamp).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  WIB
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                  Item yang Dipesan
                </div>
                {extractOrderItems(modalOrder, productList).map((it, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-start py-1 border-b border-dashed border-slate-100"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {it.quantity}x {it.name}
                      </div>
                      {it.selectedAddons && it.selectedAddons.length > 0 && (
                        <div className="text-[10px] text-pink-700">
                          + {it.selectedAddons.map((a) => a.optionName || a.name).join(", ")}
                        </div>
                      )}
                      {it.itemNotes && (
                        <div className="text-[10px] text-amber-700 italic">
                          * {it.itemNotes}
                        </div>
                      )}
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {formatRupiah(it.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bill Details */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold">
                    {formatRupiah(modalOrder.subtotal || modalOrder.total)}
                  </span>
                </div>
                {modalOrder.discount ? (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Diskon:</span>
                    <span className="font-mono">-{formatRupiah(modalOrder.discount)}</span>
                  </div>
                ) : null}
                {modalOrder.tax ? (
                  <div className="flex justify-between text-slate-600">
                    <span>PB1:</span>
                    <span className="font-mono">{formatRupiah(modalOrder.tax)}</span>
                  </div>
                ) : null}
                <div className="pt-2 border-t-2 border-slate-800 flex justify-between items-center text-sm font-black text-slate-900">
                  <span>TOTAL:</span>
                  <span className="text-base font-mono text-[#D81B60]">
                    {formatRupiah(modalOrder.total)}
                  </span>
                </div>
                {modalOrder.paymentMethod === "Cash" && (
                  <div className="pt-1.5 border-t border-dashed border-slate-200 flex justify-between text-slate-500 font-mono text-[11px]">
                    <span>Tunai: {formatRupiah(modalOrder.cashGiven || modalOrder.total)}</span>
                    <span className="text-emerald-700 font-bold">
                      Kembali: {formatRupiah(modalOrder.change || 0)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => printReceipt(modalOrder)}
                className="flex-1 py-2.5 bg-[#D81B60] hover:bg-[#C2185B] text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
              >
                <Printer size={15} /> Cetak Struk (80mm)
              </button>
              <button
                type="button"
                onClick={(e) =>
                  handleCopyOrder(
                    modalOrder,
                    extractOrderItems(modalOrder, productList),
                    e
                  )
                }
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <Copy size={14} /> WhatsApp
              </button>
              <button
                type="button"
                onClick={(e) => {
                  handleDeleteOrder(modalOrder, e);
                  setModalOrder(null);
                }}
                className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs flex items-center justify-center transition-all"
                title="Hapus Pesanan"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
