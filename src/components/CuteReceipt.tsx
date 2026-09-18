import React from "react";
import { QRCodeCanvas } from "qrcode.react";
import { STORE_LOGO_PRINT } from "../logo";

export type ReceiptFrameStyle =
  | "ribbon"
  | "hearts"
  | "stars"
  | "floral"
  | "cat"
  | "scallop"
  | "classic";

export interface CuteReceiptProps {
  order: {
    orderId: string;
    timestamp: string | number;
    customerName?: string;
    orderType: string;
    paymentMethod: string;
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
    cashGiven?: number;
    paidAmount?: number;
    change?: number;
    items?: any[];
    cartSnapshot?: any[];
  };
  settings: {
    storeName?: string;
    storeTagline?: string;
    storeAddress?: string;
    storePhone?: string;
    instagram?: string;
    wifiSsid?: string;
    wifiPass?: string;
    quotesBelow?: string;
    footerText1?: string;
    footerText2?: string;
    qrCodeUrl?: string;
    showLogo?: boolean;
    showAddress?: boolean;
    showPhone?: boolean;
    showInstagram?: boolean;
    showWifi?: boolean;
    showQuotes?: boolean;
    showQrCode?: boolean;
    // Cute customization options
    frameStyle?: ReceiptFrameStyle;
    showCuteDoodles?: boolean;
    showHappinessMeter?: boolean;
    cuteHeaderMotto?: string;
    cuteGreetingText?: string;
  };
  isPrint?: boolean;
  className?: string;
  id?: string;
}

export const CUTE_FRAME_PRESETS: {
  id: ReceiptFrameStyle;
  label: string;
  icon: string;
  divider: string;
  cornerIcon: string;
}[] = [
  {
    id: "ribbon",
    label: "Pita & Ribbon (Coquette Cafe)",
    icon: "🎀",
    divider: "୨୧ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ ୨୧",
    cornerIcon: "୨୧",
  },
  {
    id: "hearts",
    label: "Sweet Hearts (Lovely Cafe)",
    icon: "💖",
    divider: "♥ ─ · ─ · ─ · ─ · ─ · ─ · ─ ♥",
    cornerIcon: "♡",
  },
  {
    id: "stars",
    label: "Bintang & Magic (Sparkles)",
    icon: "✨",
    divider: "⋆｡˚ ✧ ━━━━━━━━━━━━━━ ✧ ˚｡⋆",
    cornerIcon: "✦",
  },
  {
    id: "floral",
    label: "Bunga & Renda (Floral Vintage)",
    icon: "🌸",
    divider: "✿ ❀ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ❀ ✿",
    cornerIcon: "✿",
  },
  {
    id: "cat",
    label: "Neko Cat (Kucing Manis)",
    icon: "🐾",
    divider: "ฅ^•ﻌ•^ฅ ┈┈┈┈┈┈┈┈┈┈┈┈ ฅ^•ﻌ•^ฅ",
    cornerIcon: "🐾",
  },
  {
    id: "scallop",
    label: "Renda Scallop (Sweet Bakery)",
    icon: "🧁",
    divider: "·.¸¸.·♩♪♫ ·.¸¸.·♩♪♫ ·.¸¸.·",
    cornerIcon: "🧁",
  },
  {
    id: "classic",
    label: "Minimalis Klasik",
    icon: "📄",
    divider: "--------------------------------",
    cornerIcon: "•",
  },
];

export default function CuteReceipt({
  order,
  settings,
  isPrint = false,
  className = "",
  id,
}: CuteReceiptProps) {
  const frameStyle: ReceiptFrameStyle = settings.frameStyle || "ribbon";
  const activePreset =
    CUTE_FRAME_PRESETS.find((p) => p.id === frameStyle) || CUTE_FRAME_PRESETS[0];

  const items =
    Array.isArray(order.cartSnapshot) && order.cartSnapshot.length > 0
      ? order.cartSnapshot
      : Array.isArray(order.items) && order.items.length > 0
      ? order.items
      : [];

  const formattedDate = new Date(order.timestamp).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = new Date(order.timestamp).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const divider = activePreset.divider;

  return (
    <div
      id={id}
      className={`bg-white text-black font-mono leading-snug select-none ${
        isPrint
          ? "w-[80mm] text-[11.5px] p-[3.5mm]"
          : "text-[12px] p-4 sm:p-5 rounded-2xl border-4 border-stone-900 shadow-xl"
      } ${className}`}
      style={{
        boxSizing: "border-box",
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      {/* Outer Cute Header Banner */}
      <div className="text-center font-bold text-[10.5px] tracking-wider mb-1">
        <span className="inline-block px-2 py-0.5 border border-black rounded-full font-black text-[9.5px] uppercase">
          {settings.cuteHeaderMotto || "⋆ ˚｡⋆୨୧˚ SWEET DESSERT CAFE ˚୨୧⋆｡˚ ⋆"}
        </span>
      </div>

      {/* Decorative Top Scallop Border */}
      <div className="text-center text-[10px] text-black font-black tracking-widest overflow-hidden opacity-90 my-0.5">
        {frameStyle === "ribbon" && "୨୧ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ ୨୧"}
        {frameStyle === "hearts" && "♡ ♥ ♡ ♥ ♡ ♥ ♡ ♥ ♡ ♥ ♡ ♥ ♡ ♥ ♡ ♥ ♡"}
        {frameStyle === "stars" && "★ ⋆ ˚ ｡ ⋆ ✦ ⋆ ˚ ｡ ⋆ ✦ ⋆ ˚ ｡ ⋆ ★"}
        {frameStyle === "floral" && "✿ ❀ ✿ ❀ ✿ ❀ ✿ ❀ ✿ ❀ ✿ ❀ ✿ ❀ ✿ ❀"}
        {frameStyle === "cat" && "🐾 (=^･ω･^=) 🐾 (=^･ω･^=) 🐾"}
        {frameStyle === "scallop" && "⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒"}
        {frameStyle === "classic" && "================================"}
      </div>

      {/* Brand Header */}
      <div className="text-center my-1.5">
        {settings.showLogo !== false && (
          <div className="flex justify-center mb-1">
            <img
              src={STORE_LOGO_PRINT}
              alt="Logo"
              className="w-28 h-auto object-contain mx-auto filter contrast-200 grayscale"
            />
          </div>
        )}
        <div className="font-black text-[17px] uppercase tracking-tight text-black leading-tight flex items-center justify-center gap-1.5">
          <span>✨</span>
          <span>{settings.storeName || "Legiy's Dessert"}</span>
          <span>✨</span>
        </div>

        {settings.storeTagline && (
          <div className="text-[10.5px] font-bold italic text-black mt-0.5">
            ♡ {settings.storeTagline} ♡
          </div>
        )}

        {settings.showAddress !== false && settings.storeAddress && (
          <div className="text-[11px] font-bold text-black mt-0.5 leading-tight">
            📍 {settings.storeAddress}
          </div>
        )}

        <div className="text-[11px] font-black text-black mt-0.5 flex items-center justify-center gap-2 flex-wrap">
          {settings.showPhone !== false && settings.storePhone && (
            <span>📞 {settings.storePhone}</span>
          )}
          {settings.showInstagram !== false && settings.instagram && (
            <span>📸 {settings.instagram}</span>
          )}
        </div>
      </div>

      {/* Cute Divider */}
      <div className="text-center text-[10.5px] font-black my-1.5 text-black">
        {divider}
      </div>

      {/* Ticket Style Order Details Frame */}
      <div className="border-2 border-black rounded-xl p-2 my-1.5 text-[11px] space-y-0.5 bg-white">
        <div className="flex justify-between font-bold">
          <span className="flex items-center gap-1 font-black">
            <span>🍰 No. Order</span>
          </span>
          <span className="font-black tracking-wider text-[12px] bg-black text-white px-1.5 py-0.2 rounded">
            {order.orderId}
          </span>
        </div>
        <div className="flex justify-between font-bold">
          <span>📅 Waktu</span>
          <span>
            {formattedDate} • {formattedTime} WIB
          </span>
        </div>
        <div className="flex justify-between font-bold">
          <span>🏷️ Tipe Pesanan</span>
          <span className="font-black uppercase">
            {order.orderType === "Dine-in" ? "Dine-in 🍽️" : "Take Away 🛍️"}
          </span>
        </div>
        <div className="flex justify-between font-bold">
          <span>💳 Metode Bayar</span>
          <span className="font-black uppercase">{order.paymentMethod}</span>
        </div>

        {/* Customer Greeting Box */}
        <div className="mt-1.5 pt-1.5 border-t border-dashed border-black flex justify-between items-center text-[11.5px]">
          <span className="font-black text-stone-900">
            {settings.cuteGreetingText || "Customer Tersayang :"}
          </span>
          <span className="font-black uppercase text-[12px] underline decoration-wavy">
            {order.customerName ? `Kak ${order.customerName} 💖` : "Kakak Manis 💖"}
          </span>
        </div>
      </div>

      {/* Items Section Header */}
      <div className="text-center text-[11px] font-black tracking-wider uppercase my-1.5 py-0.5 border-y border-black">
        ‧₊˚ 🍰 DAFTAR PESANAN MANIS 🍰 ˚₊‧
      </div>

      {/* Items List */}
      <div className="space-y-2 my-2 text-black">
        {items.length === 0 ? (
          <div className="text-center italic py-2 text-stone-600 text-xs">
            (Tidak ada detail item)
          </div>
        ) : (
          items.map((item: any, idx: number) => {
            const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
            return (
              <div key={idx} className="text-[11.5px]">
                <div className="flex items-start justify-between font-black uppercase text-[12px]">
                  <span className="flex-1 pr-1">
                    ✦ {item.name}
                  </span>
                  <span className="font-black text-[12px] shrink-0">
                    {itemTotal.toLocaleString("id-ID")}
                  </span>
                </div>

                {item.selectedAddons && item.selectedAddons.length > 0 && (
                  <div className="text-[10px] pl-3.5 space-y-0.2 text-black font-semibold">
                    {item.selectedAddons.map((a: any, aIdx: number) => (
                      <div key={aIdx} className="flex justify-between">
                        <span>
                          └─ + {a.optionName || a.name}
                        </span>
                        {a.price > 0 && (
                          <span>+{Number(a.price).toLocaleString("id-ID")}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {item.itemNotes && (
                  <div className="text-[10px] pl-3.5 italic text-black">
                    ❝ Note: {item.itemNotes} ❞
                  </div>
                )}

                <div className="text-[10.5px] pl-3.5 font-bold text-stone-800">
                  {item.quantity} x {Number(item.price).toLocaleString("id-ID")}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cute Divider */}
      <div className="text-center text-[10.5px] font-black my-1.5 text-black">
        {divider}
      </div>

      {/* Totals Section with Cute Stamp */}
      <div className="space-y-1 text-[11.5px] text-black font-bold">
        <div className="flex justify-between">
          <span>Subtotal Pesanan</span>
          <span className="font-black">
            Rp {Number(order.subtotal || 0).toLocaleString("id-ID")}
          </span>
        </div>

        {order.discount ? (
          <div className="flex justify-between">
            <span>🎁 Diskon Spesial</span>
            <span className="font-black">
              -Rp {Number(order.discount).toLocaleString("id-ID")}
            </span>
          </div>
        ) : null}

        {order.tax && order.tax > 0 ? (
          <div className="flex justify-between">
            <span>PB1 (Pajak Restoran)</span>
            <span className="font-black">
              Rp {Number(order.tax).toLocaleString("id-ID")}
            </span>
          </div>
        ) : null}

        {/* Big Cute Total Box */}
        <div className="border-2 border-black rounded-xl p-2 my-1.5 bg-black text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-stone-300">
              Total Pembayaran
            </div>
            <div className="text-[9px] italic text-stone-300">
              ♡ Dibuat dengan cinta & manis
            </div>
          </div>
          <div className="font-black text-[17px] tracking-tight">
            Rp {Number(order.total || 0).toLocaleString("id-ID")}
          </div>
        </div>

        {/* Payment & Change */}
        <div className="flex justify-between pt-0.5 text-[11px]">
          <span>Bayar ({order.paymentMethod})</span>
          <span className="font-black">
            Rp{" "}
            {Number(
              order.cashGiven || order.paidAmount || order.total
            ).toLocaleString("id-ID")}
          </span>
        </div>

        {order.paymentMethod === "Cash" && (
          <div className="flex justify-between text-[11.5px]">
            <span>Kembalian</span>
            <span className="font-black">
              Rp {Number(order.change || 0).toLocaleString("id-ID")}{" "}
              <span className="text-[10px] font-normal">(っ˘ω˘ς)</span>
            </span>
          </div>
        )}
      </div>

      {/* Happiness Rating Meter (Cute Ornament) */}
      {settings.showHappinessMeter !== false && (
        <div className="border border-dashed border-black rounded-xl p-2 my-2 text-center bg-white">
          <div className="text-[10px] font-black uppercase tracking-wider">
            ˚₊‧ Tingkat Manis & Bahagia Hari Ini ‧₊˚
          </div>
          <div className="text-[12px] font-black mt-0.5 tracking-widest">
            [ ★ ★ ★ ★ ★ ]
          </div>
          <div className="text-[9.5px] font-bold italic mt-0.5">
            100% Sweet & Delicious! 🍰✨
          </div>
        </div>
      )}

      {/* Wi-Fi Details in Cute Frame */}
      {settings.showWifi !== false &&
        (settings.wifiSsid || settings.wifiPass) && (
          <div className="border-2 border-black rounded-xl p-2 my-2 text-center text-[10.5px] font-bold bg-white">
            <div className="text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1">
              <span>📶</span>
              <span>Fasilitas Free Wi-Fi</span>
              <span>📶</span>
            </div>
            <div className="mt-0.5">
              <span>SSID: </span>
              <span className="font-black text-black">
                {settings.wifiSsid || "Legiy_Free_WiFi"}
              </span>
              {settings.wifiPass && (
                <span className="ml-2">
                  Pass:{" "}
                  <span className="font-black text-black">
                    {settings.wifiPass}
                  </span>
                </span>
              )}
            </div>
            <div className="text-[9px] italic mt-0.5 text-stone-700">
              (Selamat menikmati koneksi sambil santai yaa ☕)
            </div>
          </div>
        )}

      {/* Quotes in Cute Ribbon Frame */}
      {settings.showQuotes !== false && settings.quotesBelow && (
        <div className="my-2 p-2 border-y-2 border-dashed border-black text-center text-[11px] font-bold italic text-black">
          <div className="text-[9px] font-black uppercase tracking-widest not-italic mb-0.5">
            ୨୧ QUOTE MANIS HARI INI ୨୧
          </div>
          ❝ {settings.quotesBelow} ❞
        </div>
      )}

      {/* Cute Mascot & Thank You Doodles */}
      {settings.showCuteDoodles !== false && (
        <div className="text-center my-1.5 text-[10.5px] font-bold space-y-0.5 leading-snug">
          <pre className="font-mono text-[10px] font-black leading-none inline-block text-center mb-1">
{`   (\\ /)
   ( . .)  ♥
  c(")(")
`}
          </pre>
          <div className="font-black text-[12px] uppercase tracking-wide">
            Terima Kasih Banyak Sudah Mampir! 💖
          </div>
          <div className="text-[10.5px] italic">
            Semoga harimu semanis dessert kami ~
          </div>
        </div>
      )}

      {/* Footer Messages */}
      <div className="text-center space-y-0.5 text-black my-1">
        {settings.footerText1 && (
          <div className="font-bold text-[11px] leading-snug">
            {settings.footerText1}
          </div>
        )}
        {settings.footerText2 && (
          <div className="font-black text-[10.5px] uppercase tracking-wide">
            {settings.footerText2}
          </div>
        )}
      </div>

      {/* QR Code in Cute Stamp Frame */}
      {settings.showQrCode !== false && (
        <div className="flex flex-col items-center justify-center mt-2 pt-2 border-t-2 border-dashed border-black">
          <div className="text-[10px] font-black uppercase tracking-wider mb-1 flex items-center gap-1">
            <span>✿</span>
            <span>Scan untuk Menu & Medsos</span>
            <span>✿</span>
          </div>
          <div className="bg-white p-1.5 border-2 border-black rounded-xl inline-block shadow-xs">
            <QRCodeCanvas
              value={settings.qrCodeUrl || "https://linktr.ee/legiy_dessert"}
              size={isPrint ? 82 : 88}
              level="M"
              fgColor="#000000"
              bgColor="#ffffff"
            />
          </div>
          <div className="text-[9px] font-bold text-stone-900 mt-1 break-all">
            {settings.qrCodeUrl || "linktr.ee/legiy_dessert"}
          </div>
          <div className="text-[8.5px] italic text-stone-700 mt-0.5">
            Tag kami di IG @legiy_dessert & dapatkan kejutan manis! ✨
          </div>
        </div>
      )}

      {/* Cute Bottom Edge Scallop */}
      <div className="text-center text-[10px] text-black font-black tracking-widest overflow-hidden opacity-90 mt-2 pt-1 border-t border-black">
        {frameStyle === "ribbon" && "୨୧ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ ୨୧"}
        {frameStyle === "hearts" && "♡ ♥ ♡ ♥ ♡ ♥ ♡ ♥ ♡ ♥ ♡ ♥ ♡ ♥ ♡ ♥ ♡"}
        {frameStyle === "stars" && "★ ⋆ ˚ ｡ ⋆ ✦ ⋆ ˚ ｡ ⋆ ✦ ⋆ ˚ ｡ ⋆ ★"}
        {frameStyle === "floral" && "✿ ❀ ✿ ❀ ✿ ❀ ✿ ❀ ✿ ❀ ✿ ❀ ✿ ❀ ✿ ❀"}
        {frameStyle === "cat" && "🐾 (=^･ω･^=) 🐾 (=^･ω･^=) 🐾"}
        {frameStyle === "scallop" && "⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒"}
        {frameStyle === "classic" && "================================"}
        <div className="text-[9px] font-black mt-0.5 tracking-wider uppercase">
          *･ﾟ✧ Have a Sweet & Magical Day! ✧･ﾟ*
        </div>
        <div className="text-[8px] font-mono tracking-tighter opacity-80">
          v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v
        </div>
      </div>
    </div>
  );
}
