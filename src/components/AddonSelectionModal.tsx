import React, { useState } from "react";
import { Product, ProductAddonGroup, SelectedAddon, formatRupiah, DEFAULT_BEVERAGE_ADDONS, DEFAULT_DESSERT_ADDONS } from "../data";
import { Plus, Minus, X, Check, Sparkles } from "lucide-react";

interface AddonSelectionModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: (product: Product, quantity: number, selectedAddons: SelectedAddon[], notes: string) => void;
}

export default function AddonSelectionModal({
  product,
  onClose,
  onConfirm,
}: AddonSelectionModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  // Determine effective addon groups: product-specific or category-based defaults
  const addonGroups: ProductAddonGroup[] = React.useMemo(() => {
    if (product.addons && product.addons.length > 0) {
      return product.addons;
    }
    const cat = (product.category || "").toLowerCase();
    const name = (product.name || "").toLowerCase();
    if (
      cat.includes("kopi") ||
      cat.includes("minum") ||
      cat.includes("drink") ||
      name.includes("latte") ||
      name.includes("tea") ||
      name.includes("coffee") ||
      name.includes("chocolate")
    ) {
      return DEFAULT_BEVERAGE_ADDONS;
    }
    return DEFAULT_DESSERT_ADDONS;
  }, [product]);

  // Initial selection map: { [groupName]: string | string[] }
  const [selections, setSelections] = useState<{ [key: string]: any }>(() => {
    const initial: { [key: string]: any } = {};
    addonGroups.forEach((group) => {
      const gName = group.name || group.groupName || "";
      if (group.type === "single" && group.options.length > 0) {
        // Default to the first option (e.g. Normal Sugar, Normal Ice, Chilled)
        initial[gName] = group.options[0].name;
      } else if (group.type === "multiple") {
        initial[gName] = [];
      }
    });
    return initial;
  });

  const handleSingleSelect = (groupName: string, optionName: string) => {
    setSelections((prev) => ({
      ...prev,
      [groupName]: optionName,
    }));
  };

  const handleMultipleToggle = (groupName: string, optionName: string) => {
    setSelections((prev) => {
      const currentList: string[] = prev[groupName] || [];
      const exists = currentList.includes(optionName);
      const nextList = exists
        ? currentList.filter((item) => item !== optionName)
        : [...currentList, optionName];
      return {
        ...prev,
        [groupName]: nextList,
      };
    });
  };

  // Compute total addon extra price per unit
  const totalExtraPricePerUnit = React.useMemo(() => {
    let extra = 0;
    addonGroups.forEach((group) => {
      const gName = group.name || group.groupName || "";
      const selected = selections[gName];
      if (group.type === "single") {
        const opt = group.options.find((o) => o.name === selected);
        if (opt && opt.price) extra += opt.price;
      } else if (group.type === "multiple" && Array.isArray(selected)) {
        selected.forEach((optName) => {
          const opt = group.options.find((o) => o.name === optName);
          if (opt && opt.price) extra += opt.price;
        });
      }
    });
    return extra;
  }, [addonGroups, selections]);

  const unitPrice = product.price + totalExtraPricePerUnit;
  const totalPrice = unitPrice * quantity;

  const handleSave = () => {
    const finalAddons: SelectedAddon[] = [];
    addonGroups.forEach((group) => {
      const gName = group.name || group.groupName || "";
      const selected = selections[gName];
      if (group.type === "single" && selected) {
        const opt = group.options.find((o) => o.name === selected);
        finalAddons.push({
          groupName: gName,
          optionName: selected,
          name: selected,
          price: opt?.price || 0,
        });
      } else if (group.type === "multiple" && Array.isArray(selected)) {
        selected.forEach((optName) => {
          const opt = group.options.find((o) => o.name === optName);
          finalAddons.push({
            groupName: gName,
            optionName: optName,
            name: optName,
            price: opt?.price || 0,
          });
        });
      }
    });

    onConfirm(product, quantity, finalAddons, notes.trim());
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-stone-200/80 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D45D79] text-white flex items-center justify-center shadow-xs">
              <Sparkles size={17} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C44D69] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60">
                  {product.category}
                </span>
                <span className="text-[10px] text-stone-500 font-medium">Kustomisasi Menu</span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-stone-900 leading-tight mt-0.5">
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

        {/* Body (Scrollable Addon Groups) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 custom-scrollbar flex-1">
          {addonGroups.map((group, gIdx) => {
            const isSingle = group.type === "single";
            const gName = group.name || group.groupName || "";
            const currentVal = selections[gName];

            return (
              <div key={gIdx} className="bg-stone-50/70 rounded-2xl p-3.5 border border-stone-200/80">
                <div className="flex justify-between items-center mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-stone-900">{gName}</span>
                    {group.required && (
                      <span className="text-[9px] font-bold text-[#C44D69] bg-rose-100/70 px-1.5 py-0.5 rounded">
                        Wajib
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-stone-500">
                    {isSingle ? "Pilih 1" : "Bisa lebih dari 1"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {group.options.map((opt, oIdx) => {
                    const isSelected = isSingle
                      ? currentVal === opt.name
                      : Array.isArray(currentVal) && currentVal.includes(opt.name);

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() =>
                          isSingle
                            ? handleSingleSelect(gName, opt.name)
                            : handleMultipleToggle(gName, opt.name)
                        }
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between select-none ${
                          isSelected
                            ? "bg-[#D45D79] text-white border-[#D45D79] shadow-xs ring-2 ring-rose-200/70"
                            : "bg-white text-stone-800 border-stone-200/80 hover:border-rose-300 hover:bg-rose-50/40"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold leading-tight line-clamp-1">
                            {opt.name}
                          </span>
                          {isSelected && <Check size={13} strokeWidth={2.5} className="shrink-0 ml-1" />}
                        </div>
                        <span
                          className={`text-[11px] font-semibold mt-1 ${
                            isSelected ? "text-rose-100" : "text-[#C44D69]"
                          }`}
                        >
                          {opt.price > 0 ? `+${formatRupiah(opt.price)}` : "Gratis"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Notes field */}
          <div className="bg-stone-50/70 rounded-2xl p-3.5 border border-stone-200/80">
            <label className="text-xs font-bold text-stone-900 block mb-1">
              Catatan Khusus (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Pisahkan es / jangan terlalu manis..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium text-stone-900 outline-none focus:border-[#D45D79] focus:ring-1 focus:ring-rose-200 placeholder:text-stone-400 transition-all"
            />
          </div>
        </div>

        {/* Footer: Quantity & Action */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/80 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-700">Jumlah:</span>
              <div className="flex items-center bg-white border border-stone-200/80 rounded-xl p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-700 hover:bg-stone-100 active:scale-95 transition-all"
                >
                  <Minus size={13} strokeWidth={2.5} />
                </button>
                <span className="w-8 text-center text-sm font-bold text-stone-900">
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
              <div className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                Total Harga
              </div>
              <div className="text-lg font-black text-stone-900">
                {formatRupiah(totalPrice)}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200/80 bg-white font-bold text-xs text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-[2] py-2.5 px-4 rounded-xl bg-[#D45D79] hover:bg-[#C44D69] text-white font-bold text-xs shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus size={15} strokeWidth={2.5} />
              Tambahkan ke Pesanan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
