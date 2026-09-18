import React, { useState, useMemo, useEffect } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle,
  CheckCircle2,
  Save,
  Coffee,
  Cookie,
  CupSoda,
  ShoppingBag,
  Settings,
  Store,
  List,
  ArrowDownToLine,
  ArrowUpToLine,
  History,
  User,
  Search,
  Database,
  Cloud,
  RefreshCw,
  Heart,
  Sparkles,
  SlidersHorizontal,
  Tag,
  Receipt,
  X,
  Wifi,
  Quote,
  Instagram,
  Check,
  ChevronRight,
  Activity,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  HelpCircle,
  Radio,
} from "lucide-react";
import {
  products,
  formatRupiah,
  Category,
  Product,
  initialCategories,
  ProductAddonGroup,
  ProductAddonOption,
  SelectedAddon,
  DEFAULT_BEVERAGE_ADDONS,
  DEFAULT_DESSERT_ADDONS,
} from "./data";
import ManagementFinance from "./components/ManagementFinance";
import ManagementPerformance from "./components/ManagementPerformance";
import AddonSelectionModal from "./components/AddonSelectionModal";
import {
  subscribeToProducts,
  subscribeToCategories,
  subscribeToOrders,
  subscribeToExpenses,
  subscribeToPreOrders,
  subscribeToReceiptSettings,
  syncProductToFirestore,
  syncCategoryToFirestore,
  syncOrderToFirestore,
  syncExpenseToFirestore,
  syncPreOrderToFirestore,
  syncReceiptSettingsToFirestore,
  seedInitialFirestoreData,
  importFromGoogleSheetsToFirestore,
  testFirestoreConnection,
} from "./firebase";
import { QRCodeCanvas } from "qrcode.react";
import { STORE_LOGO, STORE_LOGO_PRINT } from "./logo";
import CuteReceipt, { CUTE_FRAME_PRESETS, ReceiptFrameStyle } from "./components/CuteReceipt";

export const DESSERT_QUOTES_PRESETS = [
  "Manisnya pas, bikin harimu lebih ceria!",
  "Life is short, eat dessert first!",
  "Setiap gigitan adalah kebahagiaan.",
  "Terima kasih telah menjadi bagian cerita manis kami.",
  "Dibuat dengan cinta, dinikmati dengan senyuman.",
  "Dessert lezat untuk momen berharga Anda.",
  "Makan dessert dulu, bahagia kemudian.",
  "Terima kasih sudah mendukung UMKM kuliner lokal.",
];

export const DEFAULT_RECEIPT_SETTINGS = {
  storeName: "Legiy's Dessert",
  storeTagline: "Sweet Delights & Artisanal Desserts",
  storeAddress: "Perumahan TSI, Blok O.14, Cirebon",
  storePhone: "0812-1252-7520",
  instagram: "@legiy_dessert",
  wifiSsid: "Legiy_Free_WiFi",
  wifiPass: "manislegiy",
  quotesBelow: "Manisnya pas, bikin harimu lebih ceria!",
  footerText1: "Terima kasih atas kunjungannya!",
  footerText2: "Barang yang sudah dibeli tidak dapat ditukar",
  qrCodeUrl: "https://linktr.ee/legiy_dessert",
  showLogo: true,
  showAddress: true,
  showPhone: true,
  showInstagram: true,
  showWifi: true,
  showQuotes: true,
  showQrCode: true,
  // Cute Aesthetics & Frames (Optimized for thermal monochrome print)
  frameStyle: "ribbon" as ReceiptFrameStyle,
  showCuteDoodles: true,
  showHappinessMeter: true,
  cuteHeaderMotto: "* SWEET DESSERT CAFE *",
  cuteGreetingText: "Customer Tersayang :",
};

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      let currentVal = storedValue;
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        try {
          currentVal = JSON.parse(raw);
        } catch (_) {}
      }
      const valueToStore =
        value instanceof Function ? value(currentVal) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

const parseIndonesianNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  
  let str = String(val).trim();
  str = str.replace(/^Rp\.?\s*/i, "");
  
  if (str.includes('.') && !str.includes(',')) {
    const parts = str.split('.');
    const isIndoFormat = parts.slice(1).every((part) => part.length === 3);
    if (isIndoFormat) {
      str = str.replace(/\./g, "");
    }
  } else if (str.includes(',') && str.includes('.')) {
    if (str.indexOf('.') < str.indexOf(',')) {
      str = str.replace(/\./g, "").replace(/,/g, ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(',')) {
    const parts = str.split(',');
    const isThousandSeparator = parts.slice(1).every((part) => part.length === 3);
    if (isThousandSeparator) {
      str = str.replace(/,/g, "");
    } else {
      str = str.replace(/,/g, ".");
    }
  }
  
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

const getCartSnapshotOrFallback = (o: any, productList: Product[]): any[] => {
  if (o.cartSnapshot) {
    if (typeof o.cartSnapshot === 'string') {
      try {
        const parsed = JSON.parse(o.cartSnapshot);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    } else if (Array.isArray(o.cartSnapshot)) {
      return o.cartSnapshot;
    }
  }
  
  if (o.items && typeof o.items === 'string') {
    const itemsList: any[] = [];
    const parts = o.items.split(', ');
    parts.forEach((p: string) => {
      const match = p.match(/(.+?)\s*\((\d+)x\)/);
      if (match) {
        const name = match[1].trim();
        const quantity = parseInt(match[2]) || 1;
        const prod = productList.find((x) => x.name.toLowerCase() === name.toLowerCase());
        itemsList.push({
          id: prod?.id || name,
          name: name,
          price: prod?.price || 0,
          cogs: prod?.cogs || 0,
          quantity: quantity
        });
      } else {
        const match2 = p.match(/^(\d+)x\s+(.+)$/);
        if (match2) {
          const quantity = parseInt(match2[1]) || 1;
          let name = match2[2].trim();
          name = name.replace(/\s*\(Rp\s*\d+[.,]?\d*\)/i, '').trim();
          const prod = productList.find((x) => x.name.toLowerCase() === name.toLowerCase());
          itemsList.push({
            id: prod?.id || name,
            name: name,
            price: prod?.price || 0,
            cogs: prod?.cogs || 0,
            quantity: quantity
          });
        }
      }
    });
    if (itemsList.length > 0) return itemsList;
  }
  
  return [];
};

function ManagementMenu({
  productList,
  setProductList,
  categories,
  setCategories,
  queueSync,
}: {
  productList: Product[];
  setProductList: any;
  categories: string[];
  setCategories: any;
  queueSync: any;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>({
    name: "",
    category: categories[0] || "",
    price: 0,
    cogs: 0,
    addons: [],
  });

  const openAdd = () => {
    setEditingProduct(null);
    const cat = categories[0] || "";
    const isDrink = cat.toLowerCase().includes("minuman") || cat.toLowerCase().includes("drink") || cat.toLowerCase().includes("kopi");
    setForm({
      name: "",
      category: cat,
      price: 0,
      cogs: 0,
      addons: isDrink ? JSON.parse(JSON.stringify(DEFAULT_BEVERAGE_ADDONS)) : JSON.parse(JSON.stringify(DEFAULT_DESSERT_ADDONS)),
    });
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      ...p,
      addons: p.addons && p.addons.length > 0 
        ? JSON.parse(JSON.stringify(p.addons))
        : (p.category.toLowerCase().includes("minuman") || p.category.toLowerCase().includes("drink") || p.category.toLowerCase().includes("kopi"))
          ? JSON.parse(JSON.stringify(DEFAULT_BEVERAGE_ADDONS))
          : JSON.parse(JSON.stringify(DEFAULT_DESSERT_ADDONS)),
    });
    setIsModalOpen(true);
  };

  const saveProduct = () => {
    if (
      !form.name ||
      form.price === undefined ||
      form.cogs === undefined ||
      !form.category
    )
      return;
    if (editingProduct) {
      const updatedProduct = { ...editingProduct, ...form } as Product;
      setProductList((prev: Product[]) =>
        prev.map((p) => (p.id === editingProduct.id ? updatedProduct : p)),
      );
      queueSync("PRODUCT", "UPSERT", updatedProduct);
    } else {
      const newProduct = { ...form, id: Math.random().toString() } as Product;
      setProductList((prev: Product[]) => [
        newProduct,
        ...prev,
      ]);
      queueSync("PRODUCT", "UPSERT", newProduct);
    }
    setIsModalOpen(false);
  };

  const deleteProduct = (id: string) => {
    setProductList((prev: Product[]) => prev.filter((x) => x.id !== id));
    queueSync("PRODUCT", "DELETE", { id });
  };

  // Helper functions for modifying addons in form
  const addAddonGroup = () => {
    const newGroup: ProductAddonGroup = {
      id: `group-${Date.now()}`,
      name: "Opsi Tambahan",
      type: "single",
      required: false,
      options: [
        { id: `opt-${Date.now()}-1`, name: "Standar", price: 0 },
        { id: `opt-${Date.now()}-2`, name: "Extra", price: 5000 },
      ],
    };
    setForm((prev) => ({
      ...prev,
      addons: [...(prev.addons || []), newGroup],
    }));
  };

  const applyBeveragePreset = () => {
    setForm((prev) => ({
      ...prev,
      addons: JSON.parse(JSON.stringify(DEFAULT_BEVERAGE_ADDONS)),
    }));
  };

  const applyDessertPreset = () => {
    setForm((prev) => ({
      ...prev,
      addons: JSON.parse(JSON.stringify(DEFAULT_DESSERT_ADDONS)),
    }));
  };

  const clearAddons = () => {
    setForm((prev) => ({
      ...prev,
      addons: [],
    }));
  };

  return (
    <div className="p-6 h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-black text-stone-900">Product Menu</h3>
          <p className="text-xs text-stone-500 font-bold mt-0.5">
            Kelola daftar menu, harga, modal (COGS), dan kustomisasi addons (sugar, ice, topping)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openAdd}
            className="bg-[#D81B60] hover:bg-[#C2185B] text-white px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus size={16} strokeWidth={3} /> Add Product
          </button>
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="bg-white border-2 border-stone-200 hover:bg-stone-50 hover:border-stone-300 text-stone-800 px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 transition-colors"
          >
             Manage Categories
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b-2 border-stone-200 text-stone-700 text-xs uppercase tracking-wider">
                <th className="pb-3 font-black">Product Name</th>
                <th className="pb-3 font-black">Category</th>
                <th className="pb-3 font-black">Price</th>
                <th className="pb-3 font-black">COGS</th>
                <th className="pb-3 font-black">Add-ons (Kustomisasi)</th>
                <th className="pb-3 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {productList.map((p, idx) => (
                <tr
                  key={`${p.id}-${idx}`}
                  className="border-b border-stone-100 hover:bg-stone-50/80 transition-colors"
                >
                  <td className="py-4 text-sm font-black text-stone-900">
                    {p.name}
                  </td>
                  <td className="py-4 text-xs font-bold text-stone-600">
                    <span className="px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-md">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-4 text-sm font-mono font-black text-[#D81B60]">
                    {formatRupiah(p.price)}
                  </td>
                  <td className="py-4 text-sm font-mono font-bold text-stone-600">
                    {formatRupiah(p.cogs)}
                  </td>
                  <td className="py-4 text-xs">
                    {p.addons && p.addons.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.addons.map((g) => (
                          <span
                            key={g.id}
                            className="bg-pink-50 border border-pink-200 text-[#D81B60] font-black px-2 py-0.5 rounded text-[10px]"
                          >
                            {g.name} ({g.options.length})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-stone-400 font-bold text-[11px]">
                        Standar (Otomatis)
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-[#D81B60] hover:text-[#AD1457] hover:underline text-xs font-black mr-4 inline-block"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="text-red-600 hover:text-red-800 hover:underline text-xs font-black inline-block"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs z-20 p-4 sm:p-6 flex flex-col justify-center items-center overflow-y-auto">
          <div className="bg-white border text-left border-stone-200 shadow-2xl rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <div>
                <h3 className="text-base font-black text-stone-900">
                  {editingProduct ? "Edit Produk & Add-ons" : "Tambah Produk Baru"}
                </h3>
                <p className="text-[11px] text-stone-500 font-bold">
                  Atur detail menu serta opsi pilihan kustomisasi kasir
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-black text-stone-700 block mb-1">
                    Nama Menu Produk
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-[#D81B60] font-bold text-stone-900"
                    placeholder="Contoh: Iced Caramel Macchiato"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-stone-700 block mb-1">
                    Kategori Menu
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value as Category })
                    }
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-[#D81B60] font-bold text-stone-900"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-stone-700 block mb-1">
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="number"
                    value={form.price || ""}
                    onChange={(e) =>
                      setForm({ ...form, price: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-[#D81B60] font-bold text-stone-900"
                    placeholder="25000"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-stone-700 block mb-1">
                    Modal / HPP (COGS) (Rp)
                  </label>
                  <input
                    type="number"
                    value={form.cogs || ""}
                    onChange={(e) =>
                      setForm({ ...form, cogs: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-[#D81B60] font-bold text-stone-900"
                    placeholder="12000"
                  />
                </div>
              </div>

              {/* Addons Customizer Section */}
              <div className="pt-4 border-t-2 border-stone-100">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal size={14} className="text-[#D81B60]" />
                      <h4 className="text-xs font-black text-stone-900 uppercase tracking-wide">
                        Kustomisasi Add-ons (Popup Kasir)
                      </h4>
                    </div>
                    <p className="text-[11px] text-stone-500 font-bold">
                      Pilihan yang muncul saat kasir mengklik menu ini (less sugar, es, topping, dll)
                    </p>
                  </div>
                </div>

                {/* Preset quick buttons */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <button
                    type="button"
                    onClick={applyBeveragePreset}
                    className="text-[11px] font-black bg-pink-50 text-[#D81B60] hover:bg-pink-100 border border-pink-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    + Preset Minuman (Gula & Es)
                  </button>
                  <button
                    type="button"
                    onClick={applyDessertPreset}
                    className="text-[11px] font-black bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    + Preset Dessert (Suhu & Topping)
                  </button>
                  <button
                    type="button"
                    onClick={addAddonGroup}
                    className="text-[11px] font-black bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    + Tambah Grup Baru
                  </button>
                  {form.addons && form.addons.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAddons}
                      className="text-[11px] font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors ml-auto"
                    >
                      Hapus Semua
                    </button>
                  )}
                </div>

                {/* Groups list */}
                {(!form.addons || form.addons.length === 0) ? (
                  <div className="p-4 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 text-center text-stone-400 text-xs font-bold">
                    Tidak ada kustomisasi khusus. Klik salah satu tombol preset di atas untuk menambahkan pilihan addons ke menu ini.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form.addons.map((group, gIdx) => (
                      <div
                        key={group.id || gIdx}
                        className="p-3.5 bg-stone-50 rounded-2xl border-2 border-stone-200 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={group.name}
                            onChange={(e) => {
                              const next = [...(form.addons || [])];
                              next[gIdx] = { ...next[gIdx], name: e.target.value };
                              setForm({ ...form, addons: next });
                            }}
                            className="text-xs font-black text-stone-900 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 flex-1 outline-none focus:border-[#D81B60]"
                            placeholder="Nama Grup (e.g. Level Gula / Topping)"
                          />
                          <select
                            value={group.type}
                            onChange={(e) => {
                              const next = [...(form.addons || [])];
                              next[gIdx] = { ...next[gIdx], type: e.target.value as "single" | "multiple" };
                              setForm({ ...form, addons: next });
                            }}
                            className="text-xs font-bold text-stone-800 bg-white border border-stone-300 rounded-lg px-2 py-1.5 outline-none"
                          >
                            <option value="single">1 Pilihan (Radio)</option>
                            <option value="multiple">Banyak (Checkbox)</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const next = (form.addons || []).filter((_, idx) => idx !== gIdx);
                              setForm({ ...form, addons: next });
                            }}
                            className="text-stone-400 hover:text-rose-600 p-1.5"
                            title="Hapus Grup Ini"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Options inside this group */}
                        <div className="space-y-2 pl-2 border-l-2 border-[#D81B60]/30">
                          {group.options.map((opt, oIdx) => (
                            <div key={opt.id || oIdx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={opt.name}
                                onChange={(e) => {
                                  const next = [...(form.addons || [])];
                                  const nextOpts = [...next[gIdx].options];
                                  nextOpts[oIdx] = { ...nextOpts[oIdx], name: e.target.value };
                                  next[gIdx] = { ...next[gIdx], options: nextOpts };
                                  setForm({ ...form, addons: next });
                                }}
                                placeholder="Nama Opsi (e.g. Less Sugar)"
                                className="flex-1 text-xs font-bold text-stone-900 bg-white border border-stone-200 rounded-lg px-2 py-1 outline-none focus:border-[#D81B60]"
                              />
                              <div className="relative w-28">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 font-bold">+Rp</span>
                                <input
                                  type="number"
                                  value={opt.price || ""}
                                  onChange={(e) => {
                                    const next = [...(form.addons || [])];
                                    const nextOpts = [...next[gIdx].options];
                                    nextOpts[oIdx] = { ...nextOpts[oIdx], price: parseInt(e.target.value) || 0 };
                                    next[gIdx] = { ...next[gIdx], options: nextOpts };
                                    setForm({ ...form, addons: next });
                                  }}
                                  placeholder="0"
                                  className="w-full text-xs font-mono font-bold text-stone-900 bg-white border border-stone-200 rounded-lg pl-8 pr-2 py-1 outline-none text-right focus:border-[#D81B60]"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...(form.addons || [])];
                                  next[gIdx].options = next[gIdx].options.filter((_, idx) => idx !== oIdx);
                                  setForm({ ...form, addons: next });
                                }}
                                className="text-stone-300 hover:text-rose-500 p-1"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...(form.addons || [])];
                              next[gIdx].options.push({
                                id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                name: "Opsi Baru",
                                price: 0,
                              });
                              setForm({ ...form, addons: next });
                            }}
                            className="text-[11px] font-bold text-[#D81B60] hover:underline pt-1 flex items-center gap-1"
                          >
                            <Plus size={12} strokeWidth={3} /> Tambah Opsi ke Grup Ini
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex gap-2 justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-black text-stone-600 hover:bg-stone-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={saveProduct}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#D81B60] text-white hover:brightness-110 shadow-xs transition-all flex items-center gap-2"
              >
                <Save size={14} /> Simpan Menu & Add-ons
              </button>
            </div>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 p-6 flex flex-col justify-center items-center">
          <div className="bg-white border text-left border-stone-200 shadow-xl rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-stone-800 mb-4">Manage Categories</h3>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="New category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#D81B60]"
              />
              <button
                onClick={() => {
                  const trimmed = newCategory.trim();
                  if (trimmed && !categories.includes(trimmed)) {
                    setCategories([...categories, trimmed]);
                    queueSync("CATEGORY", "UPSERT", { id: trimmed, name: trimmed });
                    setNewCategory("");
                  }
                }}
                className="bg-[#D81B60] text-white px-3 py-2 rounded-lg text-sm font-bold"
              >
                Add
              </button>
            </div>

            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto custom-scrollbar">
              {categories.map((cat) => (
                <div key={cat} className="flex justify-between items-center bg-stone-50 border border-stone-100 p-2 rounded-lg">
                  <span className="text-sm font-semibold text-stone-700">{cat}</span>
                  <button
                    onClick={() => {
                      setCategories(categories.filter((c: string) => c !== cat));
                      queueSync("CATEGORY", "DELETE", { id: cat, name: cat });
                    }}
                    className="text-stone-400 hover:text-red-500 transition-colors"
                    title="Remove category"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-[#D81B60] text-white hover:brightness-110"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManagementHistory({
  orderHistory,
  printReceipt,
  setOrderHistory,
  queueSync,
}: {
  orderHistory: any[];
  printReceipt: (order?: any) => void;
  setOrderHistory: any;
  queueSync: any;
}) {
  const sortedOrderHistory = useMemo(() => {
    const list = Array.isArray(orderHistory) ? orderHistory : [];
    return [...list].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  }, [orderHistory]);

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center mb-6">
        <h3 className="text-lg font-bold text-stone-800">
          Order History ({sortedOrderHistory.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {sortedOrderHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-300">
            <History size={48} className="opacity-20 mb-3" />
            <p className="text-sm font-bold text-stone-400">
              Belum ada transaksi selesai.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-widest">
                  <th className="pb-3 font-bold">Order ID</th>
                  <th className="pb-3 font-bold">Date & Time</th>
                  <th className="pb-3 font-bold">Customer</th>
                  <th className="pb-3 font-bold">Type</th>
                  <th className="pb-3 font-bold">Payment</th>
                  <th className="pb-3 font-bold text-right">Total Amount</th>
                  <th className="pb-3 font-bold text-center">Receipt</th>
                  <th className="pb-3 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrderHistory.map((o, idx) => {
                  const displayTotal = typeof o.total === 'number' ? o.total : parseIndonesianNumber(o.total);
                  return (
                    <tr
                      key={`${o.orderId}-${idx}`}
                      className="border-b border-stone-100 hover:bg-stone-50 transition-colors group"
                    >
                      <td className="py-4 text-sm font-mono font-bold text-stone-800">
                        {o.orderId}
                      </td>
                      <td className="py-4 text-xs font-semibold text-stone-500">
                        {new Date(o.timestamp).toLocaleDateString("id-ID")}{" "}
                        <span className="text-stone-400 ml-1">
                          {new Date(o.timestamp).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="py-4 text-xs font-bold text-stone-800">
                        {o.customerName || "-"}
                      </td>
                      <td className="py-4 text-xs font-bold text-stone-600">
                        <span
                          className={`px-2 py-1 rounded-md ${o.orderType === "Dine-in" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}
                        >
                          {o.orderType}
                        </span>
                      </td>
                      <td className="py-4 text-xs font-bold text-stone-600">
                        {o.paymentMethod}
                      </td>
                      <td className="py-4 text-sm font-mono font-bold text-[#D81B60] text-right">
                        {formatRupiah(displayTotal)}
                      </td>
                      <td className="py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            printReceipt(o);
                          }}
                          title="Print Receipt"
                          className="p-2 text-stone-400 hover:text-[#D81B60] hover:bg-stone-50 rounded-lg transition-colors inline-block"
                        >
                          <Printer size={16} />
                        </button>
                      </td>
                      <td className="py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Yakin ingin menghapus Order ${o.orderId}?`)) {
                              setOrderHistory((prev: any[]) => prev.filter((x) => x.orderId !== o.orderId));
                              queueSync("ORDER", "DELETE", { orderId: o.orderId });
                            }
                          }}
                          title="Hapus Order"
                          className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 inline-block"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ManagementPreOrder({
  preOrders,
  setPreOrders,
  queueSync,
}: {
  preOrders: any[];
  setPreOrders: any;
  queueSync: any;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    customer: "",
    orderDetails: "",
    paymentStatus: "Belum Bayar",
    fetchDate: "",
  });

  const openAdd = () => {
    setForm({
      customer: "",
      orderDetails: "",
      paymentStatus: "Belum Bayar",
      fetchDate: "",
    });
    setIsModalOpen(true);
  };

  const savePreOrder = () => {
    if (!form.customer || !form.orderDetails) return;
    const newPreOrder = {
      id: Math.random().toString(),
      customer: form.customer,
      orderDetails: form.orderDetails,
      paymentStatus: form.paymentStatus || "Belum Bayar",
      fetchDate: form.fetchDate || new Date().toLocaleDateString("id-ID"),
      timestamp: new Date().toISOString(),
    };
    setPreOrders((prev: any[]) => [
      newPreOrder,
      ...prev,
    ]);
    queueSync("PRE_ORDER", "UPSERT", newPreOrder);
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-stone-800">Pre Order Tracking</h3>
        <button
          onClick={openAdd}
          className="bg-[#D81B60] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          <Plus size={16} /> Add Pre Order
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {preOrders.length === 0 ? (
          <p className="text-stone-400 text-sm">Belum ada data pre-order.</p>
        ) : (
          <div className="space-y-3">
            {preOrders.map((p, idx) => (
              <div
                key={`${p.id}-${idx}`}
                className="p-4 border border-stone-200 rounded-xl flex justify-between bg-stone-50"
              >
                <div>
                  <h4 className="font-bold text-stone-800 text-sm">
                    {p.customer}
                  </h4>
                  <p className="text-xs text-stone-500 mt-1">
                    <span className="font-semibold text-stone-700">
                      Pesanan:
                    </span>{" "}
                    {p.orderDetails}
                  </p>
                  <p className="text-[10px] text-stone-500 mt-1">
                    <span className="font-semibold text-stone-700">
                      Tanggal Diambil:
                    </span>{" "}
                    {p.fetchDate}
                  </p>
                </div>
                <div className="text-right flex flex-col justify-between items-end">
                  <p
                    className={`text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase tracking-widest ${p.paymentStatus === "Lunas" ? "bg-emerald-100 text-emerald-800" : p.paymentStatus === "DP" ? "bg-amber-100 text-amber-800" : "bg-stone-200 text-stone-600"}`}
                  >
                    {p.paymentStatus}
                  </p>
                  <button
                    onClick={() => {
                        setPreOrders((prev: any[]) =>
                          prev.filter((x) => x.id !== p.id),
                        );
                        queueSync("PRE_ORDER", "DELETE", { id: p.id });
                      }
                    }
                    className="text-stone-400 hover:text-red-500 mt-2"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 p-6 flex flex-col justify-center items-center">
          <div className="bg-white border text-left border-stone-200 shadow-xl rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-stone-800 mb-4">
              Add Pre Order
            </h3>
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs font-bold text-stone-500">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={form.customer}
                  onChange={(e) =>
                    setForm({ ...form, customer: e.target.value })
                  }
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-[#D81B60]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500">
                  Order Detail
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2x Tiramisu"
                  value={form.orderDetails}
                  onChange={(e) =>
                    setForm({ ...form, orderDetails: e.target.value })
                  }
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-[#D81B60]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500">
                  Payment Status
                </label>
                <select
                  value={form.paymentStatus}
                  onChange={(e) =>
                    setForm({ ...form, paymentStatus: e.target.value })
                  }
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-[#D81B60]"
                >
                  <option value="Belum Bayar">Belum Bayar</option>
                  <option value="DP">DP</option>
                  <option value="Lunas">Lunas</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500">
                  Fetch Date (Target Diambil)
                </label>
                <input
                  type="date"
                  value={form.fetchDate}
                  onChange={(e) =>
                    setForm({ ...form, fetchDate: e.target.value })
                  }
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-[#D81B60]"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-stone-500 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={savePreOrder}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-[#D81B60] text-white hover:brightness-110"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManagementExpense({
  expenses,
  setExpenses,
  queueSync,
}: {
  expenses: any[];
  setExpenses: any;
  queueSync: any;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ desc: "", amount: "" });

  const openAdd = () => {
    setForm({ desc: "", amount: "" });
    setIsModalOpen(true);
  };

  const handleAddExpense = () => {
    if (!form.desc || !form.amount) return;
    const amt = parseInt(form.amount.replace(/\D/g, ""));
    if (!isNaN(amt) && amt > 0) {
      const newExpense = {
        id: Math.random().toString(),
        desc: form.desc,
        amount: amt,
        timestamp: new Date().toISOString(),
      };
      setExpenses((prev: any[]) => [
        newExpense,
        ...prev,
      ]);
      queueSync("EXPENSE", "UPSERT", newExpense);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-stone-800">Expense Logger</h3>
        <button
          onClick={openAdd}
          className="bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {expenses.length === 0 ? (
          <p className="text-stone-400 text-sm">
            Belum ada catatan pengeluaran.
          </p>
        ) : (
          <div className="space-y-3">
            {expenses.map((e, idx) => (
              <div
                key={`${e.id}-${idx}`}
                className="flex justify-between items-center bg-white p-4 rounded-xl border border-stone-200 shadow-sm relative group overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                <div className="pl-2">
                  <p className="text-sm font-bold text-stone-800">{e.desc}</p>
                  <p className="text-[10px] text-stone-400 font-semibold mt-0.5 tracking-widest">
                    {new Date(e.timestamp).toLocaleDateString("id-ID")}{" "}
                    {new Date(e.timestamp).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-bold text-rose-600 font-mono">
                    -{formatRupiah(e.amount)}
                  </p>
                  <button
                    onClick={() => {
                      setExpenses((prev: any[]) => prev.filter((x) => x.id !== e.id));
                      queueSync("EXPENSE", "DELETE", { id: e.id });
                    }}
                    className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 p-6 flex flex-col justify-center items-center">
          <div className="bg-white border text-left border-stone-200 shadow-xl rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-stone-800 mb-4">
              Add Expense
            </h3>
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs font-bold text-stone-500">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Beli Gula"
                  value={form.desc}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-[#D81B60]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500">
                  Amount (Rp)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50000"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-[#D81B60]"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-stone-500 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddExpense}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 text-white hover:brightness-110"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManagementCOGS({ productList }: { productList: Product[] }) {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center mb-6">
        <h3 className="text-lg font-bold text-stone-800">
          Kalkulator COGS & Margin
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-widest">
                <th className="pb-3 font-bold">Produk</th>
                <th className="pb-3 font-bold text-right">Harga Jual</th>
                <th className="pb-3 font-bold text-right">HPP (COGS)</th>
                <th className="pb-3 font-bold text-right">Margin / Profit</th>
                <th className="pb-3 font-bold text-right">% Margin</th>
              </tr>
            </thead>
            <tbody>
              {productList.map((p, idx) => {
                const profit = p.price - p.cogs;
                const marginPct =
                  p.price > 0 ? ((profit / p.price) * 100).toFixed(1) : "0";
                return (
                  <tr
                    key={`${p.id}-${idx}`}
                    className="border-b border-stone-100 hover:bg-stone-50"
                  >
                    <td className="py-4 text-sm font-bold text-stone-800">
                      {p.name}
                    </td>
                    <td className="py-4 text-sm font-mono text-stone-800 text-right">
                      {formatRupiah(p.price)}
                    </td>
                    <td className="py-4 text-sm font-mono text-blue-600 text-right">
                      {formatRupiah(p.cogs)}
                    </td>
                    <td className="py-4 text-sm font-mono font-bold text-emerald-600 text-right">
                      {formatRupiah(profit)}
                    </td>
                    <td className="py-4 text-sm font-mono font-bold text-stone-600 text-right">
                      {marginPct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export interface CartItem extends Product {
  cartId: string;
  quantity: number;
  selectedAddons?: SelectedAddon[];
  itemNotes?: string;
  basePrice?: number;
}

function ManagementSettings({
  receiptSettings,
  setReceiptSettings,
  onTestPrint,
  onMigrateAllToFirebase,
  onImportFromSheets,
  isMigrating,
  isImportingSheets,
  firebaseConnected,
  orderHistoryCount = 0,
  productListCount = 0,
  categoryCount = 0,
}: {
  receiptSettings: any;
  setReceiptSettings: any;
  onTestPrint?: () => void;
  onMigrateAllToFirebase?: () => Promise<void>;
  onImportFromSheets?: () => Promise<void>;
  isMigrating?: boolean;
  isImportingSheets?: boolean;
  firebaseConnected?: boolean;
  orderHistoryCount?: number;
  productListCount?: number;
  categoryCount?: number;
}) {
  const [pingState, setPingState] = useState<{
    loading: boolean;
    result?: { connected: boolean; message: string; latencyMs?: number; projectId: string; databaseId: string };
  }>({ loading: false });

  const handleTestPing = async () => {
    setPingState({ loading: true });
    try {
      const res = await testFirestoreConnection();
      setPingState({ loading: false, result: res });
    } catch (err: any) {
      setPingState({
        loading: false,
        result: {
          connected: false,
          message: err?.message || "Gagal terkoneksi ke Firebase",
          projectId: "mystic-chord-mnm8c",
          databaseId: "ai-studio-legiydessertpos-fced9c3e-1780-4785-a23d-3eae25d862ac",
        },
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-xl font-black text-stone-900">
            System, Cloud & Receipt Settings
          </h3>
          <p className="text-xs text-stone-600 font-bold mt-0.5">
            Kelola backend Firebase Firestore, migrasi data dari Excel/Google Sheets, dan cetak nota thermal 80mm kontras tebal.
          </p>
        </div>
        {onTestPrint && (
          <button
            onClick={onTestPrint}
            className="self-start sm:self-auto bg-stone-950 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all border border-stone-800"
          >
            <Printer size={15} /> Cetak Struk Uji Coba (80mm Kontras Tebal)
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
        {/* Firebase Cloud Backend & Data Migration Card */}
        <div className="bg-white rounded-2xl border-2 border-stone-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600">
                <Database size={20} />
              </div>
              <div>
                <h4 className="text-base font-black text-stone-900 flex items-center gap-2 flex-wrap">
                  Firebase Cloud Firestore & Database Sync
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                    {firebaseConnected ? "Terhubung Cloud (Real-time)" : "Connecting..."}
                  </span>
                </h4>
                <p className="text-xs text-stone-600 font-bold mt-0.5">
                  Backend database Google Cloud Firestore aktif. Data menu, pesanan, dan pengeluaran otomatis tersimpan online.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={handleTestPing}
                disabled={pingState.loading}
                className="bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all disabled:opacity-50 shadow-xs shrink-0"
                title="Uji latensi dan pastikan server Firestore merespons"
              >
                {pingState.loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-[#D45D79]" />
                    Menguji Ping...
                  </>
                ) : (
                  <>
                    <Activity size={14} className="text-[#D45D79]" />
                    Uji Ping Koneksi
                  </>
                )}
              </button>

              {onImportFromSheets && (
                <button
                  onClick={onImportFromSheets}
                  disabled={isImportingSheets || isMigrating}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all disabled:opacity-50 shadow-xs shrink-0"
                  title="Tarik seluruh data produk & riwayat pesanan dari Excel / Google Sheets ke Firestore"
                >
                  {isImportingSheets ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Menarik dari Sheets...
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine size={14} />
                      Tarik dari Sheets
                    </>
                  )}
                </button>
              )}

              {onMigrateAllToFirebase && (
                <button
                  onClick={onMigrateAllToFirebase}
                  disabled={isMigrating || isImportingSheets}
                  className="bg-stone-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all disabled:opacity-50 shadow-xs shrink-0"
                  title="Unggah dan sinkronkan semua item lokal ke server Firestore"
                >
                  {isMigrating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Sedang Menyinkronkan...
                    </>
                  ) : (
                    <>
                      <Cloud size={14} />
                      Sinkron Lokal ke Cloud
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Test Ping Result Banner */}
          {pingState.result && (
            <div
              className={`mt-3 p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                pingState.result.connected
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-bold"
                  : "bg-rose-50 border-rose-200 text-rose-900 font-bold"
              }`}
            >
              <div className="flex items-center gap-2">
                {pingState.result.connected ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                )}
                <span>
                  {pingState.result.connected ? "Koneksi Cloud Berhasil: " : "Koneksi Bermasalah: "}
                  {pingState.result.message}
                </span>
              </div>
              {pingState.result.latencyMs !== undefined && (
                <span className="font-mono bg-white/80 px-2 py-0.5 rounded border text-[11px] shrink-0">
                  {pingState.result.latencyMs} ms
                </span>
              )}
            </div>
          )}

          {/* Configuration & Architecture Info */}
          <div className="mt-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 text-stone-700 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#D45D79]" /> Detail Kredensial Firebase Aktif
              </span>
              <span className="text-[11px] font-mono text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200">
                SDK v12.19.0 • Firestore Real-time
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-stone-500 font-medium">Project ID: </span>
                <span className="font-mono font-bold text-stone-900">mystic-chord-mnm8c</span>
              </div>
              <div>
                <span className="text-stone-500 font-medium">Firestore Database ID: </span>
                <span className="font-mono font-bold text-stone-900 break-all">
                  ai-studio-legiydessertpos-fced9c3e-1780-4785-a23d-3eae25d862ac
                </span>
              </div>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed pt-1">
              💡 <strong>Aplikasi ini sudah otomatis terhubung ke database Firebase</strong>. Setiap transaksi kasir baru, perubahan menu produk, kategori, dan pengeluaran secara langsung tersinkronkan ke Firestore cloud. Anda tidak perlu setup manual lagi. Jika ingin menyalin semua data bawaan saat ini ke server, klik tombol <strong>"Sinkron Lokal ke Cloud"</strong>.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-0.5">
                Riwayat Pesanan (Excel)
              </span>
              <span className="font-mono font-black text-base text-emerald-950">
                {orderHistoryCount} Pesanan
              </span>
            </div>
            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block mb-0.5">
                Produk Menu Aktif
              </span>
              <span className="font-mono font-black text-base text-blue-950">
                {productListCount} Item
              </span>
            </div>
            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-0.5">
                Kategori Menu
              </span>
              <span className="font-mono font-black text-base text-amber-950">
                {categoryCount} Kategori
              </span>
            </div>
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-600 block mb-0.5">
                Status Penyimpanan
              </span>
              <span className="font-black text-xs text-stone-900 flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Firestore Persistent
              </span>
            </div>
          </div>
        </div>

        {/* Receipt Settings & Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Settings */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border-2 border-stone-200 shadow-xs flex flex-col gap-5">
            <div className="pb-3 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <Receipt size={18} className="text-[#D81B60]" />
                  Kustomisasi Format Nota Thermal 80mm
                </h4>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  Atur identitas gerai, alamat cabang, quotes manis di bawah nota, dan QR Code.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-50 border border-pink-200 text-[#D81B60] text-[11px] font-black">
                <Sparkles size={12} />
                Live Preview
              </div>
            </div>

            {/* Section 1: Identitas & Lokasi Gerai */}
            <div className="space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Store size={13} className="text-stone-700" />
                1. Identitas & Lokasi Toko
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">
                    Nama Toko / Brand
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.storeName || ""}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, storeName: e.target.value })
                    }
                    className="w-full text-sm p-2.5 rounded-xl border-2 border-stone-200 bg-white outline-none focus:border-[#D81B60] font-black text-stone-900"
                    placeholder="Legiy's Dessert"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">
                    Slogan / Tagline
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.storeTagline || ""}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, storeTagline: e.target.value })
                    }
                    className="w-full text-sm p-2.5 rounded-xl border-2 border-stone-200 bg-white outline-none focus:border-[#D81B60] font-medium text-stone-800"
                    placeholder="Sweet Delights & Artisanal Desserts"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 mb-1">
                  Alamat Lengkap Toko
                </label>
                <textarea
                  value={receiptSettings.storeAddress || ""}
                  onChange={(e) =>
                    setReceiptSettings({ ...receiptSettings, storeAddress: e.target.value })
                  }
                  rows={2}
                  className="w-full text-sm p-2.5 rounded-xl border-2 border-stone-200 bg-white outline-none focus:border-[#D81B60] font-medium text-stone-800"
                  placeholder="Perumahan TSI, Blok O.14, Cirebon"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">
                    No. WhatsApp / Telepon
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.storePhone || ""}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, storePhone: e.target.value })
                    }
                    className="w-full text-sm p-2.5 rounded-xl border-2 border-stone-200 bg-white outline-none focus:border-[#D81B60] font-medium text-stone-800"
                    placeholder="0812-1252-7520"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1 flex items-center gap-1">
                    <Instagram size={12} />
                    Akun Instagram Toko
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.instagram || ""}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, instagram: e.target.value })
                    }
                    className="w-full text-sm p-2.5 rounded-xl border-2 border-stone-200 bg-white outline-none focus:border-[#D81B60] font-medium text-stone-800"
                    placeholder="@legiy_dessert"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Quotes Inspiratif / Manis di Bawah Nota */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Quote size={13} className="text-stone-700" />
                  2. Quotes Manis & Catatan di Bawah Nota
                </span>
                <label className="flex items-center gap-1.5 text-xs font-bold text-stone-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receiptSettings.showQuotes !== false}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, showQuotes: e.target.checked })
                    }
                    className="rounded accent-[#D81B60]"
                  />
                  <span>Tampilkan Quotes</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 mb-1.5">
                  Pilih Preset Quotes Manis Cepat:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {DESSERT_QUOTES_PRESETS.map((quote, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setReceiptSettings({ ...receiptSettings, quotesBelow: quote })
                      }
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold text-left transition-all ${
                        receiptSettings.quotesBelow === quote
                          ? "bg-pink-100 text-[#D81B60] border-pink-300 shadow-xs"
                          : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {quote}
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-black text-stone-700 mb-1">
                  Teks Quotes di Bawah Nota (Kustom):
                </label>
                <input
                  type="text"
                  value={receiptSettings.quotesBelow || ""}
                  onChange={(e) =>
                    setReceiptSettings({ ...receiptSettings, quotesBelow: e.target.value })
                  }
                  className="w-full text-sm p-2.5 rounded-xl border-2 border-stone-200 bg-white outline-none focus:border-[#D81B60] font-medium italic text-stone-800"
                  placeholder="Manisnya pas, bikin harimu lebih ceria ✨"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">
                    Ucapan Terima Kasih (Baris 1)
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.footerText1 || ""}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, footerText1: e.target.value })
                    }
                    className="w-full text-sm p-2.5 rounded-xl border-2 border-stone-200 bg-white outline-none focus:border-[#D81B60] font-medium text-stone-800"
                    placeholder="Terima kasih atas kunjungannya!"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">
                    Catatan Kaki Tambahan (Baris 2)
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.footerText2 || ""}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, footerText2: e.target.value })
                    }
                    className="w-full text-sm p-2.5 rounded-xl border-2 border-stone-200 bg-white outline-none focus:border-[#D81B60] font-medium text-stone-800"
                    placeholder="Barang yang sudah dibeli tidak dapat ditukar"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Fasilitas Pelanggan & QR Code */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Wifi size={13} className="text-stone-700" />
                3. Fasilitas Wi-Fi & QR Code Pelanggan
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">
                    Nama Wi-Fi (SSID)
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.wifiSsid || ""}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, wifiSsid: e.target.value })
                    }
                    className="w-full text-sm p-2.5 rounded-xl border-2 border-stone-200 bg-white outline-none focus:border-[#D81B60] font-medium text-stone-800"
                    placeholder="Legiy_Free_WiFi"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">
                    Password Wi-Fi
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.wifiPass || ""}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, wifiPass: e.target.value })
                    }
                    className="w-full text-sm p-2.5 rounded-xl border-2 border-stone-200 bg-white outline-none focus:border-[#D81B60] font-mono text-stone-800"
                    placeholder="manislegiy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 mb-1">
                  Link QR Code (Linktree / Medsos / Menu Online)
                </label>
                <input
                  type="text"
                  value={receiptSettings.qrCodeUrl || ""}
                  onChange={(e) =>
                    setReceiptSettings({ ...receiptSettings, qrCodeUrl: e.target.value })
                  }
                  className="w-full text-sm p-2.5 rounded-xl border-2 border-stone-200 bg-white outline-none focus:border-[#D81B60] font-mono text-xs text-blue-600 font-bold"
                  placeholder="https://linktr.ee/legiy_dessert"
                />
              </div>
            </div>

            {/* Section 4: Saklar / Toggles */}
            <div className="pt-2 border-t border-stone-100">
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 block mb-2">
                4. Opsi Tampilan Nota Cetak
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <label className="flex items-center gap-2 p-2 rounded-xl border border-stone-200 bg-stone-50/50 cursor-pointer text-xs font-bold text-stone-700">
                  <input
                    type="checkbox"
                    checked={receiptSettings.showLogo !== false}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, showLogo: e.target.checked })
                    }
                    className="rounded accent-[#D81B60]"
                  />
                  <span>Logo Toko</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl border border-stone-200 bg-stone-50/50 cursor-pointer text-xs font-bold text-stone-700">
                  <input
                    type="checkbox"
                    checked={receiptSettings.showWifi !== false}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, showWifi: e.target.checked })
                    }
                    className="rounded accent-[#D81B60]"
                  />
                  <span>Info Wi-Fi</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl border border-stone-200 bg-stone-50/50 cursor-pointer text-xs font-bold text-stone-700">
                  <input
                    type="checkbox"
                    checked={receiptSettings.showInstagram !== false}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, showInstagram: e.target.checked })
                    }
                    className="rounded accent-[#D81B60]"
                  />
                  <span>Instagram</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl border border-stone-200 bg-stone-50/50 cursor-pointer text-xs font-bold text-stone-700">
                  <input
                    type="checkbox"
                    checked={receiptSettings.showQuotes !== false}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, showQuotes: e.target.checked })
                    }
                    className="rounded accent-[#D81B60]"
                  />
                  <span>Quotes Bawah</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl border border-stone-200 bg-stone-50/50 cursor-pointer text-xs font-bold text-stone-700">
                  <input
                    type="checkbox"
                    checked={receiptSettings.showQrCode !== false}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, showQrCode: e.target.checked })
                    }
                    className="rounded accent-[#D81B60]"
                  />
                  <span>QR Code</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl border border-stone-200 bg-stone-50/50 cursor-pointer text-xs font-bold text-stone-700">
                  <input
                    type="checkbox"
                    checked={receiptSettings.showHappinessMeter !== false}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, showHappinessMeter: e.target.checked })
                    }
                    className="rounded accent-[#D81B60]"
                  />
                  <span>Barometer Bahagia ⭐</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl border border-stone-200 bg-stone-50/50 cursor-pointer text-xs font-bold text-stone-700 col-span-2 sm:col-span-1">
                  <input
                    type="checkbox"
                    checked={receiptSettings.showCuteDoodles !== false}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, showCuteDoodles: e.target.checked })
                    }
                    className="rounded accent-[#D81B60]"
                  />
                  <span>Maskot Lucu & Doodle 🐰</span>
                </label>
              </div>
            </div>

            {/* Section 5: Kustomisasi Frame & Ornamen Lucu (Cute Aesthetics) */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#D81B60]" />
                5. Kustomisasi Frame & Ornamen Lucu (Cute Aesthetics)
              </span>

              <div>
                <label className="block text-xs font-black text-stone-700 mb-1.5">
                  Pilih Gaya Frame / Bingkai Lucu
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CUTE_FRAME_PRESETS.map((preset) => {
                    const isSelected = (receiptSettings.frameStyle || "ribbon") === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          setReceiptSettings({ ...receiptSettings, frameStyle: preset.id })
                        }
                        className={`p-2.5 rounded-xl border-2 text-left transition-all flex flex-col gap-1 ${
                          isSelected
                            ? "border-[#D81B60] bg-pink-50/80 shadow-xs"
                            : "border-stone-200 bg-stone-50/50 hover:bg-stone-100 hover:border-stone-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-black text-black bg-stone-100 px-1.5 py-0.5 rounded border border-stone-300">{preset.badge}</span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-[#D81B60]"></span>
                          )}
                        </div>
                        <div className="text-xs font-black text-stone-800 leading-tight">
                          {preset.label}
                        </div>
                        <div className="text-[9px] font-mono text-stone-500 truncate mt-0.5">
                          {preset.divider}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">
                    Motto Banner Paling Atas
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.cuteHeaderMotto || ""}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, cuteHeaderMotto: e.target.value })
                    }
                    className="w-full text-xs p-2.5 rounded-xl border-2 border-stone-200 bg-white outline-none focus:border-[#D81B60] font-bold text-stone-800"
                    placeholder="* SWEET DESSERT CAFE *"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[
                      "* SWEET DESSERT CAFE *",
                      "(*^_^*) SWEET DESSERT DELIGHTS",
                      "=== LEGIY ARTISANAL DESSERT CAFE ===",
                    ].map((motto, mIdx) => (
                      <button
                        key={mIdx}
                        type="button"
                        onClick={() =>
                          setReceiptSettings({ ...receiptSettings, cuteHeaderMotto: motto })
                        }
                        className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 hover:bg-pink-100 text-stone-700 font-bold"
                      >
                        Pilihan {mIdx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">
                    Teks Sapaan Pelanggan
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.cuteGreetingText || ""}
                    onChange={(e) =>
                      setReceiptSettings({ ...receiptSettings, cuteGreetingText: e.target.value })
                    }
                    className="w-full text-xs p-2.5 rounded-xl border-2 border-stone-200 bg-white outline-none focus:border-[#D81B60] font-bold text-stone-800"
                    placeholder="Customer Tersayang :"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[
                      "Customer Tersayang :",
                      "Untuk Kakak Manis :",
                      "Pesanan Spesial Buat :",
                    ].map((greet, gIdx) => (
                      <button
                        key={gIdx}
                        type="button"
                        onClick={() =>
                          setReceiptSettings({ ...receiptSettings, cuteGreetingText: greet })
                        }
                        className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 hover:bg-pink-100 text-stone-700 font-bold"
                      >
                        {greet.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-1 bg-pink-50/70 border border-pink-200 text-stone-800 p-3 rounded-xl text-xs flex items-center gap-2.5 font-bold">
              <CheckCircle size={16} className="text-[#D81B60] flex-shrink-0" />
              <span>Format nota aesthetic otomatis disimpan dan disinkronkan ke Firebase Firestore.</span>
            </div>
          </div>

          {/* Live Preview Card (80mm Cute Style) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="text-xs font-black text-stone-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D81B60] animate-pulse"></span>
              <span>Pratinjau Nota Cute Thermal 80mm</span>
            </div>

            <CuteReceipt
              order={{
                orderId: "LGY-892104",
                timestamp: Date.now(),
                customerName: "Amanda",
                orderType: "Dine-in",
                paymentMethod: "QRIS",
                subtotal: 88000,
                discount: 5000,
                tax: 0,
                total: 83000,
                paidAmount: 83000,
                change: 0,
                cartSnapshot: [
                  {
                    name: "Pistachio Crepe Cake",
                    price: 38000,
                    quantity: 1,
                    selectedAddons: [{ optionName: "Extra Pistachio Crumb", price: 5000 }],
                    itemNotes: "Piring terpisah yaa"
                  },
                  {
                    name: "Iced Caramel Macchiato",
                    price: 25000,
                    quantity: 2,
                    selectedAddons: [{ optionName: "Less Sugar (50%)", price: 0 }]
                  }
                ]
              }}
              settings={receiptSettings}
              isPrint={false}
              className="w-full max-w-[340px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export type OrderType = "Dine-in" | "Takeaway";
export type PaymentMethod =
  | "Cash"
  | "QRIS"
  | "Transfer BRI"
  | "Transfer JAGO"
  | "Gopay"
  | "Dana"
  | "Shopeepay"
  | "";

type ViewMode = "POS" | "MANAGEMENT";
type ManagementTab =
  | "MENU"
  | "HISTORY"
  | "FINANCE"
  | "PRE_ORDER"
  | "EXPENSE"
  | "COGS"
  | "PERFORMANCE"
  | "SETTINGS";

interface SyncOperation {
  id: string;
  type: "PRODUCT" | "ORDER" | "EXPENSE" | "PRE_ORDER" | "CATEGORY" | "SETTINGS";
  action: "UPSERT" | "DELETE";
  data: any;
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("POS");
  const [managementTab, setManagementTab] = useState<ManagementTab>("FINANCE");
  const [productList, setProductList] = useLocalStorage<Product[]>("legiy_products", products);
  const [categories, setCategories] = useLocalStorage<string[]>("legiy_categories", initialCategories);
  const [orderHistory, setOrderHistory] = useLocalStorage<any[]>("legiy_orders", []);
  const [expenses, setExpenses] = useLocalStorage<any[]>("legiy_expenses", []);
  const [preOrders, setPreOrders] = useLocalStorage<any[]>("legiy_preorders", []);

  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [orderType, setOrderType] = useState<OrderType>("Dine-in");
  const [customerName, setCustomerName] = useState("");
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const [syncQueue, setSyncQueue] = useLocalStorage<SyncOperation[]>("legiy_sync_queue", []);
  
  const [receiptSettings, setReceiptSettings] = useLocalStorage("legiy_receipt_settings", DEFAULT_RECEIPT_SETTINGS);

  const [receiptToPrint, setReceiptToPrint] = useState<any>(null);
  const [isEditingReceipt, setIsEditingReceipt] = useState(false);

  useEffect(() => {
    if (receiptToPrint) {
      // Create an afterprint handler to reset receiptToPrint after printing is complete or canceled
      const handleAfterPrint = () => {
        setReceiptToPrint(null);
      };
      
      window.addEventListener("afterprint", handleAfterPrint);

      const timer = setTimeout(() => {
        window.print();
        // Fallback cleanup in case afterprint does not fire or is delayed in some custom webviews / browsers
        setTimeout(() => {
          setReceiptToPrint(null);
        }, 3000);
      }, 500);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("afterprint", handleAfterPrint);
      };
    }
  }, [receiptToPrint]);

  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isImportingSheets, setIsImportingSheets] = useState(false);
  const [isDbStatusModalOpen, setIsDbStatusModalOpen] = useState(false);
  const [diagnosticPingState, setDiagnosticPingState] = useState<{
    loading: boolean;
    result?: { connected: boolean; message: string; latencyMs?: number; projectId: string; databaseId: string };
  }>({ loading: false });

  const runDiagnosticPing = async () => {
    setDiagnosticPingState({ loading: true });
    try {
      const res = await testFirestoreConnection();
      setDiagnosticPingState({ loading: false, result: res });
      setIsFirebaseConnected(res.connected);
    } catch (err: any) {
      setDiagnosticPingState({
        loading: false,
        result: {
          connected: false,
          message: err?.message || "Koneksi gagal",
          projectId: "mystic-chord-mnm8c",
          databaseId: "ai-studio-legiydessertpos-fced9c3e-1780-4785-a23d-3eae25d862ac",
        },
      });
    }
  };

  // Real-time Firebase Firestore synchronization
  useEffect(() => {
    let isMounted = true;

    const unsubProducts = subscribeToProducts((items) => {
      if (!isMounted) return;
      setIsFirebaseConnected(true);
      if (items && items.length > 0) {
        setProductList(items);
      } else {
        // Auto-seed initial catalog to Firestore if empty
        seedInitialFirestoreData(products, initialCategories).then(() => {
          if (isMounted) setIsFirebaseConnected(true);
        });
      }
    });

    const unsubCategories = subscribeToCategories((items) => {
      if (!isMounted) return;
      if (items && items.length > 0) {
        const merged = Array.from(new Set([...initialCategories, ...items]));
        setCategories(merged);
      }
    });

    const unsubOrders = subscribeToOrders((items) => {
      if (!isMounted) return;
      if (items) {
        setOrderHistory(items);
      }
    });

    const unsubExpenses = subscribeToExpenses((items) => {
      if (!isMounted) return;
      if (items) {
        setExpenses(items);
      }
    });

    const unsubPreOrders = subscribeToPreOrders((items) => {
      if (!isMounted) return;
      if (items) {
        setPreOrders(items);
      }
    });

    const unsubSettings = subscribeToReceiptSettings((cloudSettings) => {
      if (!isMounted) return;
      if (cloudSettings && Object.keys(cloudSettings).length > 0) {
        setReceiptSettings((prev: any) => ({ ...prev, ...cloudSettings }));
      }
    });

    return () => {
      isMounted = false;
      unsubProducts();
      unsubCategories();
      unsubOrders();
      unsubExpenses();
      unsubPreOrders();
      unsubSettings();
    };
  }, []);

  // Debounced auto-sync receipt settings to Firebase Firestore (prevents excessive writes while typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      syncReceiptSettingsToFirestore(receiptSettings).catch((err) => {
        console.warn("Auto-sync receipt settings to Firestore:", err);
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [receiptSettings]);

  const queueSync = async (
    type: "PRODUCT" | "ORDER" | "EXPENSE" | "PRE_ORDER" | "CATEGORY" | "SETTINGS",
    action: "UPSERT" | "DELETE",
    data: any
  ) => {
    setSyncStatus(`Syncing to Firebase...`);
    try {
      if (type === "PRODUCT") {
        await syncProductToFirestore(action, data);
      } else if (type === "CATEGORY") {
        await syncCategoryToFirestore(action, data);
      } else if (type === "ORDER") {
        await syncOrderToFirestore(action, data);
      } else if (type === "EXPENSE") {
        await syncExpenseToFirestore(action, data);
      } else if (type === "PRE_ORDER") {
        await syncPreOrderToFirestore(action, data);
      } else if (type === "SETTINGS") {
        await syncReceiptSettingsToFirestore(data);
      }
      setIsFirebaseConnected(true);
      setSyncStatus(null);
    } catch (err) {
      console.error("Firebase sync error:", err);
      setSyncStatus("Offline saved");
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const handleMigrateAllToFirebase = async () => {
    setIsMigrating(true);
    setSyncStatus("Migrating data to Firebase...");
    try {
      for (const p of productList) {
        await syncProductToFirestore("UPSERT", p);
      }
      for (const c of categories) {
        await syncCategoryToFirestore("UPSERT", { name: c });
      }
      for (const o of orderHistory) {
        await syncOrderToFirestore("UPSERT", o);
      }
      for (const e of expenses) {
        await syncExpenseToFirestore("UPSERT", e);
      }
      for (const po of preOrders) {
        await syncPreOrderToFirestore("UPSERT", po);
      }
      await syncReceiptSettingsToFirestore(receiptSettings);

      setIsFirebaseConnected(true);
      alert("Sukses! Semua data produk, kategori, riwayat transaksi, pengeluaran, dan pre-order berhasil disinkronkan ke Firebase Firestore.");
    } catch (err) {
      console.error("Migration error:", err);
      alert("Gagal memigrasikan sebagian data ke Firebase. Silakan periksa koneksi internet.");
    } finally {
      setIsMigrating(false);
      setSyncStatus(null);
    }
  };

  const handleImportFromSheets = async () => {
    setIsImportingSheets(true);
    setSyncStatus("Menarik data Excel / Google Sheets...");
    try {
      const res = await importFromGoogleSheetsToFirestore();
      if (res.success) {
        alert(
          `Sukses Migrasi dari Excel & Google Sheets!\n` +
          `• ${res.ordersCount} Riwayat Transaksi\n` +
          `• ${res.productsCount} Produk Menu\n` +
          `• ${res.categoriesCount} Kategori Menu\n\n` +
          `Semua data telah tersimpan aman di Firebase Firestore.`
        );
      } else {
        alert(`Gagal menarik data: ${res.message || "Terjadi kesalahan koneksi"}`);
      }
    } catch (err: any) {
      alert(`Gagal menarik data: ${err.message || String(err)}`);
    } finally {
      setIsImportingSheets(false);
      setSyncStatus(null);
    }
  };

  const handleTestPrintReceipt = () => {
    const testItems = [
      { name: "Pistachio Crepe Cake", price: 38000, quantity: 1 },
      { name: "Iced Caramel Macchiato", price: 25000, quantity: 2 },
    ];
    setReceiptToPrint({
      orderId: "TEST-" + Math.floor(100000 + Math.random() * 900000),
      timestamp: new Date().toISOString(),
      customerName: "Kak Amanda (Uji Coba)",
      orderType: "Dine-in",
      cartSnapshot: testItems,
      items: testItems,
      subtotal: 88000,
      tax: 0,
      discount: 0,
      total: 88000,
      paymentMethod: "QRIS",
      cashGiven: 88000,
      paidAmount: 88000,
      change: 0,
    });
  };

  // Checkout & Payment State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");
  const [cashAmount, setCashAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<any>(null);

  // Tax is optional. Let's add 10% tax for realism or keep it 0 as per typical small merchant initially.
  // We'll set 10% pb1 tax as an example, but it can be changed.
  const TAX_RATE = 0; // Set to 0.1 for 10% tax

  // Filter products by category and search query
  const filteredProducts = useMemo(() => {
    let result = activeCategory === "Semua"
      ? productList
      : productList.filter((p) => p.category === activeCategory);
      
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [productList, activeCategory, searchQuery]);

  // Cart operations
  const handleAddToCartWithAddons = (
    product: Product,
    quantity: number,
    selectedAddons: SelectedAddon[],
    notes: string
  ) => {
    const extraPerUnit = selectedAddons.reduce((acc, curr) => acc + (curr.price || 0), 0);
    const finalUnitPrice = product.price + extraPerUnit;

    setCart((prev) => {
      // Check if identical item (same id, same addons, same notes) already exists
      const existingIdx = prev.findIndex(
        (item) =>
          item.id === product.id &&
          (item.itemNotes || "") === (notes || "") &&
          JSON.stringify(item.selectedAddons || []) === JSON.stringify(selectedAddons || [])
      );

      if (existingIdx > -1) {
        return prev.map((item, idx) =>
          idx === existingIdx
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      const newItem: CartItem = {
        ...product,
        cartId: `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        basePrice: product.price,
        price: finalUnitPrice,
        quantity,
        selectedAddons,
        itemNotes: notes,
      };
      return [...prev, newItem];
    });
  };

  const addToCart = (product: Product) => {
    setCustomizingProduct(product);
  };

  const updateQuantity = (cartKey: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        const key = item.cartId || item.id;
        if (key === cartKey) {
          const newQ = item.quantity + delta;
          return newQ > 0 ? { ...item, quantity: newQ } : item;
        }
        return item;
      }),
    );
  };

  const removeFromCart = (cartKey: string) => {
    setCart((prev) => prev.filter((item) => (item.cartId || item.id) !== cartKey));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  // Calculations
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const tax = useMemo(() => Math.max(0, subtotal - discount) * TAX_RATE, [subtotal, discount]);
  const total = useMemo(() => Math.max(0, subtotal - discount) + tax, [subtotal, discount, tax]);

  const cashGiven = parseInt(cashAmount.replace(/\D/g, "")) || 0;
  const change = Math.max(0, cashGiven - total);

  // Handle Checkout
  const handleCheckout = async () => {
    if (paymentMethod === "Cash" && cashGiven < total) {
      alert("Nominal uang tunai kurang dari total belanja.");
      return;
    }
    if (!paymentMethod) {
      alert("Pilih metode pembayaran terlebih dahulu.");
      return;
    }

    setIsProcessing(true);

    const orderId = `LGY-${new Date().getTime().toString().slice(-6)}`;
    const timestamp = new Date().toISOString();

    const itemsDescription = cart
      .map((item) => {
        const addonsText = item.selectedAddons && item.selectedAddons.length > 0
          ? ` [${item.selectedAddons.map((a: any) => a.optionName || a.name).join(", ")}]`
          : "";
        const noteText = item.itemNotes ? ` (Catatan: ${item.itemNotes})` : "";
        return `${item.name}${addonsText}${noteText} (${item.quantity}x)`;
      })
      .join(", ");

    const orderData = {
      timestamp,
      orderId,
      customerName: customerName || "Guest",
      items: itemsDescription,
      orderType,
      paymentMethod,
      subtotal,
      discount,
      tax,
      total,
      cashGiven: paymentMethod === "Cash" ? cashGiven : total,
      change: paymentMethod === "Cash" ? change : 0,
      cartSnapshot: [...cart],
    };

    // Sync to Firestore & Sheets
    queueSync("ORDER", "UPSERT", orderData);

    const fullOrderDetails = { ...orderData, cartSnapshot: [...cart] };
    setLastOrderDetails(fullOrderDetails);
    setOrderHistory((prev) => [fullOrderDetails, ...prev]);
    setIsProcessing(false);
    clearCart();
    setCashAmount("");
    setPaymentMethod("");
    setCustomerName("");
  };

  // Receipt Printing
  const printReceipt = (eventOrOrder?: any) => {
    // If it's a React Event (e.g. from the checkout modal onClick), we ignore it and use lastOrderDetails
    // If it's an order object from the history, it will have an orderId
    const orderToPrint =
      eventOrOrder && eventOrOrder.orderId ? eventOrOrder : lastOrderDetails;
    if (!orderToPrint) return;

    setReceiptToPrint(orderToPrint);
  };

  // Render Header
  return (
    <div id="root-container" className="flex flex-col h-screen w-screen bg-[#FDFBF7] font-sans text-stone-800 overflow-hidden relative">
      <div className="flex flex-col h-full w-full print:hidden">
      {/* Top Header Bar */}
      <header className="h-16 sm:h-20 flex items-center justify-between px-3 sm:px-6 lg:px-8 bg-white border-b border-stone-200/80 shadow-xs shrink-0 print:hidden z-10">
        <div className="flex items-center gap-3 sm:gap-6 lg:gap-8">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="h-10 sm:h-12 w-20 sm:w-28 bg-white border border-stone-200 rounded-xl flex items-center justify-center p-1 shadow-xs overflow-hidden shrink-0">
              <img
                src={STORE_LOGO}
                alt="Legiy Dessert Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm sm:text-xl font-black tracking-tight text-stone-900 flex items-center gap-1 leading-tight">
                Legiy <span className="text-[#D45D79]">Dessert</span>
              </h1>
              <p className="hidden sm:block text-[10px] sm:text-[11px] text-stone-500 font-semibold tracking-wider uppercase">
                Premium Home Cafe
              </p>
            </div>
          </div>

          {/* Module Switcher Tabs */}
          <div className="flex items-center bg-stone-100/90 p-1 rounded-full border border-stone-200 shadow-xs">
            <button
              onClick={() => setViewMode("POS")}
              className={`px-3.5 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                viewMode === "POS" 
                  ? "bg-[#D45D79] text-white shadow-xs" 
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
              }`}
            >
              Kasir
            </button>
            <button
              onClick={() => setViewMode("MANAGEMENT")}
              className={`px-3.5 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                viewMode === "MANAGEMENT" 
                  ? "bg-[#D45D79] text-white shadow-xs" 
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
              }`}
            >
              Management
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile/Tablet Cart Toggle Button in Header */}
          {viewMode === "POS" && (
            <button
              onClick={() => setIsMobileCartOpen(true)}
              className="lg:hidden flex items-center gap-2 bg-stone-100 hover:bg-stone-200/80 text-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold transition-colors active:scale-95"
            >
              <ShoppingBag size={16} className="text-[#D45D79]" />
              <span className="hidden xs:inline">Keranjang</span>
              {cart.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#D45D79] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {cart.reduce((a, c) => a + c.quantity, 0)}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => {
              setIsDbStatusModalOpen(true);
              if (!diagnosticPingState.result) {
                runDiagnosticPing();
              }
            }}
            className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-stone-700 font-semibold bg-stone-50 hover:bg-stone-100/90 active:scale-95 border border-stone-200/80 px-2.5 sm:px-3 py-1.5 rounded-full shadow-xs transition-all cursor-pointer"
            title="Klik untuk melihat detail koneksi Firebase Firestore"
          >
            <span className={`w-2 h-2 rounded-full ${isFirebaseConnected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}></span>
            <span className="hidden sm:inline">
              {syncStatus || (isFirebaseConnected ? "Cloud Sync Aktif" : "Menghubungkan...")}
            </span>
            <Database size={13} className="text-[#D45D79] shrink-0" />
          </button>

          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-stone-900">Legiy POS</p>
            <p className="text-[10px] text-stone-500 font-medium tracking-wide">
              {viewMode === "POS" ? "Mode Kasir" : "Mode Admin"}
            </p>
          </div>
        </div>
      </header>

      {viewMode === "POS" ? (
        <main className="flex-1 flex overflow-hidden p-2.5 sm:p-4 lg:p-5 gap-3.5 sm:gap-4 max-w-7xl mx-auto w-full">
          {/* Catalog & Products Section */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Top Toolbar: Search & Category Navigation */}
            <div className="mb-3 space-y-2.5 shrink-0">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari nama menu atau kategori dessert..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white text-stone-900 text-xs sm:text-sm font-medium pl-10 pr-10 py-2.5 sm:py-3 rounded-2xl shadow-xs border border-stone-200/80 outline-none focus:border-[#D45D79] focus:ring-2 focus:ring-rose-100 transition-all placeholder:text-stone-400"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                  <Search size={16} strokeWidth={2.5} />
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-[11px] text-stone-500 hover:text-stone-900 px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Category Pills (Horizontal Scrolling - Clean on Mobile, iPad, and Desktop) */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar pt-0.5">
                {["Semua", ...categories].map((cat) => {
                  const isActive = activeCategory === cat;
                  const count = cat === "Semua"
                    ? productList.length
                    : productList.filter((p) => p.category === cat).length;

                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl whitespace-nowrap text-xs font-bold transition-all duration-150 flex items-center gap-1.5 shrink-0 border select-none ${
                        isActive
                          ? "bg-[#D45D79] text-white border-[#D45D79] shadow-xs"
                          : "bg-white text-stone-600 border-stone-200/80 hover:bg-stone-50 hover:text-stone-900 hover:border-stone-300"
                      }`}
                    >
                      <span>{cat}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive ? "bg-white/25 text-white" : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product Grid (Responsive: 2 cols phone, 3 cols tablet/iPad, 3-4 cols desktop) */}
            <div className="flex-1 overflow-y-auto pr-1 pb-20 lg:pb-4 custom-scrollbar">
              {filteredProducts.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mb-3">
                    <Search size={22} strokeWidth={2} />
                  </div>
                  <p className="text-sm font-bold text-stone-800">Menu tidak ditemukan</p>
                  <p className="text-xs text-stone-500 mt-1">Coba cari dengan kata kunci lain atau pilih kategori Semua.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5 content-start">
                  {filteredProducts.map((product, idx) => {
                    const cartItem = cart.find((c) => c.id === product.id);
                    const hasAddons = (product.availableAddons && product.availableAddons.length > 0) || (product.addonGroups && product.addonGroups.length > 0);

                    return (
                      <div
                        key={`${product.id}-${idx}`}
                        onClick={() => addToCart(product)}
                        className={`bg-white rounded-2xl p-3 sm:p-3.5 border transition-all duration-150 flex flex-col justify-between cursor-pointer select-none active:scale-[0.98] hover:shadow-xs min-h-[142px] sm:min-h-[150px] ${
                          cartItem
                            ? "border-[#D45D79] ring-2 ring-rose-200/70 shadow-xs"
                            : "border-stone-200/80 hover:border-rose-300 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C44D69] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 line-clamp-1">
                              {product.category}
                            </span>
                            {hasAddons && (
                              <span className="text-[9px] font-medium text-stone-500 bg-stone-100/80 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                                <Sparkles size={10} className="text-[#D45D79]" /> Kustom
                              </span>
                            )}
                          </div>

                          <h3 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug line-clamp-2 mt-1">
                            {product.name}
                          </h3>
                        </div>

                        <div className="mt-auto pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-black text-stone-900 tracking-tight">
                            {formatRupiah(product.price)}
                          </span>

                          {cartItem ? (
                            <div className="h-7 sm:h-7.5 px-2 rounded-lg flex items-center justify-center font-bold text-xs text-white bg-[#D45D79] shadow-xs gap-1 shrink-0">
                              <span>{cartItem.quantity}x</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-rose-50 hover:bg-[#D45D79] text-[#D45D79] hover:text-white border border-rose-200/60 flex items-center justify-center transition-colors shrink-0"
                            >
                              <Plus size={14} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Docked Cart (Visible on iPad Landscape / Desktop >= 1024px) */}
          <aside className="w-80 xl:w-[340px] flex flex-col gap-3 overflow-hidden shrink-0 print:hidden hidden lg:flex">
            <div className="flex-1 bg-white rounded-3xl border border-stone-200/80 shadow-xs flex flex-col overflow-hidden">
              {/* Cart Header */}
              <div className="p-4 border-b border-stone-100 bg-stone-50/50">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={17} className="text-[#D45D79]" />
                    <h2 className="text-sm font-black text-stone-900">Pesanan Saat Ini</h2>
                    <span className="text-[10px] bg-rose-100/70 text-[#C44D69] px-2 py-0.5 rounded-full font-bold">
                      {cart.reduce((a, c) => a + c.quantity, 0)} item
                    </span>
                  </div>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-stone-400 hover:text-red-600 transition-colors p-1.5 hover:bg-stone-100 rounded-lg"
                      title="Kosongkan keranjang"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>

                {/* Customer Input */}
                <div className="flex items-center bg-white rounded-xl px-2.5 py-1.5 border border-stone-200 text-xs focus-within:border-[#D45D79] focus-within:ring-1 focus-within:ring-rose-200 transition-all mb-2.5 shadow-2xs">
                  <User size={14} className="text-stone-400 shrink-0 mr-2" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama Pelanggan / Nomor Meja"
                    className="w-full bg-transparent text-xs font-semibold text-stone-900 placeholder:text-stone-400 outline-none"
                  />
                </div>

                {/* Dine-in / Takeaway Toggle */}
                <div className="flex gap-1.5 p-1 bg-stone-100 rounded-xl">
                  {(["Dine-in", "Takeaway"] as OrderType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setOrderType(type)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                        orderType === type
                          ? "bg-white text-stone-900 shadow-xs"
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Items List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-2 py-8">
                    <div className="w-10 h-10 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-300">
                      <ShoppingBag size={20} strokeWidth={1.75} />
                    </div>
                    <p className="text-xs font-bold text-stone-400">Keranjang masih kosong</p>
                    <p className="text-[11px] text-stone-400 text-center max-w-[180px]">Pilih menu di samping untuk menambahkan pesanan</p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const cartKey = item.cartId || item.id;
                    return (
                      <div key={cartKey} className="pb-3 border-b border-stone-100 last:border-b-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-bold text-stone-900 line-clamp-2 leading-snug">
                            {item.name}
                          </h4>
                          <span className="text-xs font-black text-stone-900 whitespace-nowrap">
                            {formatRupiah(item.price * item.quantity)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-medium mt-0.5">
                          <span>{item.category}</span>
                          <span>•</span>
                          <span>{formatRupiah(item.price)}</span>
                        </div>

                        {/* Selected Addons */}
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.selectedAddons.map((ad, aIdx) => (
                              <span
                                key={aIdx}
                                className="text-[9px] bg-rose-50 text-[#C44D69] px-1.5 py-0.2 rounded font-medium border border-rose-100/80"
                              >
                                +{ad.optionName || ad.name} {ad.price ? `(${formatRupiah(ad.price)})` : ""}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Item Notes */}
                        {item.itemNotes && (
                          <p className="text-[10px] text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/60 italic mt-1">
                            "{item.itemNotes}"
                          </p>
                        )}

                        {/* Quantity Stepper Controls */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center bg-stone-50 rounded-lg p-0.5 border border-stone-200/80 shadow-2xs">
                            <button
                              onClick={() => updateQuantity(cartKey, -1)}
                              className="w-6 h-6 flex items-center justify-center rounded text-stone-600 hover:bg-stone-200/70 active:scale-95 transition-all"
                            >
                              <Minus size={11} strokeWidth={2.5} />
                            </button>
                            <span className="text-xs font-bold w-5 text-center text-stone-900">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(cartKey, 1)}
                              className="w-6 h-6 flex items-center justify-center rounded text-[#D45D79] hover:bg-rose-100/70 active:scale-95 transition-all"
                            >
                              <Plus size={11} strokeWidth={2.5} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(cartKey)}
                            className="text-stone-400 hover:text-red-500 transition-colors p-1"
                            title="Hapus menu"
                          >
                            <Trash2 size={13} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Cart Calculations */}
              <div className="p-4 bg-stone-50/60 border-t border-stone-100 space-y-2">
                <div className="flex justify-between text-xs font-medium text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-stone-900">{formatRupiah(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center text-xs font-medium text-stone-600">
                  <span>Diskon</span>
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 text-[10px] font-bold">Rp</span>
                    <input 
                      type="number" 
                      value={discount || ""}
                      onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-6 pr-2 py-0.5 text-right bg-white border border-stone-200 rounded-md text-xs text-stone-900 font-bold focus:outline-none focus:border-[#D45D79] transition-colors hide-arrows"
                      placeholder="0"
                    />
                  </div>
                </div>

                {TAX_RATE > 0 && (
                  <div className="flex justify-between text-xs font-medium text-stone-600">
                    <span>PB1 ({(TAX_RATE * 100).toFixed(0)}%)</span>
                    <span className="font-bold text-stone-900">{formatRupiah(tax)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-stone-200/80 flex justify-between items-center bg-rose-50/60 -mx-4 -mb-4 p-4 mt-2 border-b">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C44D69] block">Total Pembayaran</span>
                    <span className="text-lg font-black text-stone-900">{formatRupiah(total)}</span>
                  </div>
                  <button
                    onClick={() => setIsCheckoutModalOpen(true)}
                    disabled={cart.length === 0}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 ${
                      cart.length === 0
                        ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                        : "bg-[#D45D79] hover:bg-[#C44D69] text-white active:scale-95"
                    }`}
                  >
                    <span>Bayar</span>
                    <ChevronRight size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </main>
      ) : (
        <main className="flex-1 flex overflow-hidden bg-stone-50 p-4 sm:p-6 pb-0">
          <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-stone-950">
                  Management <span className="text-[#D81B60]">Dashboard</span>
                </h2>
                <p className="text-xs text-stone-800 font-black tracking-wider mt-1 uppercase">
                  Monitor business performance & inventory
                </p>
              </div>
              <div className="flex bg-stone-100 rounded-2xl shadow-xs border-2 border-stone-300 p-1 w-full sm:w-fit overflow-x-auto custom-scrollbar">
                {(
                  [
                    "MENU",
                    "HISTORY",
                    "FINANCE",
                    "PRE_ORDER",
                    "EXPENSE",
                    "COGS",
                    "PERFORMANCE",
                    "SETTINGS",
                  ] as ManagementTab[]
                ).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setManagementTab(tab)}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                      managementTab === tab 
                        ? "bg-[#D81B60] text-white shadow-sm" 
                        : "text-stone-900 hover:text-black hover:bg-stone-200"
                    }`}
                  >
                    {tab.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-white rounded-t-3xl shadow-sm border-2 border-b-0 border-stone-200 overflow-hidden flex flex-col print:hidden">
              {managementTab === "MENU" && (
                <ManagementMenu
                  productList={productList}
                  setProductList={setProductList}
                  categories={categories}
                  setCategories={setCategories}
                  queueSync={queueSync}
                />
              )}
              {managementTab === "HISTORY" && (
                <ManagementHistory 
                  orderHistory={orderHistory} 
                  printReceipt={printReceipt} 
                  setOrderHistory={setOrderHistory}
                  queueSync={queueSync}
                />
              )}
              {managementTab === "FINANCE" && (
                <ManagementFinance
                  orderHistory={orderHistory}
                  expenses={expenses}
                  setExpenses={setExpenses}
                  productList={productList}
                />
              )}
              {managementTab === "PRE_ORDER" && (
                <ManagementPreOrder
                  preOrders={preOrders}
                  setPreOrders={setPreOrders}
                  queueSync={queueSync}
                />
              )}
              {managementTab === "EXPENSE" && (
                <ManagementExpense
                  expenses={expenses}
                  setExpenses={setExpenses}
                  queueSync={queueSync}
                />
              )}
              {managementTab === "COGS" && (
                <ManagementCOGS productList={productList} />
              )}
              {managementTab === "PERFORMANCE" && (
                <ManagementPerformance orderHistory={orderHistory} />
              )}
              {managementTab === "SETTINGS" && (
                <ManagementSettings 
                  receiptSettings={receiptSettings} 
                  setReceiptSettings={(newVal: any) => {
                    setReceiptSettings(newVal);
                    queueSync("SETTINGS", "UPSERT", newVal);
                  }}
                  onTestPrint={handleTestPrintReceipt}
                  onMigrateAllToFirebase={handleMigrateAllToFirebase}
                  onImportFromSheets={handleImportFromSheets}
                  isMigrating={isMigrating}
                  isImportingSheets={isImportingSheets}
                  firebaseConnected={isFirebaseConnected}
                  orderHistoryCount={orderHistory.length}
                  productListCount={productList.length}
                  categoryCount={categories.length}
                />
              )}
            </div>
          </div>
        </main>
      )}

      {/* Info Footer */}
      <footer className="h-10 shrink-0 bg-white border-t border-stone-100 flex items-center px-8 text-[10px] text-stone-400 font-medium print:hidden">
        <div className="flex gap-6 items-center w-full">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <span>System Online</span>
          </div>
          <div className="flex items-center gap-1.5 hidden sm:flex">
            <Database size={12} className="text-[#D81B60]" />
            <span>Database: </span>
            <span className="text-[#D81B60] font-black">
              Firebase Firestore (mystic-chord-mnm8c)
            </span>
          </div>
          <div className="ml-auto italic">Legiy Dessert POS v1.0.4</div>
        </div>
      </footer>

      {/* MOBILE / TABLET FLOATING CART BAR (Shown on small/medium screens when cart has items) */}
      {cart.length > 0 && viewMode === "POS" && (
        <div className="lg:hidden fixed bottom-14 left-3 right-3 z-40 bg-stone-900/95 backdrop-blur-sm text-white rounded-2xl p-3 shadow-xl flex items-center justify-between border border-stone-700/60 animate-in slide-in-from-bottom">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D45D79] flex items-center justify-center text-white font-black text-xs shadow-xs">
              {cart.reduce((a, c) => a + c.quantity, 0)}
            </div>
            <div>
              <div className="text-[10px] text-stone-300 font-semibold tracking-wide uppercase">Total Pesanan</div>
              <div className="text-base font-black text-white font-mono leading-tight">{formatRupiah(total)}</div>
            </div>
          </div>
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="bg-[#D45D79] hover:bg-[#C44D69] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
          >
            <ShoppingBag size={15} />
            <span>Lihat Keranjang</span>
          </button>
        </div>
      )}

      {/* MOBILE & TABLET CART DRAWER */}
      {isMobileCartOpen && viewMode === "POS" && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 flex flex-col justify-end lg:hidden">
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col border-t border-stone-200 shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
            {/* Header */}
            <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/70">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-[#D45D79]" />
                <h3 className="text-sm font-bold text-stone-900">Pesanan Pelanggan</h3>
                <span className="text-[11px] bg-rose-50 text-[#D45D79] px-2 py-0.5 rounded-full font-bold border border-rose-200/60">
                  {cart.reduce((a, c) => a + c.quantity, 0)} item
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="p-2 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors text-xs font-semibold"
                    title="Kosongkan"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => setIsMobileCartOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Inputs: Customer & Order Type */}
            <div className="p-4 bg-white border-b border-stone-100 space-y-2.5">
              <div className="flex items-center bg-stone-50 rounded-xl px-3 border border-stone-200 focus-within:border-[#D45D79] focus-within:ring-2 focus-within:ring-[#D45D79]/10 transition-all">
                <User size={15} className="text-stone-400 shrink-0" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama Pelanggan / Nomor Meja"
                  className="w-full bg-transparent px-2.5 py-2 text-xs font-semibold text-stone-800 placeholder-stone-400 outline-none"
                />
              </div>

              <div className="flex gap-1.5 p-1 bg-stone-100/80 rounded-xl border border-stone-200/80">
                {(["Dine-in", "Takeaway"] as OrderType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      orderType === type
                        ? "bg-[#D45D79] text-white shadow-xs"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Item List Scroll Area */}
            <div className="p-4 overflow-y-auto max-h-[40vh] space-y-3 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-stone-400">
                  <ShoppingBag size={32} className="mx-auto mb-2 opacity-30 text-stone-400" />
                  <p className="text-xs font-semibold">Keranjang masih kosong</p>
                </div>
              ) : (
                cart.map((item) => {
                  const cartKey = item.cartId || item.id;
                  return (
                    <div key={cartKey} className="flex justify-between items-start pb-2.5 border-b border-stone-100 last:border-0 last:pb-0">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-stone-900 leading-snug">{item.name}</h4>
                          <span className="text-xs font-bold text-[#D45D79] font-mono ml-2">
                            {formatRupiah(item.price * item.quantity)}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 font-medium">{formatRupiah(item.price)}/porsi</p>

                        {/* Addons */}
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.selectedAddons.map((a, aIdx) => (
                              <span key={aIdx} className="text-[9px] bg-rose-50 text-[#D45D79] px-1.5 py-0.5 rounded font-semibold border border-rose-200/60">
                                +{a.optionName || a.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Note */}
                        {item.itemNotes && (
                          <p className="text-[10px] text-amber-800 bg-amber-50/80 px-1.5 py-0.5 rounded italic mt-1 border border-amber-200/50">
                            "{item.itemNotes}"
                          </p>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 bg-stone-100/90 rounded-lg p-0.5 border border-stone-200 shrink-0">
                        <button
                          onClick={() => updateQuantity(cartKey, -1)}
                          className="w-6 h-6 flex items-center justify-center rounded text-stone-600 hover:bg-stone-200 active:scale-95"
                        >
                          <Minus size={11} strokeWidth={2.5} />
                        </button>
                        <span className="text-xs font-bold w-4 text-center text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(cartKey, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded text-[#D45D79] hover:bg-rose-100/60 active:scale-95"
                        >
                          <Plus size={11} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Calculations & Checkout */}
            <div className="p-4 bg-stone-50/70 border-t border-stone-200/80 space-y-2">
              <div className="flex justify-between text-xs font-medium text-stone-600">
                <span>Subtotal</span>
                <span className="font-bold text-stone-900">{formatRupiah(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs font-medium text-[#D45D79]">
                  <span>Diskon</span>
                  <span className="font-bold">-{formatRupiah(discount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-xs font-medium text-stone-600">
                  <span>PB1 ({(TAX_RATE * 100).toFixed(0)}%)</span>
                  <span className="font-bold text-stone-900">{formatRupiah(tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-stone-900 pt-2 border-t border-stone-200/80">
                <span>Total</span>
                <span className="text-[#D45D79] font-mono">{formatRupiah(total)}</span>
              </div>

              <button
                onClick={() => {
                  setIsMobileCartOpen(false);
                  setIsCheckoutModalOpen(true);
                }}
                disabled={cart.length === 0}
                className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-xs mt-2 flex items-center justify-center gap-2 ${
                  cart.length === 0
                    ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                    : "bg-[#D45D79] hover:bg-[#C44D69] text-white active:scale-98"
                }`}
              >
                <span>Lanjut ke Pembayaran</span>
                <span className="font-mono">• {formatRupiah(total)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMIZE / ADDON SELECTION MODAL */}
      {customizingProduct && (
        <AddonSelectionModal
          product={customizingProduct}
          onClose={() => setCustomizingProduct(null)}
          onConfirm={(prod, qty, addons, notes) => {
            handleAddToCartWithAddons(prod, qty, addons, notes);
            setCustomizingProduct(null);
          }}
        />
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutModalOpen && !lastOrderDetails && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-stone-200">
            <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50/60 flex justify-between items-center">
              <div>
                <h2 className="text-base sm:text-lg font-black text-stone-900">
                  Pembayaran Pesanan
                </h2>
                <p className="text-stone-500 text-xs font-semibold mt-0.5">
                  Total Tagihan:{" "}
                  <span className="font-black text-[#D45D79] text-base font-mono">
                    {formatRupiah(total)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCheckoutModalOpen(false);
                  setPaymentMethod("");
                  setCashAmount("");
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar">
              <div>
                <label className="text-[11px] font-bold text-stone-600 tracking-wider uppercase mb-2 block">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["Cash", "QRIS", "Transfer Bank", "E-Wallet"].map((cat) => {
                    const isTransferAct = paymentMethod.includes("Transfer");
                    const isEwalletAct = [
                      "Gopay",
                      "Dana",
                      "Shopeepay",
                    ].includes(paymentMethod);
                    const isActive =
                      cat === paymentMethod ||
                      (cat === "Transfer Bank" && isTransferAct) ||
                      (cat === "E-Wallet" && isEwalletAct);
                    const icon =
                      cat === "Cash"
                        ? "💵"
                        : cat === "QRIS"
                          ? "📱"
                          : cat === "Transfer Bank"
                            ? "🏦"
                            : "💳";

                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          if (cat === "Cash") setPaymentMethod("Cash");
                          else if (cat === "QRIS") setPaymentMethod("QRIS");
                          else if (cat === "Transfer Bank")
                            setPaymentMethod("Transfer BRI");
                          else if (cat === "E-Wallet")
                            setPaymentMethod("Gopay");
                        }}
                        className={`rounded-xl flex items-center justify-start px-3 py-2.5 gap-2.5 transition-all outline-none border text-left
                          ${
                            isActive
                              ? "bg-rose-50/70 text-stone-900 border-[#D45D79] shadow-xs ring-1 ring-[#D45D79]"
                              : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300"
                          }
                        `}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm ${isActive ? "bg-white text-stone-900 shadow-xs" : "bg-stone-100"}`}
                        >
                          {icon}
                        </div>
                        <span
                          className={`text-xs font-bold ${isActive ? "text-[#C44D69]" : "text-stone-800"}`}
                        >
                          {cat}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {paymentMethod.includes("Transfer") && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200 mt-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <label className="text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1.5 block">
                      Pilih Bank Transfer
                    </label>
                    <div className="flex gap-2">
                      {["Transfer BRI", "Transfer JAGO"].map((bank) => (
                        <button
                          key={bank}
                          onClick={() =>
                            setPaymentMethod(bank as PaymentMethod)
                          }
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all outline-none border ${paymentMethod === bank ? "bg-[#D45D79] text-white border-[#D45D79] shadow-xs" : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"}`}
                        >
                          {bank.replace("Transfer ", "")}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {["Gopay", "Dana", "Shopeepay"].includes(paymentMethod) && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200 mt-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <label className="text-[10px] font-bold text-stone-600 tracking-wider uppercase mb-1.5 block">
                      Pilih E-Wallet
                    </label>
                    <div className="flex gap-2">
                      {["Gopay", "Dana", "Shopeepay"].map((ewallet) => (
                        <button
                          key={ewallet}
                          onClick={() =>
                            setPaymentMethod(ewallet as PaymentMethod)
                          }
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all outline-none border ${paymentMethod === ewallet ? "bg-[#D45D79] text-white border-[#D45D79] shadow-xs" : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"}`}
                        >
                          {ewallet}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {paymentMethod === "Cash" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200 pt-1">
                  <label className="text-[11px] font-bold text-stone-600 tracking-wider uppercase mb-1.5 block">
                    Uang Diterima (Cash)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">Rp</span>
                    <input
                      type="text"
                      value={cashAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setCashAmount(
                          val ? parseInt(val).toLocaleString("id-ID") : "",
                        );
                      }}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2.5 text-xl font-bold bg-white border border-stone-200 rounded-xl focus:border-[#D45D79] focus:ring-2 focus:ring-[#D45D79]/10 outline-none transition-all text-stone-900 placeholder-stone-300"
                      autoFocus
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[20000, 50000, 100000, total].map((amount) => (
                      <button
                        key={amount}
                        onClick={() =>
                          setCashAmount(amount.toLocaleString("id-ID"))
                        }
                        className="py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-xs font-bold text-stone-700 transition-colors"
                      >
                        {amount === total
                          ? "Uang Pas"
                          : (amount / 1000) + "K"}
                      </button>
                    ))}
                  </div>

                  {cashGiven >= total && (
                    <div className="mt-3 p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-center">
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5">
                        Kembalian (Change)
                      </p>
                      <p className="text-xl font-black text-emerald-700 font-mono">
                        {formatRupiah(change)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex gap-2">
              <button
                onClick={() => {
                  setIsCheckoutModalOpen(false);
                  setPaymentMethod("");
                  setCashAmount("");
                }}
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-stone-600 bg-white border border-stone-200 hover:bg-stone-100 transition-colors flex-none"
                disabled={isProcessing}
              >
                Batal
              </button>
              <button
                onClick={handleCheckout}
                disabled={
                  !paymentMethod ||
                  (paymentMethod === "Cash" && cashGiven < total) ||
                  isProcessing
                }
                className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center transition-all text-xs shadow-xs
                  ${
                    !paymentMethod ||
                    (paymentMethod === "Cash" && cashGiven < total) ||
                    isProcessing
                      ? "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"
                      : "bg-[#D45D79] hover:bg-[#C44D69] active:scale-95 text-white"
                  }`}
              >
                {isProcessing ? "Menyimpan Transaksi..." : "Selesaikan Transaksi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL (AND PRINT VIEW) */}
      {lastOrderDetails && (() => {
        const modalItems = (Array.isArray(lastOrderDetails.cartSnapshot) && lastOrderDetails.cartSnapshot.length > 0)
          ? lastOrderDetails.cartSnapshot
          : (Array.isArray(lastOrderDetails.items) && lastOrderDetails.items.length > 0)
            ? lastOrderDetails.items
            : getCartSnapshotOrFallback(lastOrderDetails, productList);

        return (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:bg-white print:p-0">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col print:shadow-none print:w-full print:-mt-8 border-4 border-stone-900">
            {/* Receipt Content */}
            <div className="p-4 pb-3 max-h-[75vh] overflow-y-auto" id="receipt-content">
              {isEditingReceipt ? (
                <div className="space-y-3 text-left font-sans">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <span className="text-xs font-black uppercase tracking-wider text-[#D81B60]">
                      Kustomisasi Nota Sebelum Cetak
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingReceipt(false)}
                      className="text-[10px] font-bold text-stone-500 hover:text-black"
                    >
                      Batal
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-stone-800 block uppercase tracking-wider mb-1">
                      Nama Customer / Meja
                    </label>
                    <input
                      type="text"
                      className="text-xs font-black text-black p-2 border-2 border-stone-900 rounded-xl w-full outline-none focus:border-[#D81B60]"
                      value={lastOrderDetails.customerName || ""}
                      onChange={(e) => setLastOrderDetails({ ...lastOrderDetails, customerName: e.target.value })}
                      placeholder="Contoh: Amanda"
                    />
                  </div>

                  {/* Gaya Frame Lucu */}
                  <div>
                    <label className="text-[10px] font-black text-stone-800 block uppercase tracking-wider mb-1">
                      Pilih Gaya Frame Nota Lucu
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CUTE_FRAME_PRESETS.map((p) => {
                        const isSelected = (receiptSettings.frameStyle || "ribbon") === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setReceiptSettings({ ...receiptSettings, frameStyle: p.id })}
                            className={`p-2 rounded-xl text-left border-2 text-[11px] font-black flex items-center justify-between transition-all ${
                              isSelected
                                ? "border-[#D81B60] bg-pink-50 text-[#D81B60]"
                                : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] bg-white border border-stone-300 px-1 py-0.5 rounded">{p.badge}</span>
                              <span>{p.label.split(" ")[0]}</span>
                            </span>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#D81B60]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quotes Manis */}
                  <div>
                    <label className="text-[10px] font-black text-stone-800 block uppercase tracking-wider mb-1">
                      Quotes Manis Bawah
                    </label>
                    <input
                      type="text"
                      className="text-xs font-bold text-black p-2 border-2 border-stone-900 rounded-xl w-full outline-none focus:border-[#D81B60]"
                      value={receiptSettings.quotesBelow || ""}
                      onChange={(e) => setReceiptSettings({ ...receiptSettings, quotesBelow: e.target.value })}
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {DESSERT_QUOTES_PRESETS.slice(0, 3).map((q, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setReceiptSettings({ ...receiptSettings, quotesBelow: q })}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 hover:bg-pink-100 text-stone-700 font-bold"
                        >
                          Quote {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[9px] font-black text-stone-600 block uppercase tracking-wider">Nama Toko</label>
                      <input
                        type="text"
                        className="text-xs font-bold text-black p-1.5 border-2 border-stone-900 rounded-lg w-full outline-none focus:border-[#D81B60]"
                        value={receiptSettings.storeName || ""}
                        onChange={(e) => setReceiptSettings({ ...receiptSettings, storeName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-stone-600 block uppercase tracking-wider">WhatsApp</label>
                      <input
                        type="text"
                        className="text-xs font-bold text-black p-1.5 border-2 border-stone-900 rounded-lg w-full outline-none focus:border-[#D81B60]"
                        value={receiptSettings.storePhone || ""}
                        onChange={(e) => setReceiptSettings({ ...receiptSettings, storePhone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => setIsEditingReceipt(false)}
                      className="w-full py-2.5 bg-[#D81B60] text-white rounded-xl font-black text-xs hover:bg-[#C2185B] shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={14} />
                      Simpan & Lihat Pratinjau Lucu
                    </button>
                  </div>
                </div>
              ) : (
                <CuteReceipt
                  order={lastOrderDetails}
                  settings={receiptSettings}
                  isPrint={false}
                  className="w-full border-2 border-stone-900 shadow-none rounded-2xl"
                />
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-stone-100 border-t-2 border-stone-900 flex flex-col gap-2.5 print:hidden">
              <button
                onClick={() => setIsEditingReceipt(!isEditingReceipt)}
                className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex justify-center items-center transition-all border ${isEditingReceipt ? "bg-stone-900 text-white border-transparent" : "bg-white text-stone-900 border-stone-400 hover:bg-stone-50 shadow-sm"}`}
              >
                <Settings size={14} className="mr-1.5" />
                {isEditingReceipt ? "Simpan Perubahan Struk" : "Edit Teks Struk (Alamat/Nama/Daftar)"}
              </button>

              <div className="flex gap-2 w-full">
                <button
                  onClick={() => {
                    setLastOrderDetails(null);
                    setIsCheckoutModalOpen(false);
                    setIsEditingReceipt(false);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-black text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 shadow-sm text-center text-xs transition-colors"
                >
                  Selesai (Done)
                </button>
                <button
                  onClick={printReceipt}
                  className="flex-1 py-3 px-4 rounded-xl font-black bg-stone-950 text-white hover:bg-black active:scale-95 shadow-lg flex justify-center items-center text-xs transition-all border border-black"
                >
                  <Printer size={14} className="mr-1.5" /> Cetak Struk 80mm
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Firebase Database Status & Connection Modal */}
      {isDbStatusModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#D45D79]">
                  <Database size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 leading-tight">
                    Status Database Firebase
                  </h3>
                  <p className="text-[11px] text-stone-500 font-medium">
                    Google Cloud Firestore Real-time Backend
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDbStatusModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Status Indicator Banner */}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  <div>
                    <p className="text-xs font-black text-emerald-950">
                      Database Telah Terhubung & Aktif
                    </p>
                    <p className="text-[10.5px] text-emerald-800 font-medium">
                      Setiap transaksi kasir otomatis tersimpan ke server Google Cloud
                    </p>
                  </div>
                </div>
                {diagnosticPingState.result?.latencyMs !== undefined && (
                  <span className="text-[11px] font-mono font-bold bg-white/90 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200">
                    {diagnosticPingState.result.latencyMs} ms
                  </span>
                )}
              </div>

              {/* Database Specs */}
              <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/80 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500 font-medium">Status Koneksi</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={13} /> Online & Sinkron
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500 font-medium">Firebase Project ID</span>
                  <span className="font-mono font-bold text-stone-900">mystic-chord-mnm8c</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500 font-medium">Firestore Database ID</span>
                  <span className="font-mono font-bold text-stone-900 text-[10px] break-all max-w-[240px] text-right">
                    ai-studio-legiydessertpos-fced9c3e-1780-4785-a23d-3eae25d862ac
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-500 font-medium">Data Tersinkron</span>
                  <span className="font-mono font-bold text-stone-900">
                    {productList.length} Menu • {orderHistory.length} Nota
                  </span>
                </div>
              </div>

              {/* Diagnostic Action */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={runDiagnosticPing}
                  disabled={diagnosticPingState.loading}
                  className="flex-1 py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-black flex items-center justify-center gap-2 border border-stone-200 transition-colors disabled:opacity-50"
                >
                  {diagnosticPingState.loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-[#D45D79]" /> Menguji Latensi...
                    </>
                  ) : (
                    <>
                      <Activity size={14} className="text-[#D45D79]" /> Uji Ping Server
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsDbStatusModalOpen(false);
                    setViewMode("MANAGEMENT");
                    setManagementTab("SETTINGS");
                  }}
                  className="flex-1 py-2.5 px-3 bg-[#D45D79] hover:bg-[#C44D69] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Settings size={14} /> Pengaturan Cloud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* GLOBAL STYLES */}
      <style>{`
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #e7e5e4;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #d6d3d1;
        }
        
        @media print {
          html, body {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #root-container, #root, #root-container * {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          #print-receipt, #print-receipt * {
            visibility: visible !important;
            color: #000000 !important;
            border-color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            text-shadow: none !important;
            box-shadow: none !important;
            opacity: 1 !important;
          }
          #print-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            display: block !important;
            padding: 2mm 3mm !important;
            box-sizing: border-box !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;
            font-size: 12px !important;
            font-weight: 800 !important;
            line-height: 1.25 !important;
            background: #ffffff !important;
            -webkit-font-smoothing: antialiased !important;
          }
          #print-receipt img {
            filter: contrast(200%) grayscale(100%) !important;
          }
          @page {
            margin: 0;
            size: 80mm auto;
          }
        }
      `}</style>

      {/* PRINTABLE RECEIPT TEMPLATE FOR 80MM (HIDDEN ON SCREEN, SHOWN ONLY ON PRINT) */}
      {receiptToPrint && (
        <CuteReceipt
          id="print-receipt"
          order={receiptToPrint}
          settings={receiptSettings}
          isPrint={true}
          className="hidden print:block absolute top-0 left-0 bg-white z-[9999]"
        />
      )}
    </div>
  );
}
