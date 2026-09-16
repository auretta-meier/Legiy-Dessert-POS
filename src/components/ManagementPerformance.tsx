import React, { useMemo } from "react";
import { formatRupiah } from "../data";
import { TrendingUp, Award, Clock, DollarSign, ShoppingBag, Utensils } from "lucide-react";

interface ManagementPerformanceProps {
  orderHistory: any[];
}

export default function ManagementPerformance({ orderHistory }: ManagementPerformanceProps) {
  // Aggregate Metrics
  const stats = useMemo(() => {
    const totalOrders = orderHistory.length;
    const totalRevenue = orderHistory.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Item popularity & revenue
    const itemMap: { [name: string]: { quantity: number; revenue: number } } = {};
    const orderTypeMap: { [type: string]: number } = { "Dine-in": 0, "Takeaway": 0, "Delivery": 0 };
    const hourlyMap: { [hour: number]: number } = {};

    orderHistory.forEach((o) => {
      // Order type
      const oType = o.orderType || "Dine-in";
      orderTypeMap[oType] = (orderTypeMap[oType] || 0) + 1;

      // Hour of day
      try {
        const d = new Date(o.timestamp);
        if (!isNaN(d.getTime())) {
          const h = d.getHours();
          hourlyMap[h] = (hourlyMap[h] || 0) + 1;
        }
      } catch {
        // ignore
      }

      // Parse items
      if (Array.isArray(o.cartSnapshot) && o.cartSnapshot.length > 0) {
        o.cartSnapshot.forEach((item: any) => {
          const name = item.name || "Unknown Item";
          const qty = Number(item.quantity) || 1;
          const price = Number(item.price) || 0;
          if (!itemMap[name]) itemMap[name] = { quantity: 0, revenue: 0 };
          itemMap[name].quantity += qty;
          itemMap[name].revenue += qty * price;
        });
      } else if (typeof o.items === "string") {
        // Fallback parse string: "Item (2x), Item 2 (1x)"
        const parts = o.items.split(",");
        parts.forEach((p) => {
          const match = p.trim().match(/^(.*?)\s*\((\d+)x\)$/);
          if (match) {
            const name = match[1].trim();
            const qty = parseInt(match[2], 10) || 1;
            if (!itemMap[name]) itemMap[name] = { quantity: 0, revenue: 0 };
            itemMap[name].quantity += qty;
          }
        });
      }
    });

    const topItems = Object.entries(itemMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    const maxItemQty = topItems.length > 0 ? topItems[0].quantity : 1;

    // Peak rush hour
    let peakHour = -1;
    let peakCount = 0;
    Object.entries(hourlyMap).forEach(([h, count]) => {
      if (count > peakCount) {
        peakCount = count;
        peakHour = Number(h);
      }
    });

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      topItems,
      maxItemQty,
      orderTypeMap,
      hourlyMap,
      peakHour: peakHour !== -1 ? `${String(peakHour).padStart(2, '0')}:00 - ${String(peakHour + 1).padStart(2, '0')}:00` : "-",
    };
  }, [orderHistory]);

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto custom-scrollbar space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <TrendingUp size={22} className="text-[#D81B60]" />
            Analisis Performa Penjualan
          </h3>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            Metrik efisiensi pesanan, produk terlaris, dan jam sibuk operasional
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1 bg-stone-100 rounded-full text-stone-600 border border-stone-200">
          Total {stats.totalOrders} Transaksi
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">Total Pendapatan</span>
            <DollarSign size={18} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-stone-950 font-mono">
            {formatRupiah(stats.totalRevenue)}
          </div>
          <span className="text-[10px] text-stone-400">Dari seluruh transaksi tercatat</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">Rata-rata Order (AOV)</span>
            <ShoppingBag size={18} className="text-blue-600" />
          </div>
          <div className="text-xl font-black text-stone-950 font-mono">
            {formatRupiah(stats.avgOrderValue)}
          </div>
          <span className="text-[10px] text-stone-400">Rata-rata nilai per nota belanja</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">Total Nota / Transaksi</span>
            <Utensils size={18} className="text-purple-600" />
          </div>
          <div className="text-xl font-black text-stone-950 font-mono">
            {stats.totalOrders} Pesanan
          </div>
          <span className="text-[10px] text-stone-400">Pesanan selesai tercatat di kasir</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">Jam Paling Ramai</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <div className="text-xl font-black text-stone-950">
            {stats.peakHour}
          </div>
          <span className="text-[10px] text-stone-400">Berdasarkan histori transaksi</span>
        </div>
      </div>

      {/* Main Grid: Best Sellers & Order Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Best Sellers */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border-2 border-stone-200 shadow-xs">
          <h4 className="text-sm font-black text-stone-900 mb-4 flex items-center gap-2">
            <Award size={18} className="text-[#D81B60]" />
            Menu Paling Laris (Top Terjual)
          </h4>

          {stats.topItems.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">Belum ada data pesanan</p>
          ) : (
            <div className="space-y-3">
              {stats.topItems.map((item, idx) => {
                const pct = stats.maxItemQty > 0 ? (item.quantity / stats.maxItemQty) * 100 : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-stone-800 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-stone-100 border border-stone-300 text-stone-700 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        {item.name}
                      </span>
                      <span className="font-mono font-bold text-stone-900">
                        {item.quantity} porsi {item.revenue > 0 && `• ${formatRupiah(item.revenue)}`}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#D81B60] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Order Types & Channel */}
        <div className="bg-white p-5 rounded-2xl border-2 border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-black text-stone-900 mb-4">
              Tipe Layanan Pesanan
            </h4>
            <div className="space-y-3">
              {Object.entries(stats.orderTypeMap).map(([type, count]) => {
                const numCount = Number(count) || 0;
                const pct = stats.totalOrders > 0 ? Math.round((numCount / stats.totalOrders) * 100) : 0;
                return (
                  <div key={type} className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <div className="flex justify-between text-xs font-bold text-stone-800 mb-1">
                      <span>{type}</span>
                      <span className="font-mono">{numCount} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-stone-800 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-pink-50 border border-pink-200 text-xs text-pink-900 font-medium">
            💡 <strong>Rekomendasi Menu:</strong> Pantau menu terlaris untuk memastikan stok bahan baku selalu tersedia saat jam sibuk ({stats.peakHour}).
          </div>
        </div>
      </div>
    </div>
  );
}
