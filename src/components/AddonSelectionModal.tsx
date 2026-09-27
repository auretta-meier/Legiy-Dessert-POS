import React, { useState, useMemo } from "react";
import { Product, SelectedAddon, formatRupiah } from "../data";
import {
  Plus,
  Minus,
  X,
  Sparkles,
  MessageSquareText,
  DollarSign,
  Trash2,
  Check,
  Tag,
} from "lucide-react";

interface AddonSelectionModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: (
    product: Product,
    quantity: number,
    selectedAddons: SelectedAddon[],
    notes: string
  ) => void;
}

interface ExtraFeeItem {
  id: string;
  amount: number;
  desc: string;
}

export default function AddonSelectionModal({
  product,
  onClose,
  onConfirm,
}: AddonSelectionModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  // Biaya tambahan dengan keterangan
  const [extraFees, setExtraFees] = useState<ExtraFeeItem[]>([
    { id: "fee-1", amount: 0, desc: "" },
  ]);

  // Quick chips for Notes Tambahan
  const QUICK_NOTE_CHIPS = [
    "Dingin Segar",
    "Suhu Ruang",
    "Dihangatkan",
    "Less Sweet",
    "Normal Sweet",
    "Tanpa Es",
    "Pisahkan Saus",
    "Sendok & Garpu",
  ];

  // Quick presets for Biaya Tambahan
  const QUICK_FEE_AMOUNTS = [2000, 3000, 5000, 10000, 15000];
  const QUICK_FEE_DESCS = [
    "Extra Keju",
    "Extra Topping",
    "Box & Pita",
    "Lilin & Kartu",
    "Extra Shot",
  ];

  const handleAppendNote = (chipText: string) => {
    setNotes((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chipText;
      if (trimmed.includes(chipText)) return trimmed;
      return `${trimmed}, ${chipText}`;
    });
  };

  const handleUpdateFee = (id: string, field: "amount" | "desc", value: any) => {
    setExtraFees((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddFeeRow = () => {
    setExtraFees((prev) => [
      ...prev,
      { id: `fee-${Date.now()}`, amount: 0, desc: "" },
    ]);
  };

  const handleRemoveFeeRow = (id: string) => {
    setExtraFees((prev) => {
      if (prev.length === 1) {
        return [{ id: "fee-1", amount: 0, desc: "" }];
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  // Compute total extra fee per unit
  const totalExtraFeePerUnit = useMemo(() => {
    return extraFees.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [extraFees]);

  const unitPrice = product.price + totalExtraFeePerUnit;
  const totalPrice = unitPrice * quantity;

  const handleSave = () => {
    const finalAddons: SelectedAddon[] = [];

    extraFees.forEach((fee) => {
      const feeNum = Number(fee.amount) || 0;
      if (feeNum > 0) {
        const descText = fee.desc.trim() || "Biaya Tambahan";
        finalAddons.push({
          groupName: "Biaya Tambahan",
          optionName: descText,
          name: descText,
          price: feeNum,
        });
      }
    });

    onConfirm(product, quantity, finalAddons, notes.trim());
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200/90 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#D81B60] text-white flex items-center justify-center shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#D81B60] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60">
                  {product.category || "Menu"}
                </span>
                <span className="text-[11px] font-mono font-bold text-stone-500">
                  {formatRupiah(product.price)}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 leading-tight mt-0.5">
                {product.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body: Notes Tambahan & Biaya Tambahan */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          {/* SECTION 1: NOTES TAMBAHAN */}
          <div className="bg-stone-50/80 rounded-2xl p-4 border border-stone-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <MessageSquareText size={15} className="text-[#D81B60]" />
                Notes Tambahan
              </label>
              <span className="text-[10px] font-bold text-stone-400">
                Opsional
              </span>
            </div>

            <textarea
              rows={2}
              placeholder="Ketik catatan pesanan... (Contoh: Dihangatkan, kurang manis, jangan pakai sedotan)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs font-bold text-stone-900 outline-none focus:border-[#D81B60] focus:ring-1 focus:ring-rose-200 placeholder:text-stone-400 transition-all resize-none"
            />

            {/* Quick chips for 1-tap notes */}
            <div>
              <span className="text-[10px] font-bold text-stone-400 block mb-1.5">
                Pilihan Cepat Catatan:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_NOTE_CHIPS.map((chip) => {
                  const isIncluded = notes.toLowerCase().includes(chip.toLowerCase());
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleAppendNote(chip)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        isIncluded
                          ? "bg-rose-100 border-[#D81B60] text-[#D81B60]"
                          : "bg-white border-stone-200 text-stone-700 hover:border-pink-300 hover:bg-pink-50/40"
                      }`}
                    >
                      + {chip}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 2: BIAYA TAMBAHAN DISERTAI KETERANGAN */}
          <div className="bg-stone-50/80 rounded-2xl p-4 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <DollarSign size={15} className="text-emerald-600" />
                Biaya Tambahan & Keterangan
              </label>
              {totalExtraFeePerUnit > 0 && (
                <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  +{formatRupiah(totalExtraFeePerUnit)}/item
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {extraFees.map((fee, idx) => (
                <div
                  key={fee.id}
                  className="bg-white p-3 rounded-xl border border-stone-200 space-y-2 relative"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Nominal Biaya Tambahan */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-1">
                        Nominal Biaya (Rp)
                      </span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                          Rp
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="500"
                          placeholder="0"
                          value={fee.amount === 0 ? "" : fee.amount}
                          onChange={(e) =>
                            handleUpdateFee(
                              fee.id,
                              "amount",
                              Math.max(0, parseInt(e.target.value) || 0)
                            )
                          }
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-black text-stone-900 outline-none focus:border-emerald-600 focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Keterangan Biaya Tambahan */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-1">
                        Keterangan Biaya
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <Tag
                            size={13}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                          />
                          <input
                            type="text"
                            placeholder="Contoh: Extra Keju / Box Pita"
                            value={fee.desc}
                            onChange={(e) =>
                              handleUpdateFee(fee.id, "desc", e.target.value)
                            }
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-stone-900 outline-none focus:border-emerald-600 focus:bg-white placeholder:text-stone-400"
                          />
                        </div>
                        {extraFees.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFeeRow(fee.id)}
                            className="p-2 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                            title="Hapus baris biaya ini"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Shortcut Buttons for Fee */}
                  <div className="pt-1 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-bold text-stone-400 mr-1">
                      Cepat:
                    </span>
                    {QUICK_FEE_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleUpdateFee(fee.id, "amount", amt)}
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-colors ${
                          fee.amount === amt
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                            : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        +{amt.toLocaleString("id-ID")}
                      </button>
                    ))}
                    {fee.amount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleUpdateFee(fee.id, "amount", 0)}
                        className="text-[10px] font-bold text-stone-400 hover:text-red-500 px-1.5 py-0.5 rounded transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Quick Shortcut Chips for Description */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-bold text-stone-400 mr-1">
                      Keterangan:
                    </span>
                    {QUICK_FEE_DESCS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleUpdateFee(fee.id, "desc", d)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                          fee.desc === d
                            ? "bg-[#D81B60] text-white border-[#D81B60]"
                            : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddFeeRow}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 pt-1"
            >
              <Plus size={14} strokeWidth={2.5} /> Tambah Biaya Lainnya
            </button>
          </div>

          {/* Rincian Harga Ringkas */}
          <div className="bg-stone-100/70 p-3 rounded-2xl border border-stone-200 flex items-center justify-between text-xs">
            <span className="text-stone-600 font-bold">
              Harga Satuan (+Biaya Tambahan):
            </span>
            <span className="font-mono font-black text-stone-900">
              {formatRupiah(unitPrice)}
            </span>
          </div>
        </div>

        {/* Footer: Quantity & Actions */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/90 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-700">Jumlah:</span>
              <div className="flex items-center bg-white border border-stone-200/90 rounded-xl p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-700 hover:bg-stone-100 active:scale-95 transition-all"
                >
                  <Minus size={13} strokeWidth={2.5} />
                </button>
                <span className="w-8 text-center text-sm font-black text-stone-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-700 hover:bg-stone-100 active:scale-95 transition-all"
                >
                  <Plus size={13} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                Total ({quantity}x)
              </div>
              <div className="text-lg font-black text-[#D81B60]">
                {formatRupiah(totalPrice)}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 bg-white font-black text-xs text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-[2] py-2.5 px-4 rounded-xl bg-[#D81B60] hover:bg-[#C2185B] text-white font-black text-xs shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <Check size={16} strokeWidth={2.5} />
              Tambahkan ke Pesanan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
