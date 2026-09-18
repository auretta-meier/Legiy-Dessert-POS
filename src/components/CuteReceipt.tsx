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

// Thermal-friendly border presets: Uses crisp monochrome characters (no colored emojis)
export const CUTE_FRAME_PRESETS: {
  id: ReceiptFrameStyle;
  label: string;
  badge: string;
  divider: string;
  borderLine: string;
}[] = [
  {
    id: "ribbon",
    label: "Pita & Ribbon (Coquette)",
    badge: "[ ୨୧ ]",
    divider: "୨୧ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ ୨୧",
    borderLine: "୨୧ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ ୨୧",
  },
  {
    id: "hearts",
    label: "Sweet Hearts (Love)",
    badge: "[ ♥ ]",
    divider: "♥ ─ · ─ · ─ · ─ · ─ · ─ · ─ · ─ ♥",
    borderLine: "♥ ♡ ♥ ♡ ♥ ♡ ♥ ♡ ♥ ♡ ♥ ♡ ♥ ♡ ♥ ♡ ♥",
  },
  {
    id: "stars",
    label: "Bintang & Sparkles",
    badge: "[ ★ ]",
    divider: "★ ━━━━━━━━━━━━━━━━━━━━━━━━ ★",
    borderLine: "★ ⋆ ✦ ⋆ ★ ⋆ ✦ ⋆ ★ ⋆ ✦ ⋆ ★ ⋆ ✦ ⋆ ★",
  },
  {
    id: "floral",
    label: "Bunga & Renda (Floral)",
    badge: "[ ✿ ]",
    divider: "✿ ❀ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ❀ ✿",
    borderLine: "✿ ❀ ✿ ❀ ✿ ❀ ✿ ❀ ✿ ❀ ✿ ❀ ✿ ❀ ✿ ❀",
  },
  {
    id: "cat",
    label: "Neko Cat (Kaomoji)",
    badge: "[ (=^･ω･^=) ]",
    divider: "(=^･ω･^=) ┈┈┈┈┈┈┈┈┈┈ (=^･ω･^=)",
    borderLine: "(=^･ω･^=) · · · (=^･ω･^=) · · ·",
  },
  {
    id: "scallop",
    label: "Renda Scallop (Wave)",
    badge: "[ ⌒⌒ ]",
    divider: "⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒",
    borderLine: "⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒",
  },
  {
    id: "classic",
    label: "Minimalis Klasik",
    badge: "[ ══ ]",
    divider: "================================",
    borderLine: "--------------------------------",
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
  const borderLine = activePreset.borderLine;

  return (
    <div
      id={id}
      className={`bg-white text-black font-mono leading-snug select-none ${
        isPrint
          ? "w-[80mm] text-[12px] p-[3mm]"
          : "text-[12.5px] p-4 sm:p-5 rounded-2xl border-4 border-stone-900 shadow-xl"
      } ${className}`}
      style={{
        boxSizing: "border-box",
        fontFamily: "'Courier New', Courier, 'Lucida Console', Monaco, monospace",
        color: "#000000",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Outer Cute Header Banner - 100% Solid Black Text */}
      <div className="text-center font-black text-[11px] tracking-wider mb-1">
        <span className="inline-block px-2.5 py-0.5 border-2 border-black rounded-full font-black text-[10.5px] uppercase text-black">
          {settings.cuteHeaderMotto || "* SWEET DESSERT CAFE *"}
        </span>
      </div>

      {/* Decorative Top Border */}
      <div className="text-center text-[11px] text-black font-black tracking-widest overflow-hidden my-0.5">
        {borderLine}
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
        <div className="font-black text-[18px] uppercase tracking-tight text-black leading-tight">
          *** {settings.storeName || "Legiy's Dessert"} ***
        </div>

        {settings.storeTagline && (
          <div className="text-[11px] font-black text-black mt-0.5">
            * {settings.storeTagline} *
          </div>
        )}

        {settings.showAddress !== false && settings.storeAddress && (
          <div className="text-[11px] font-black text-black mt-0.5 leading-tight">
            [Alamat] {settings.storeAddress}
          </div>
        )}

        <div className="text-[11.5px] font-black text-black mt-0.5 flex items-center justify-center gap-2 flex-wrap">
          {settings.showPhone !== false && settings.storePhone && (
            <span>[Telp] {settings.storePhone}</span>
          )}
          {settings.showInstagram !== false && settings.instagram && (
            <span>[IG] {settings.instagram}</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="text-center text-[11px] font-black my-1 text-black">
        {divider}
      </div>

      {/* Ticket Style Order Details Frame - Pure White Background with Strong Black Borders */}
      <div className="border-2 border-black rounded-xl p-2.5 my-1.5 text-[11.5px] space-y-1 bg-white text-black font-bold">
        <div className="flex justify-between items-center">
          <span className="font-black uppercase text-black">[No. Order]</span>
          <span className="font-black tracking-wider text-[13px] border-2 border-black px-2 py-0.5 rounded text-black bg-white">
            {order.orderId}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-black">[Waktu]</span>
          <span className="font-black text-black">
            {formattedDate} {formattedTime} WIB
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-black">[Tipe Order]</span>
          <span className="font-black text-black uppercase">
            {order.orderType === "Dine-in" ? "DINE-IN" : "TAKE AWAY"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-black">[Metode Bayar]</span>
          <span className="font-black text-black uppercase">{order.paymentMethod}</span>
        </div>

        {/* Customer Greeting Box */}
        <div className="mt-1.5 pt-1.5 border-t-2 border-dashed border-black flex justify-between items-center text-[12px]">
          <span className="font-black text-black">
            {settings.cuteGreetingText || "Customer Tersayang :"}
          </span>
          <span className="font-black uppercase text-[12px] text-black">
            {order.customerName ? `Kak ${order.customerName}` : "Kakak Manis"}
          </span>
        </div>
      </div>

      {/* Items Section Header */}
      <div className="text-center text-[11.5px] font-black tracking-wider uppercase my-1.5 py-0.5 border-y-2 border-black text-black">
        === DAFTAR PESANAN ===
      </div>

      {/* Items List - High Contrast Pitch Black */}
      <div className="space-y-2 my-2 text-black">
        {items.length === 0 ? (
          <div className="text-center italic py-2 text-black text-xs font-bold">
            (Tidak ada detail item)
          </div>
        ) : (
          items.map((item: any, idx: number) => {
            const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
            return (
              <div key={idx} className="text-[12px] text-black">
                <div className="flex items-start justify-between font-black uppercase text-[12.5px] text-black">
                  <span className="flex-1 pr-1 text-black">
                    * {item.name}
                  </span>
                  <span className="font-black text-[12.5px] shrink-0 text-black">
                    {itemTotal.toLocaleString("id-ID")}
                  </span>
                </div>

                {item.selectedAddons && item.selectedAddons.length > 0 && (
                  <div className="text-[11px] pl-3 space-y-0.5 text-black font-bold">
                    {item.selectedAddons.map((a: any, aIdx: number) => (
                      <div key={aIdx} className="flex justify-between text-black">
                        <span className="text-black">
                          + {a.optionName || a.name}
                        </span>
                        {a.price > 0 && (
                          <span className="font-black text-black">
                            +{Number(a.price).toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {item.itemNotes && (
                  <div className="text-[11px] pl-3 italic text-black font-bold">
                    * Note: {item.itemNotes}
                  </div>
                )}

                <div className="text-[11.5px] pl-3 font-black text-black">
                  {item.quantity} x {Number(item.price).toLocaleString("id-ID")}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Divider */}
      <div className="text-center text-[11px] font-black my-1 text-black">
        {divider}
      </div>

      {/* Totals Section */}
      <div className="space-y-1 text-[12px] text-black font-bold">
        <div className="flex justify-between">
          <span className="text-black">Subtotal Pesanan</span>
          <span className="font-black text-black">
            Rp {Number(order.subtotal || 0).toLocaleString("id-ID")}
          </span>
        </div>

        {order.discount ? (
          <div className="flex justify-between">
            <span className="text-black">[Diskon] Potongan</span>
            <span className="font-black text-black">
              -Rp {Number(order.discount).toLocaleString("id-ID")}
            </span>
          </div>
        ) : null}

        {order.tax && order.tax > 0 ? (
          <div className="flex justify-between">
            <span className="text-black">PB1 (Pajak Restoran)</span>
            <span className="font-black text-black">
              Rp {Number(order.tax).toLocaleString("id-ID")}
            </span>
          </div>
        ) : null}

        {/* High-Contrast Total Box (White Background with Strong Double/Black Border for Clean Thermal Print) */}
        <div className="border-2 border-black rounded-lg p-2.5 my-2 bg-white text-black">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] uppercase tracking-wider font-black text-black">
                TOTAL BAYAR
              </div>
              <div className="text-[10.5px] font-black text-black mt-0.5">
                * Dibuat Dengan Cinta *
              </div>
            </div>
            <div className="font-black text-[18px] tracking-tight text-black">
              Rp {Number(order.total || 0).toLocaleString("id-ID")}
            </div>
          </div>
        </div>

        {/* Payment & Change */}
        <div className="flex justify-between pt-0.5 text-[12px]">
          <span className="text-black">Bayar ({order.paymentMethod})</span>
          <span className="font-black text-black">
            Rp{" "}
            {Number(
              order.cashGiven || order.paidAmount || order.total
            ).toLocaleString("id-ID")}
          </span>
        </div>

        {order.paymentMethod === "Cash" && (
          <div className="flex justify-between text-[12px]">
            <span className="text-black">Kembalian</span>
            <span className="font-black text-black">
              Rp {Number(order.change || 0).toLocaleString("id-ID")}{" "}
              <span className="text-[11px] font-bold">(*^_^*)</span>
            </span>
          </div>
        )}
      </div>

      {/* Happiness Rating Meter (Monochrome Thermal Friendly) */}
      {settings.showHappinessMeter !== false && (
        <div className="border-2 border-dashed border-black rounded-xl p-2 my-2 text-center bg-white text-black">
          <div className="text-[11px] font-black uppercase tracking-wider text-black">
            * TINGKAT MANIS & BAHAGIA HARI INI *
          </div>
          <div className="text-[13px] font-black mt-0.5 tracking-widest text-black">
            [ ★ ★ ★ ★ ★ ]
          </div>
          <div className="text-[10.5px] font-black italic mt-0.5 text-black">
            100% Sweet & Delicious (*^_^*)
          </div>
        </div>
      )}

      {/* Wi-Fi Details in Monochrome Frame */}
      {settings.showWifi !== false &&
        (settings.wifiSsid || settings.wifiPass) && (
          <div className="border-2 border-black rounded-xl p-2 my-2 text-center text-[11px] font-black bg-white text-black">
            <div className="text-[11px] font-black uppercase tracking-wider text-black">
              [ FASILITAS FREE WI-FI ]
            </div>
            <div className="mt-0.5 text-black">
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
            <div className="text-[10px] font-bold mt-0.5 text-black">
              (Selamat menikmati wifi sambil santai yaa)
            </div>
          </div>
        )}

      {/* Quotes in Crisp Ribbon Frame */}
      {settings.showQuotes !== false && settings.quotesBelow && (
        <div className="my-2 p-2 border-y-2 border-dashed border-black text-center text-[11.5px] font-black italic text-black">
          <div className="text-[10px] font-black uppercase tracking-widest not-italic mb-0.5 text-black">
            ୨୧ QUOTE MANIS HARI INI ୨୧
          </div>
          "{settings.quotesBelow}"
        </div>
      )}

      {/* Cute Mascot & Thank You Doodles (Pure ASCII Art - Razor Sharp on Thermal Printers) */}
      {settings.showCuteDoodles !== false && (
        <div className="text-center my-2 text-[11.5px] font-black space-y-0.5 leading-snug text-black">
          <pre className="font-mono text-[11px] font-black leading-none inline-block text-center mb-1 text-black">
{`   (\\ /)
   ( . .)  ♥
  c(")(")
`}
          </pre>
          <div className="font-black text-[12.5px] uppercase tracking-wide text-black">
            Terima Kasih Banyak Sudah Mampir! (*^_^*)
          </div>
          <div className="text-[11px] italic text-black">
            Semoga harimu semanis dessert kami ~
          </div>
        </div>
      )}

      {/* Footer Messages */}
      <div className="text-center space-y-0.5 text-black my-1">
        {settings.footerText1 && (
          <div className="font-black text-[11.5px] leading-snug text-black">
            {settings.footerText1}
          </div>
        )}
        {settings.footerText2 && (
          <div className="font-black text-[11px] uppercase tracking-wide text-black">
            {settings.footerText2}
          </div>
        )}
      </div>

      {/* QR Code in High-Contrast Stamp Frame */}
      {settings.showQrCode !== false && (
        <div className="flex flex-col items-center justify-center mt-2 pt-2 border-t-2 border-dashed border-black">
          <div className="text-[11px] font-black uppercase tracking-wider mb-1 text-black">
            [ SCAN UNTUK MENU & MEDSOS ]
          </div>
          <div className="bg-white p-1.5 border-2 border-black rounded-lg inline-block">
            <QRCodeCanvas
              value={settings.qrCodeUrl || "https://linktr.ee/legiy_dessert"}
              size={isPrint ? 84 : 88}
              level="M"
              fgColor="#000000"
              bgColor="#ffffff"
            />
          </div>
          <div className="text-[10px] font-black text-black mt-1 break-all">
            {settings.qrCodeUrl || "linktr.ee/legiy_dessert"}
          </div>
          <div className="text-[10px] font-bold text-black mt-0.5">
            Follow Instagram: @legiy_dessert
          </div>
        </div>
      )}

      {/* Bottom Border */}
      <div className="text-center text-[11px] text-black font-black tracking-widest overflow-hidden mt-2 pt-1 border-t-2 border-black">
        {borderLine}
        <div className="text-[10.5px] font-black mt-0.5 tracking-wider uppercase text-black">
          * Have a Sweet & Wonderful Day! *
        </div>
        <div className="text-[9px] font-mono tracking-tighter text-black">
          v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v^v
        </div>
      </div>
    </div>
  );
}
