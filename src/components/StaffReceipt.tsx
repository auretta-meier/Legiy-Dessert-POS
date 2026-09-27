import React from "react";

export interface StaffReceiptProps {
  order: {
    orderId: string;
    timestamp: string | number;
    customerName?: string;
    orderType?: string;
    items?: any;
    cartSnapshot?: any[];
  };
  isPrint?: boolean;
  className?: string;
  id?: string;
}

export default function StaffReceipt({
  order,
  isPrint = false,
  className = "",
  id,
}: StaffReceiptProps) {
  // Extract items from cartSnapshot or items
  let itemsList: any[] = [];
  if (Array.isArray(order.cartSnapshot) && order.cartSnapshot.length > 0) {
    itemsList = order.cartSnapshot;
  } else if (Array.isArray(order.items) && order.items.length > 0) {
    itemsList = order.items;
  } else if (typeof order.items === "string" && order.items.trim()) {
    // If it's a concatenated string like "Cake (2x), Coffee (1x)"
    itemsList = order.items.split(",").map((s) => ({
      name: s.trim(),
      quantity: 1,
    }));
  }

  const formattedDate = new Date(order.timestamp).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = new Date(order.timestamp).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isDineIn = (order.orderType || "").toLowerCase().includes("dine");

  return (
    <div
      id={id}
      className={`bg-white text-black font-mono leading-tight select-none ${
        isPrint
          ? "w-[80mm] text-[12px] p-[2mm]"
          : "text-[12.5px] p-4 rounded-xl border-2 border-dashed border-stone-800 shadow-md max-w-sm mx-auto"
      } ${className}`}
      style={{
        boxSizing: "border-box",
        fontFamily: "'Courier New', Courier, 'Lucida Console', Monaco, monospace",
        color: "#000000",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Super Compact Header */}
      <div className="text-center font-black text-[13px] tracking-wider uppercase border-b-2 border-black pb-0.5 mb-1">
        *** NOTA STAFF / DAPUR ***
      </div>

      {/* Primary Customer & Order Meta - High Visibility for Staff */}
      <div className="text-[12px] font-black space-y-0.5 mb-1">
        <div className="flex justify-between items-baseline text-[14px] bg-stone-100 px-1 py-0.5 border border-black rounded">
          <span className="text-black">NAMA:</span>
          <span className="text-[15px] uppercase font-black text-black tracking-wide">
            {order.customerName ? order.customerName : "GUEST / TANPA NAMA"}
          </span>
        </div>

        <div className="flex justify-between items-center pt-0.5">
          <span>NO. ORDER:</span>
          <span className="font-mono font-black">{order.orderId}</span>
        </div>

        <div className="flex justify-between items-center text-[11px]">
          <span>WAKTU:</span>
          <span>
            {formattedDate} {formattedTime} WIB
          </span>
        </div>

        <div className="flex justify-between items-center pt-0.5">
          <span>TIPE:</span>
          <span
            className={`px-1.5 py-0.2 border border-black font-black uppercase text-[11px] ${
              isDineIn ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            {isDineIn ? "[ DINE-IN ]" : "[ TAKE AWAY ]"}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="text-center text-[10px] font-mono tracking-tighter my-1">
        --------------------------------
      </div>

      {/* Section Label */}
      <div className="text-[11px] font-black uppercase tracking-wider mb-1">
        DAFTAR PESANAN:
      </div>

      {/* Item List - Ultra Efficient, Zero Prices, Highlight Quantities & Notes */}
      <div className="space-y-1.5 my-1 text-black">
        {itemsList.length === 0 ? (
          <div className="text-center italic py-1 text-xs">
            (Tidak ada detail item)
          </div>
        ) : (
          itemsList.map((item: any, idx: number) => {
            const qty = item.quantity || 1;
            return (
              <div key={idx} className="border-b border-dotted border-stone-400 pb-1">
                {/* Item Name & Quantity */}
                <div className="flex items-start text-[13px] font-black uppercase leading-snug">
                  <span className="inline-block min-w-[28px] font-black text-[13.5px]">
                    [{qty}x]
                  </span>
                  <span className="flex-1 text-black pl-0.5">
                    {item.name}
                  </span>
                </div>

                {/* Add-ons details */}
                {item.selectedAddons && item.selectedAddons.length > 0 && (
                  <div className="text-[11px] pl-7 space-y-0.5 font-bold text-stone-900">
                    {item.selectedAddons.map((addon: any, aIdx: number) => (
                      <div key={aIdx} className="leading-tight">
                        + {addon.optionName || addon.name}
                      </div>
                    ))}
                  </div>
                )}

                {/* Special Cooking / Preparation Notes */}
                {item.itemNotes && (
                  <div className="text-[11.5px] pl-7 font-black italic text-black bg-stone-100 py-0.5 mt-0.5 border-l-2 border-black">
                    NOTE: {item.itemNotes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Checklist for Staff */}
      <div className="text-center text-[10px] font-mono tracking-tighter mt-1">
        --------------------------------
      </div>
      <div className="flex justify-between items-center text-[10.5px] font-black pt-0.5">
        <span>STATUS DAPUR:</span>
        <span className="border border-black px-1.5 py-0.5">
          [ ] SELESAI SIAP SAJI
        </span>
      </div>
      <div className="text-center text-[9px] font-mono text-stone-600 mt-0.5">
        -- POTONG KERTAS DI SINI --
      </div>
    </div>
  );
}
