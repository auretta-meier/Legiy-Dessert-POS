import React, { useState, useMemo, useEffect } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle,
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
} from "lucide-react";
import { products, formatRupiah, Category, Product, initialCategories } from "./data";
import { syncToGoogleSheets, fetchFromGoogleSheets } from "./googleSheetsService";
import { QRCodeCanvas } from "qrcode.react";
import { STORE_LOGO, STORE_LOGO_PRINT } from "./logo";

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
  });

  const openAdd = () => {
    setEditingProduct(null);
    setForm({ name: "", category: categories[0] || "", price: 0, cogs: 0 });
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({ ...p });
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
      const updatedProduct = { ...editingProduct, ...form };
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

  return (
    <div className="p-6 h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-stone-900">Product Menu</h3>
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
          <table className="w-full text-left border-collapse min-w-[550px]">
            <thead>
              <tr className="border-b-2 border-stone-200 text-stone-700 text-xs uppercase tracking-wider">
                <th className="pb-3 font-black">Product Name</th>
                <th className="pb-3 font-black">Category</th>
                <th className="pb-3 font-black">Price</th>
                <th className="pb-3 font-black">COGS</th>
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
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 p-6 flex flex-col justify-center items-center">
          <div className="bg-white border text-left border-stone-200 shadow-xl rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-stone-800 mb-4">
              {editingProduct ? "Edit Product" : "Add Product"}
            </h3>
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs font-bold text-stone-500">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-[#D81B60]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as Category })
                  }
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-[#D81B60]"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500">
                  Price (Selling Price)
                </label>
                <input
                  type="number"
                  value={form.price || ""}
                  onChange={(e) =>
                    setForm({ ...form, price: parseInt(e.target.value) || 0 })
                  }
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-[#D81B60]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500">
                  COGS (Base Cost)
                </label>
                <input
                  type="number"
                  value={form.cogs || ""}
                  onChange={(e) =>
                    setForm({ ...form, cogs: parseInt(e.target.value) || 0 })
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
                onClick={saveProduct}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-[#D81B60] text-white hover:brightness-110"
              >
                Save
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

function ManagementFinance({
  orderHistory,
  expenses,
  setExpenses,
  productList,
}: {
  orderHistory: any[];
  expenses: any[];
  setExpenses: any;
  productList: Product[];
}) {
  const [filter, setFilter] = useState<
    "DAILY" | "THIS_MONTH" | "ALL" | "CUSTOM"
  >("DAILY");
  const [customStart, setCustomStart] = useState<string>(
    () => new Date().toISOString().split("T")[0],
  );
  const [customEnd, setCustomEnd] = useState<string>(
    () => new Date().toISOString().split("T")[0],
  );

  const parsedOrders = useMemo(() => {
    const history = Array.isArray(orderHistory) ? orderHistory : [];
    return history.map((o) => {
      if (!o) return o;
      const total = parseIndonesianNumber(o.total);
      const subtotal = parseIndonesianNumber(o.subtotal || o.total);
      const discount = parseIndonesianNumber(o.discount);
      const tax = parseIndonesianNumber(o.tax);
      const cashGiven = parseIndonesianNumber(o.cashGiven);
      const change = parseIndonesianNumber(o.change);
      const snapshot = getCartSnapshotOrFallback(o, productList);
      
      return {
        ...o,
        total,
        subtotal,
        discount,
        tax,
        cashGiven,
        change,
        cartSnapshot: snapshot,
      };
    });
  }, [orderHistory, productList]);

  const parsedExpenses = useMemo(() => {
    const list = Array.isArray(expenses) ? expenses : [];
    return list.map((e) => {
      if (!e) return e;
      const amount = parseIndonesianNumber(e.amount);
      return {
        ...e,
        amount,
      };
    });
  }, [expenses]);

  const filteredOrders = useMemo(() => {
    return parsedOrders.filter((o) => {
      if (!o || !o.timestamp) return false;
      const date = new Date(o.timestamp);
      if (isNaN(date.getTime())) return false;
      const now = new Date();
      if (filter === "DAILY") return date.toDateString() === now.toDateString();
      if (filter === "THIS_MONTH")
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      if (filter === "CUSTOM") {
        const d = new Date(date.toISOString().split("T")[0]); // ignore time for comparison
        const start = new Date(customStart);
        const end = new Date(customEnd);
        return d >= start && d <= end;
      }
      return true;
    });
  }, [parsedOrders, filter, customStart, customEnd]);

  const filteredExpenses = useMemo(() => {
    return parsedExpenses.filter((e) => {
      if (!e || !e.timestamp) return false;
      const date = new Date(e.timestamp);
      if (isNaN(date.getTime())) return false;
      const now = new Date();
      if (filter === "DAILY") return date.toDateString() === now.toDateString();
      if (filter === "THIS_MONTH")
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      if (filter === "CUSTOM") {
        const d = new Date(date.toISOString().split("T")[0]);
        const start = new Date(customStart);
        const end = new Date(customEnd);
        return d >= start && d <= end;
      }
      return true;
    });
  }, [parsedExpenses, filter, customStart, customEnd]);

  const totalRevenue = filteredOrders.reduce((acc, o) => acc + o.total, 0);
  const totalCOGS = filteredOrders.reduce((acc, o) => {
    const snapshot = o.cartSnapshot || [];
    const cogs = snapshot.reduce(
      (cAcc: number, item: any) => cAcc + (item.cogs || 0) * item.quantity,
      0,
    );
    return acc + cogs;
  }, 0);
  const totalExpense = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpense;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-stone-800">
            Finance & Reporting
          </h3>
          <div className="flex bg-stone-100 p-1 rounded-xl">
            {(["DAILY", "THIS_MONTH", "ALL", "CUSTOM"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? "bg-white shadow-sm text-stone-800" : "text-stone-500 hover:text-stone-700"}`}
              >
                {f.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        {filter === "CUSTOM" && (
          <div className="flex items-center gap-3 self-end bg-stone-50 p-2 rounded-xl border border-stone-200">
            <span className="text-xs font-bold text-stone-500">From</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-white border border-stone-200 text-stone-800 text-xs px-2 py-1 rounded-md"
            />
            <span className="text-xs font-bold text-stone-500">To</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-white border border-stone-200 text-stone-800 text-xs px-2 py-1 rounded-md"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1.5">
            Pemasukan (Revenue)
          </p>
          <p className="text-2xl font-black text-emerald-600 tracking-tight">
            {formatRupiah(totalRevenue)}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm">
          <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest mb-1.5">
            Harga Pokok (COGS)
          </p>
          <p className="text-2xl font-black text-blue-600 tracking-tight">
            {formatRupiah(totalCOGS)}
          </p>
        </div>
        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 shadow-sm">
          <p className="text-[10px] font-bold text-rose-800 uppercase tracking-widest mb-1.5">
            Pengeluaran (Expenses)
          </p>
          <p className="text-2xl font-black text-rose-600 tracking-tight">
            {formatRupiah(totalExpense)}
          </p>
        </div>
        <div
          className={`${netProfit >= 0 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"} p-4 rounded-2xl border shadow-sm`}
        >
          <p
            className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${netProfit >= 0 ? "text-amber-800" : "text-red-800"}`}
          >
            Laba Bersih (Net Profit)
          </p>
          <p
            className={`text-2xl font-black tracking-tight ${netProfit >= 0 ? "text-amber-600" : "text-red-600"}`}
          >
            {formatRupiah(netProfit)}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col">
        <h4 className="font-bold text-sm text-stone-800 mb-3 border-b border-stone-100 pb-2">
          Daftar Pengeluaran Operasional
        </h4>
        {filteredExpenses.length === 0 ? (
          <p className="text-xs text-stone-400 font-medium py-4">
            Belum ada catatan pengeluaran di periode ini.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredExpenses.map((e, idx) => (
              <div
                key={`${e.id}-${idx}`}
                className="flex justify-between items-center bg-white p-3 rounded-xl border border-stone-100 shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-stone-800">{e.desc}</p>
                  <p className="text-[10px] text-stone-400 font-semibold mt-0.5">
                    {new Date(e.timestamp).toLocaleDateString("id-ID")}{" "}
                    {new Date(e.timestamp).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <p className="text-sm font-bold text-rose-600 font-mono">
                  -{formatRupiah(e.amount)}
                </p>
              </div>
            ))}
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

function ManagementPerformance({ orderHistory }: { orderHistory: any[] }) {
  const history = Array.isArray(orderHistory) ? orderHistory : [];
  const itemCounts = history.reduce(
    (acc, order) => {
      let snapshot = order && order.cartSnapshot;
      if (typeof snapshot === 'string') {
        try {
          snapshot = JSON.parse(snapshot);
        } catch (e) {
          snapshot = null;
        }
      }

      if (snapshot && Array.isArray(snapshot)) {
        snapshot.forEach((item: any) => {
          if (item && item.name) {
            acc[item.name] = (acc[item.name] || 0) + item.quantity;
          }
        });
      } else if (order && order.items && typeof order.items === 'string') {
        // Can be comma-separated or newline-separated
        const parts = order.items.includes('\n') ? order.items.split('\n') : order.items.split(', ');
        parts.forEach((p: string) => {
          const match = p.match(/(.+?)\s*\((\d+)x\)/);
          if (match) {
            const name = match[1].trim();
            const qty = parseInt(match[2]) || 1;
            acc[name] = (acc[name] || 0) + qty;
          } else {
            const match2 = p.match(/^(\d+)x\s+(.+)$/);
            if (match2) {
              const qty = parseInt(match2[1]) || 1;
              let name = match2[2].trim();
              name = name.replace(/\s*\(Rp\s*\d+[.,]?\d*\)/i, '').trim();
              acc[name] = (acc[name] || 0) + qty;
            }
          }
        });
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  const sortedItems = Object.entries(itemCounts).sort(
    (a, b) => (b[1] as number) - (a[1] as number),
  );

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center mb-6">
        <h3 className="text-lg font-bold text-stone-800">
          Business Performance
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-bold text-sm text-stone-800 mb-4 pb-2 border-b">
            Top Selling Items
          </h4>
          {sortedItems.length === 0 ? (
            <p className="text-xs text-stone-400">Belum ada data penjualan.</p>
          ) : (
            <div className="space-y-3">
              {sortedItems.slice(0, 10).map(([name, qty], idx) => (
                <div
                   key={name}
                  className="flex justify-between items-center bg-stone-50 p-3 rounded-lg border border-stone-100"
                >
                  <span className="text-sm font-bold text-stone-700 flex items-center gap-3">
                    <span className="w-5 text-center text-xs text-stone-400">
                      {idx + 1}.
                    </span>{" "}
                    {name}
                  </span>
                  <span className="text-xs font-bold bg-[#D81B60] text-white px-2 py-1 rounded-md">
                    {qty as number} terjual
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h4 className="font-bold text-sm text-stone-800 mb-4 pb-2 border-b">
            Order Types
          </h4>
          <div className="flex justify-around mt-8">
            <div className="text-center p-4 bg-blue-50 rounded-2xl w-32 outline outline-1 outline-blue-100">
              <p className="text-3xl font-black text-blue-600">
                {history.filter((o) => o?.orderType === "Dine-in").length}
              </p>
              <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest mt-2">
                Dine-In
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-2xl w-32 outline outline-1 outline-orange-100">
              <p className="text-3xl font-black text-orange-600">
                {history.filter((o) => o?.orderType === "Takeaway").length}
              </p>
              <p className="text-[10px] font-bold text-orange-800 uppercase tracking-widest mt-2">
                Takeaway
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface CartItem extends Product {
  cartId: string;
  quantity: number;
}

function ManagementSettings({
  receiptSettings,
  setReceiptSettings,
  onTestPrint,
}: {
  receiptSettings: any;
  setReceiptSettings: any;
  onTestPrint?: () => void;
}) {
  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-bold text-stone-800">
            Pengaturan Struk (Receipt 80mm)
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Sesuaikan informasi kop toko, kontak, footer, dan QR Code untuk printer thermal 80mm.
          </p>
        </div>
        {onTestPrint && (
          <button
            onClick={onTestPrint}
            className="self-start sm:self-auto bg-[#D81B60] hover:brightness-110 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Printer size={15} /> Cetak Struk Uji Coba (Test Print)
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Settings */}
        <div className="lg:col-span-7 bg-stone-50 p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">
              Nama Toko / Brand
            </label>
            <input
              type="text"
              value={receiptSettings.storeName || ""}
              onChange={(e) =>
                setReceiptSettings({ ...receiptSettings, storeName: e.target.value })
              }
              className="w-full text-sm p-3 rounded-xl border border-stone-200 bg-white outline-none focus:border-[#D81B60] font-bold text-stone-800"
              placeholder="Legiy's Dessert"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">
                Alamat Toko
              </label>
              <textarea
                value={receiptSettings.storeAddress || ""}
                onChange={(e) =>
                  setReceiptSettings({ ...receiptSettings, storeAddress: e.target.value })
                }
                rows={2}
                className="w-full text-sm p-3 rounded-xl border border-stone-200 bg-white outline-none focus:border-[#D81B60]"
                placeholder="Perumahan TSI, Blok O.14, Cirebon"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="text"
                value={receiptSettings.storePhone || ""}
                onChange={(e) =>
                  setReceiptSettings({ ...receiptSettings, storePhone: e.target.value })
                }
                className="w-full text-sm p-3 rounded-xl border border-stone-200 bg-white outline-none focus:border-[#D81B60]"
                placeholder="0812-1252-7520"
              />
              <p className="text-[10px] text-stone-400 mt-1">Dicetak di bawah alamat toko</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">
              Link QR Code (Linktree / Medsos)
            </label>
            <input
              type="text"
              value={receiptSettings.qrCodeUrl || ""}
              onChange={(e) =>
                setReceiptSettings({ ...receiptSettings, qrCodeUrl: e.target.value })
              }
              className="w-full text-sm p-3 rounded-xl border border-stone-200 bg-white outline-none focus:border-[#D81B60] font-mono text-xs text-blue-600"
              placeholder="https://linktr.ee/legiy_dessert"
            />
            <p className="text-[10px] text-stone-400 mt-1">QR Code akan otomatis dibuat dan dicetak di bagian bawah struk</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">
                Footer / Pesan Baris 1
              </label>
              <input
                type="text"
                value={receiptSettings.footerText1 || ""}
                onChange={(e) =>
                  setReceiptSettings({ ...receiptSettings, footerText1: e.target.value })
                }
                className="w-full text-sm p-3 rounded-xl border border-stone-200 bg-white outline-none focus:border-[#D81B60]"
                placeholder="Terima kasih atas kunjungannya!"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">
                Footer / Pesan Baris 2
              </label>
              <input
                type="text"
                value={receiptSettings.footerText2 || ""}
                onChange={(e) =>
                  setReceiptSettings({ ...receiptSettings, footerText2: e.target.value })
                }
                className="w-full text-sm p-3 rounded-xl border border-stone-200 bg-white outline-none focus:border-[#D81B60]"
                placeholder="Manisnya pas, bikin harimu lebih ceria :)"
              />
            </div>
          </div>

          <div className="mt-2 bg-pink-50/70 border border-pink-100 text-stone-700 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
            <CheckCircle size={16} className="text-[#D81B60] flex-shrink-0" />
            <span>Format telah disesuaikan untuk printer <strong>Thermal 80mm</strong>. Semua perubahan langsung tersimpan otomatis.</span>
          </div>
        </div>

        {/* Live Preview Card (80mm style) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <span>Pratinjau Struk (80mm Width)</span>
          </div>
          <div className="bg-white border-2 border-stone-300 shadow-lg rounded-xl p-5 w-full max-w-[340px] text-black font-mono text-[11px] leading-relaxed select-none">
            {/* Header */}
            <div className="text-center pb-2">
              <img
                src={STORE_LOGO}
                alt="Logo"
                className="w-28 sm:w-32 h-auto mx-auto mb-2 object-contain"
              />
              <div className="font-bold text-[14px] uppercase tracking-wider text-black">
                {receiptSettings.storeName || "Legiy's Dessert"}
              </div>
              <div className="text-[10px] text-stone-600 mt-0.5">
                {receiptSettings.storeAddress || "Perumahan TSI, Blok O.14, Cirebon"}
              </div>
              <div className="text-[10px] font-bold text-stone-800 mt-0.5">
                {receiptSettings.storePhone || "0812-1252-7520"}
              </div>
            </div>

            <div className="border-b border-dashed border-stone-400 my-2"></div>

            {/* Info */}
            <div className="text-[10px] space-y-0.5 text-stone-700">
              <div className="flex justify-between">
                <span>No. Struk</span>
                <span className="font-bold text-black">LGY-892104</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal</span>
                <span>{new Date().toLocaleDateString("id-ID")} {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer</span>
                <span className="font-bold text-black">Kak Amanda</span>
              </div>
              <div className="flex justify-between">
                <span>Tipe Pesanan</span>
                <span className="font-bold text-black">Dine-in</span>
              </div>
            </div>

            <div className="border-b border-dashed border-stone-400 my-2"></div>

            {/* Sample items */}
            <div className="space-y-1.5 text-[10.5px]">
              <div>
                <div className="font-bold text-black">Pistachio Crepe Cake</div>
                <div className="flex justify-between text-stone-600">
                  <span>1 x 38.000</span>
                  <span className="font-bold text-black">38.000</span>
                </div>
              </div>
              <div>
                <div className="font-bold text-black">Iced Caramel Macchiato</div>
                <div className="flex justify-between text-stone-600">
                  <span>2 x 25.000</span>
                  <span className="font-bold text-black">50.000</span>
                </div>
              </div>
            </div>

            <div className="border-b border-dashed border-stone-400 my-2"></div>

            {/* Totals */}
            <div className="space-y-1 text-[10.5px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>88.000</span>
              </div>
              <div className="border-b border-dashed border-stone-300 my-1"></div>
              <div className="flex justify-between font-black text-[13px] text-black pt-0.5">
                <span>TOTAL</span>
                <span>Rp 88.000</span>
              </div>
              <div className="flex justify-between pt-1 text-stone-700">
                <span>Bayar (QRIS)</span>
                <span>88.000</span>
              </div>
            </div>

            <div className="border-b border-dashed border-stone-400 my-2.5"></div>

            {/* Footer & QR Code */}
            <div className="text-center pt-1 flex flex-col items-center">
              <div className="text-[10px] text-stone-600 mb-0.5">
                {receiptSettings.footerText1 || "Terima kasih atas kunjungannya!"}
              </div>
              <div className="text-[10px] font-bold text-stone-800 mb-2">
                {receiptSettings.footerText2 || "Manisnya pas, bikin harimu lebih ceria :)"}
              </div>

              {/* QR Code */}
              <div className="bg-white p-1.5 rounded-lg border border-stone-200 inline-block shadow-sm">
                <QRCodeCanvas
                  value={receiptSettings.qrCodeUrl || "https://linktr.ee/legiy_dessert"}
                  size={80}
                  level="M"
                />
              </div>
              <div className="text-[9px] font-bold text-stone-500 mt-1.5 uppercase tracking-wider">
                Scan di sini untuk Linktree & Menu
              </div>
              <div className="text-[9px] text-blue-600 mt-0.5 break-all">
                {receiptSettings.qrCodeUrl || "https://linktr.ee/legiy_dessert"}
              </div>
            </div>
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
  type: "PRODUCT" | "ORDER" | "EXPENSE" | "PRE_ORDER" | "CATEGORY";
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
  const [discount, setDiscount] = useState<number>(0);
  const [orderType, setOrderType] = useState<OrderType>("Dine-in");
  const [customerName, setCustomerName] = useState("");
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const [syncQueue, setSyncQueue] = useLocalStorage<SyncOperation[]>("legiy_sync_queue", []);
  
  const [receiptSettings, setReceiptSettings] = useLocalStorage("legiy_receipt_settings", {
    storeName: "Legiy's Dessert",
    storeAddress: "Perumahan TSI, Blok O.14, Cirebon",
    storePhone: "0812-1252-7520",
    qrCodeUrl: "https://linktr.ee/legiy_dessert",
    footerText1: "Terima kasih atas kunjungannya!",
    footerText2: "Manisnya pas, bikin harimu lebih ceria :)"
  });

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

  const syncQueueRef = React.useRef(syncQueue);
  useEffect(() => {
    syncQueueRef.current = syncQueue;
  }, [syncQueue]);

  const queueSync = (
    type: "PRODUCT" | "ORDER" | "EXPENSE" | "PRE_ORDER" | "CATEGORY",
    action: "UPSERT" | "DELETE",
    data: any
  ) => {
    const opId = Math.random().toString(36).substring(2, 9);
    const newOp: SyncOperation = { id: opId, type, action, data };
    setSyncQueue((prev) => [...prev, newOp]);
  };

  const applyPendingSync = <T extends { id?: any; orderId?: any }>(
    type: "PRODUCT" | "ORDER" | "EXPENSE" | "PRE_ORDER" | "CATEGORY",
    fetchedList: T[]
  ): T[] => {
    const pendingOps = syncQueueRef.current.filter((op) => op.type === type);
    let merged = [...fetchedList];
    
    pendingOps.forEach((op) => {
      const primaryKey = op.data.id || op.data.orderId;
      if (op.action === "DELETE") {
        merged = merged.filter((item) => {
          const itemId = item.id || item.orderId;
          return String(itemId) !== String(primaryKey);
        });
      } else if (op.action === "UPSERT") {
        const index = merged.findIndex((item) => {
          const itemId = item.id || item.orderId;
          return String(itemId) !== "" && String(itemId) === String(primaryKey);
        });
        if (index > -1) {
          merged[index] = { ...merged[index], ...op.data };
        } else {
          merged.unshift(op.data);
        }
      }
    });
    
    return merged;
  };

  const applyPendingCategories = (fetchedCats: string[]): string[] => {
    const pendingOps = syncQueueRef.current.filter((op) => op.type === "CATEGORY");
    let merged = [...fetchedCats];
    
    pendingOps.forEach((op) => {
      const catName = op.data.name;
      if (op.action === "DELETE") {
        merged = merged.filter((c) => c !== catName);
      } else if (op.action === "UPSERT") {
        if (!merged.includes(catName)) {
          merged.push(catName);
        }
      }
    });
    
    return merged;
  };

  // Sequential queue sync backend worker
  useEffect(() => {
    if (syncQueue.length === 0) return;
    
    let isStopped = false;
    
    const processQueue = async () => {
      const op = syncQueue[0];
      const targetType = op.action === "DELETE" ? `DELETE_${op.type}` : op.type;
      
      setSyncStatus(`Syncing ${op.type.replace('_', ' ')}...`);
      try {
        const res = await syncToGoogleSheets(targetType, op.data);
        if (res && res.success && !isStopped) {
          setSyncQueue((prev) => prev.filter((item) => item.id !== op.id));
        }
      } catch (error) {
        console.error("Queue sync error, will retry in next cycle:", error);
      } finally {
        if (!isStopped) setSyncStatus(null);
      }
    };
    
    const timeout = setTimeout(processQueue, 1500);
    return () => {
      isStopped = true;
      clearTimeout(timeout);
    };
  }, [syncQueue]);

  // Periodic download/merge from Google Sheets
  useEffect(() => {
    let isMounted = true;
    
    const syncData = async () => {
      setSyncStatus("Fetching updates...");
      try {
        const result = await fetchFromGoogleSheets();
        if (result && result.status === 'success' && result.data && isMounted) {
          const { PRODUCT, ORDER, EXPENSE, PRE_ORDER, CATEGORY } = result.data;
          
          // 1. PRODUCTS
          const baseProducts = PRODUCT && PRODUCT.length > 0 
            ? (Array.from(new Map(PRODUCT.map((item: any) => [item.id, item])).values()) as Product[])
            : [];
          const mergedProducts = applyPendingSync("PRODUCT", baseProducts);
          setProductList(mergedProducts);
          
          // 2. CATEGORIES (Use CATEGORY sheet with fallback to initial + products)
          const baseCats = CATEGORY && CATEGORY.length > 0
            ? (CATEGORY.map((c: any) => c.name).filter(Boolean) as string[])
            : [];
          const fallbackCats = Array.from(new Set([
            ...initialCategories,
            ...mergedProducts.map((p) => p.category)
          ])).filter(Boolean) as string[];
          const fetchedCats = baseCats.length > 0 ? baseCats : fallbackCats;
          const mergedCats = applyPendingCategories(fetchedCats);
          setCategories(mergedCats);
          
          // 3. ORDERS
          const baseOrders = ORDER && ORDER.length > 0
            ? (Array.from(new Map(ORDER.map((item: any) => [item.orderId, item])).values()) as any[])
            : [];
          const mergedOrders = applyPendingSync("ORDER", baseOrders);
          setOrderHistory(mergedOrders);
          
          // 4. EXPENSES
          const baseExpenses = EXPENSE && EXPENSE.length > 0
            ? (Array.from(new Map(EXPENSE.map((item: any) => [item.id, item])).values()) as any[])
            : [];
          const mergedExpenses = applyPendingSync("EXPENSE", baseExpenses);
          setExpenses(mergedExpenses);
          
          // 5. PRE-ORDERS
          const basePreOrders = PRE_ORDER && PRE_ORDER.length > 0
            ? (Array.from(new Map(PRE_ORDER.map((item: any) => [item.id, item])).values()) as any[])
            : [];
          const mergedPreOrders = applyPendingSync("PRE_ORDER", basePreOrders);
          setPreOrders(mergedPreOrders);
        }
      } catch (error) {
        console.error("Fetch/merge from Google Sheets failed", error);
      } finally {
        if (isMounted) setSyncStatus(null);
      }
    };

    syncData();
    
    const interval = setInterval(syncData, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          ...product,
          cartId: Math.random().toString(36).substr(2, 9),
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQ = item.quantity + delta;
          return newQ > 0 ? { ...item, quantity: newQ } : item;
        }
        return item;
      }),
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
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
      .map((item) => `${item.name} (${item.quantity}x)`)
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
    };

    // Sync to Google Sheets
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
      <header className="h-16 sm:h-20 flex items-center justify-between px-3 sm:px-8 bg-white border-b-2 border-stone-200 shadow-xs shrink-0 print:hidden z-10">
        <div className="flex items-center gap-2 sm:gap-10">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="h-12 sm:h-16 w-24 sm:w-36 bg-white border-2 border-pink-100 rounded-xl flex items-center justify-center p-1.5 shadow-xs overflow-hidden shrink-0">
              <img
                src={STORE_LOGO}
                alt="Legiy's Dessert Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-black tracking-tight text-stone-900 flex items-center gap-1.5 leading-tight">
                Legiy <span className="text-[#D81B60]">Dessert</span>
              </h1>
              <p className="hidden sm:block text-[11px] sm:text-xs text-stone-600 font-bold tracking-wider uppercase">
                Premium Home Cafe
              </p>
            </div>
          </div>
          <div className="flex items-center bg-stone-100 p-1 rounded-full border border-stone-200 scale-90 sm:scale-100 origin-left">
            <button
              onClick={() => setViewMode("POS")}
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-black transition-all ${
                viewMode === "POS" 
                  ? "bg-[#D81B60] text-white shadow-md" 
                  : "text-stone-700 hover:text-stone-900 hover:bg-stone-200/50"
              }`}
            >
              Kasir
            </button>
            <button
              onClick={() => setViewMode("MANAGEMENT")}
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-black transition-all ${
                viewMode === "MANAGEMENT" 
                  ? "bg-[#D81B60] text-white shadow-md" 
                  : "text-stone-700 hover:text-stone-900 hover:bg-stone-200/50"
              }`}
            >
              Management
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          {syncStatus && (
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-stone-700 font-bold bg-stone-100 border border-stone-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="hidden xs:inline">{syncStatus}</span>
            </div>
          )}
          <div className="text-right hidden md:block">
            <p className="text-sm font-black text-stone-900">Legiy System</p>
            <p className="text-[10px] text-stone-500 uppercase font-black tracking-wider">
              {viewMode === "POS" ? "POS Module" : "Admin Module"}
            </p>
          </div>
        </div>
      </header>

      {viewMode === "POS" ? (
        <main className="flex-1 flex overflow-hidden p-4 gap-4 max-w-7xl mx-auto w-full">
          {/* Category Navigation (Left) */}
          <nav className="w-24 flex flex-col gap-2.5 overflow-y-auto shrink-0 print:hidden hidden sm:flex pb-4 custom-scrollbar">
            {(
              ["Semua", ...categories]
            ).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex flex-col items-center justify-center p-2.5 h-16 rounded-2xl transition-all duration-200 font-black
                ${
                  activeCategory === cat
                    ? "bg-[#D81B60] text-white shadow-md border-2 border-[#D81B60]"
                    : "bg-white text-stone-800 shadow-xs border-2 border-stone-200 hover:bg-pink-50/50 hover:border-pink-300 hover:text-[#D81B60]"
                }`}
              >
                <span className="text-xs font-black leading-tight text-center">
                  {cat.replace("Signature Dessert", "Dessert")}
                </span>
              </button>
            ))}
          </nav>

          {/* Product Grid (Center) */}
          <section className="flex-1 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start overflow-y-auto pb-8 print:hidden pr-1 custom-scrollbar">
            {/* Search Bar */}
            <div className="col-span-full">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari nama menu atau kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white text-stone-900 text-sm font-bold pl-11 pr-10 py-3.5 rounded-2xl shadow-xs border-2 border-stone-200 outline-none focus:border-[#D81B60] focus:ring-2 focus:ring-[#D81B60]/20 transition-all placeholder-stone-400"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">
                  <Search size={18} strokeWidth={2.5} />
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-xs text-stone-600 hover:text-stone-900 px-2 py-1 rounded-md bg-stone-100 hover:bg-stone-200 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Categories Dropdown */}
            <div className="col-span-full sm:hidden mb-2">
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {(
                  ["Semua", ...categories]
                ).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-black transition-all duration-200
                      ${
                        activeCategory === cat
                          ? "bg-[#D81B60] text-white shadow-md border-2 border-[#D81B60]"
                          : "bg-white text-stone-800 border-2 border-stone-200 hover:border-pink-200"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
                <Search size={44} className="text-stone-400 mb-3" />
                <p className="text-base font-black text-stone-700">Menu tidak ditemukan</p>
                <p className="text-xs text-stone-500 font-semibold mt-1">Coba cari dengan kata kunci lain atau pilih kategori Semua.</p>
              </div>
            ) : (
              filteredProducts.map((product, idx) => (
                <div
                  key={`${product.id}-${idx}`}
                  onClick={() => addToCart(product)}
                  className={`bg-white rounded-2xl p-4 shadow-xs border-2 flex flex-col cursor-pointer transition-all active:scale-[0.98] group select-none hover:shadow-md h-full min-h-[128px]
                  ${cart.find((c) => c.id === product.id) ? "border-[#D81B60] ring-2 ring-[#D81B60] ring-offset-2" : "border-stone-200 hover:border-[#D81B60]"}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 group-hover:text-pink-600 transition-colors">
                      {product.category}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-black text-stone-900 leading-snug line-clamp-2 min-h-[2.6rem] mb-3">
                    {product.name}
                  </h3>
                  <div className="mt-auto flex justify-between items-center pt-2 border-t border-stone-100">
                    <span className="text-base font-black text-[#D81B60] tracking-tight">
                      {formatRupiah(product.price)}
                    </span>

                    {cart.find((c) => c.id === product.id) ? (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white bg-[#D81B60] shadow-sm">
                        <span className="text-xs">
                          {cart.find((c) => c.id === product.id)?.quantity}x
                        </span>
                      </div>
                    ) : (
                      <button className="w-8 h-8 bg-stone-100 group-hover:bg-[#D81B60] group-hover:text-white transition-colors rounded-lg flex items-center justify-center font-black text-stone-800 border border-stone-200">
                        <Plus size={16} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Right Panel: Cart & Payment */}
          <aside className="w-80 flex flex-col gap-4 overflow-hidden shrink-0 print:hidden hidden md:flex">
            {/* Order Summary Card */}
            <div className="flex-1 bg-white rounded-3xl shadow-sm border-2 border-stone-200 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-stone-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-black text-stone-900">Current Order</h2>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-stone-500 hover:text-[#D81B60] transition-colors p-1.5 bg-stone-100 hover:bg-pink-50 rounded-lg"
                      title="Kosongkan keranjang"
                    >
                      <Trash2 size={15} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
                <div className="flex items-center bg-stone-50 rounded-xl px-3 border-2 border-stone-200 focus-within:border-[#D81B60] transition-all mb-3">
                  <User size={16} className="text-stone-500" strokeWidth={2.5} />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama Pelanggan / Meja"
                    className="w-full bg-transparent px-2.5 py-2.5 text-sm font-extrabold text-stone-900 placeholder-stone-400 outline-none"
                  />
                </div>
                <div className="flex gap-2 p-1 bg-stone-100 rounded-xl border border-stone-200">
                  {(["Dine-in", "Takeaway"] as OrderType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setOrderType(type)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                        orderType === type
                          ? "bg-[#D81B60] text-white shadow-sm"
                          : "text-stone-700 hover:text-stone-900"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Items Scroll Area */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-3 pb-8">
                    <ShoppingBag size={44} className="opacity-40" strokeWidth={2} />
                    <p className="text-sm font-black text-stone-500">
                      Keranjang Kosong
                    </p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex gap-3 group items-center">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <h4 className="text-[13px] font-black text-stone-900 line-clamp-1 leading-snug">
                            {item.name}
                          </h4>
                          <span className="text-[13px] font-black text-[#D81B60] whitespace-nowrap">
                            {formatRupiah(item.price)}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-500 font-bold mb-1.5">
                          {item.category}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2.5 bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-6 h-6 flex items-center justify-center rounded text-stone-700 hover:bg-stone-200 hover:text-stone-900 transition-colors"
                            >
                              <Minus size={12} strokeWidth={3} />
                            </button>
                            <span className="text-xs font-black w-3 text-center text-stone-900">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-6 h-6 flex items-center justify-center rounded text-[#D81B60] hover:bg-pink-100 transition-colors"
                            >
                              <Plus size={12} strokeWidth={3} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-[#D81B60] transition-opacity p-1"
                          >
                            <Trash2 size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Calculation */}
              <div className="p-5 bg-stone-50 border-t-2 border-stone-200 space-y-2 mt-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600 font-bold">Subtotal</span>
                  <span className="font-black text-stone-900">
                    {formatRupiah(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600 font-bold">Diskon</span>
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-500 text-[10px] font-bold">Rp</span>
                    <input 
                      type="number" 
                      value={discount || ""}
                      onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-6 pr-2 py-1 text-right bg-white border border-stone-300 rounded text-xs text-stone-900 font-black focus:outline-none focus:border-[#D81B60] transition-colors hide-arrows"
                      placeholder="0"
                    />
                  </div>
                </div>
                {TAX_RATE > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600 font-bold">
                      PB1 ({(TAX_RATE * 100).toFixed(0)}%)
                    </span>
                    <span className="font-black text-stone-900">
                      {formatRupiah(tax)}
                    </span>
                  </div>
                )}
                <div className="pt-3 border-t-2 border-stone-200 flex justify-between items-center mt-3">
                  <span className="font-black text-stone-900 text-base">Total Amount</span>
                  <span className="text-xl font-black text-[#D81B60]">
                    {formatRupiah(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Shortcuts & Checkout Process... */}
            <button
              onClick={() => setIsCheckoutModalOpen(true)}
              disabled={cart.length === 0}
              className={`w-full py-4 rounded-2xl font-black text-lg shadow-md flex items-center justify-center gap-2 transition-all shrink-0 ${
                cart.length === 0
                  ? "bg-stone-200 text-stone-400 shadow-none cursor-not-allowed"
                  : "bg-[#D81B60] text-white hover:brightness-105 active:scale-95"
              }`}
            >
              Process Payment
            </button>
          </aside>
        </main>
      ) : (
        <main className="flex-1 flex overflow-hidden bg-stone-50 p-4 sm:p-6 pb-0">
          <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-stone-900">
                  Management <span className="text-[#D81B60]">Dashboard</span>
                </h2>
                <p className="text-xs text-stone-600 font-bold tracking-wider mt-1 uppercase">
                  Monitor business performance & inventory
                </p>
              </div>
              <div className="flex bg-white rounded-2xl shadow-xs border-2 border-stone-200 p-1 w-full sm:w-fit overflow-x-auto custom-scrollbar">
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
                        : "text-stone-700 hover:text-stone-900 hover:bg-stone-100"
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
                  setReceiptSettings={setReceiptSettings} 
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
            <span>Database: </span>
            <span className="text-[#5D4037] font-bold">
              Legiy_Inventory_Sheets_V2
            </span>
          </div>
          <div className="ml-auto italic">Legiy Dessert POS v1.0.4</div>
        </div>
      </footer>

      {/* CHECKOUT MODAL */}
      {isCheckoutModalOpen && !lastOrderDetails && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col flex-1 max-h-[90vh] border-2 border-stone-200">
            <div className="p-6 border-b border-stone-200 bg-stone-50">
              <h2 className="text-xl font-black text-stone-900">
                Payment Process
              </h2>
              <p className="text-stone-600 text-sm font-bold mt-1">
                Total Amount:{" "}
                <span className="font-black text-[#D81B60] text-xl">
                  {formatRupiah(total)}
                </span>
              </p>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              <div>
                <label className="text-[11px] font-black text-stone-700 tracking-wider uppercase mb-3 block">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2 mb-4">
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
                        className={`rounded-2xl flex items-center justify-start px-3 py-2.5 gap-3 transition-all outline-none border-2
                          ${
                            isActive
                              ? "bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-[#D81B60] ring-offset-1"
                              : "bg-white border-stone-200 text-stone-800 hover:bg-stone-50 hover:border-stone-300"
                          }
                        `}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${isActive ? "bg-white/20" : "bg-stone-100"}`}
                        >
                          {icon}
                        </div>
                        <span
                          className={`text-xs font-black ${isActive ? "text-white" : "text-stone-900"}`}
                        >
                          {cat}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {paymentMethod.includes("Transfer") && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 mb-4 bg-stone-50 p-3.5 rounded-2xl border-2 border-stone-200">
                    <label className="text-[11px] font-black text-stone-700 tracking-wider uppercase mb-2 block">
                      Pilih Bank
                    </label>
                    <div className="flex gap-2">
                      {["Transfer BRI", "Transfer JAGO"].map((bank) => (
                        <button
                          key={bank}
                          onClick={() =>
                            setPaymentMethod(bank as PaymentMethod)
                          }
                          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all outline-none ${paymentMethod === bank ? "bg-blue-600 text-white shadow-md" : "bg-white text-stone-800 border-2 border-stone-200 hover:bg-stone-100"}`}
                        >
                          {bank.replace("Transfer ", "")}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {["Gopay", "Dana", "Shopeepay"].includes(paymentMethod) && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 mb-4 bg-stone-50 p-3.5 rounded-2xl border-2 border-stone-200">
                    <label className="text-[11px] font-black text-stone-700 tracking-wider uppercase mb-2 block">
                      Pilih E-Wallet
                    </label>
                    <div className="flex gap-2">
                      {["Gopay", "Dana", "Shopeepay"].map((ewallet) => (
                        <button
                          key={ewallet}
                          onClick={() =>
                            setPaymentMethod(ewallet as PaymentMethod)
                          }
                          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all outline-none ${paymentMethod === ewallet ? "bg-emerald-600 text-white shadow-md" : "bg-white text-stone-800 border-2 border-stone-200 hover:bg-stone-100"}`}
                        >
                          {ewallet}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {paymentMethod === "Cash" && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <label className="text-[11px] font-black text-stone-700 tracking-wider uppercase mb-3 block">
                    Cash Received (Rp)
                  </label>
                  <input
                    type="text"
                    value={cashAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setCashAmount(
                        val ? parseInt(val).toLocaleString("id-ID") : "",
                      );
                    }}
                    placeholder="e.g. 100000"
                    className="w-full text-2xl font-black p-4 bg-white border-2 rounded-2xl border-stone-300 focus:border-[#D81B60] focus:bg-white focus:ring-4 focus:ring-[#D81B60]/10 outline-none transition-all text-stone-900 placeholder-stone-400"
                    autoFocus
                  />

                  {/* Quick Cash Buttons */}
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[20000, 50000, 100000, total].map((amount) => (
                      <button
                        key={amount}
                        onClick={() =>
                          setCashAmount(amount.toLocaleString("id-ID"))
                        }
                        className="py-2.5 bg-white border-2 border-stone-200 hover:border-stone-400 rounded-xl text-xs font-black text-stone-800 shadow-xs"
                      >
                        {amount === total
                          ? "Pas (Exact)"
                          : amount / 1000 + "K"}
                      </button>
                    ))}
                  </div>

                  {cashGiven >= total && (
                    <div className="mt-5 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-200 text-center">
                      <p className="text-xs font-black text-emerald-900 uppercase tracking-wider mb-1">
                        Change Return (Kembalian)
                      </p>
                      <p className="text-3xl font-black text-emerald-700">
                        {formatRupiah(change)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t-2 border-stone-200 bg-white flex gap-3">
              <button
                onClick={() => {
                  setIsCheckoutModalOpen(false);
                  setPaymentMethod("");
                  setCashAmount("");
                }}
                className="px-6 py-4 rounded-2xl font-black text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors flex-none"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                disabled={
                  !paymentMethod ||
                  (paymentMethod === "Cash" && cashGiven < total) ||
                  isProcessing
                }
                className={`flex-1 py-4 rounded-2xl font-black flex items-center justify-center transition-all text-base
                  ${
                    !paymentMethod ||
                    (paymentMethod === "Cash" && cashGiven < total) ||
                    isProcessing
                      ? "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"
                      : "bg-[#D81B60] hover:brightness-105 active:scale-95 text-white shadow-md shadow-[#D81B60]/20"
                  }`}
              >
                {isProcessing ? "Processing Sync..." : "Complete Transaction"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL (AND PRINT VIEW) */}
      {lastOrderDetails && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:bg-white print:p-0">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col print:shadow-none print:w-full print:-mt-8">
            {/* Receipt Content */}
            <div className="p-8 pb-4" id="receipt-content">
              <div className="text-center mb-6 border-b-2 border-dashed border-stone-200 pb-6">
                <div className="flex justify-center mb-3">
                  <div className="w-28 sm:w-32 h-auto bg-white border border-stone-200 rounded-xl flex items-center justify-center p-2 shadow-xs">
                    <img src={STORE_LOGO} alt="Logo" className="w-full h-auto object-contain" />
                  </div>
                </div>
                {isEditingReceipt ? (
                  <div className="space-y-1.5">
                    <div>
                      <label className="text-[9px] font-bold text-[#D81B60] block uppercase tracking-wider text-left">Nama Toko</label>
                      <input
                        type="text"
                        className="text-center font-bold text-sm text-stone-800 p-1.5 border rounded-lg w-full outline-none focus:border-[#D81B60] focus:ring-1 focus:ring-[#D81B60]"
                        value={receiptSettings.storeName}
                        onChange={(e) => setReceiptSettings({ ...receiptSettings, storeName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-[#D81B60] block uppercase tracking-wider text-left">Alamat Toko</label>
                      <input
                        type="text"
                        className="text-center text-xs text-stone-500 p-1.5 border rounded-lg w-full outline-none focus:border-[#D81B60] focus:ring-1 focus:ring-[#D81B60]"
                        value={receiptSettings.storeAddress}
                        onChange={(e) => setReceiptSettings({ ...receiptSettings, storeAddress: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-[#D81B60] block uppercase tracking-wider text-left">No. Telepon / WA</label>
                      <input
                        type="text"
                        className="text-center text-xs font-semibold text-stone-700 p-1.5 border rounded-lg w-full outline-none focus:border-[#D81B60] focus:ring-1 focus:ring-[#D81B60]"
                        value={receiptSettings.storePhone || ""}
                        onChange={(e) => setReceiptSettings({ ...receiptSettings, storePhone: e.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl font-bold text-stone-800 tracking-tight mb-0.5">
                      {receiptSettings.storeName}
                    </h1>
                    <p className="text-xs text-stone-500 font-medium">
                      {receiptSettings.storeAddress}
                    </p>
                    <p className="text-xs text-stone-600 font-semibold mt-0.5">
                      {receiptSettings.storePhone || "0812-1252-7520"}
                    </p>
                  </>
                )}
              </div>

              <div className="mb-6 font-mono text-xs space-y-1.5 text-stone-500">
                <div className="flex justify-between">
                  <span>No Order:</span>{" "}
                  <span className="text-stone-800">
                    {lastOrderDetails.orderId}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Customer:</span>{" "}
                  {isEditingReceipt ? (
                    <input
                      type="text"
                      className="text-right p-1 border rounded-lg text-xs font-bold text-stone-850 w-36 outline-none focus:border-[#D81B60]"
                      value={lastOrderDetails.customerName || ""}
                      onChange={(e) => setLastOrderDetails({ ...lastOrderDetails, customerName: e.target.value })}
                    />
                  ) : (
                    <span className="text-stone-800 font-bold">
                      {lastOrderDetails.customerName || "-"}
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>{" "}
                  <span className="text-stone-800">
                    {new Date(lastOrderDetails.timestamp).toLocaleDateString(
                      "id-ID",
                    )}{" "}
                    {new Date(lastOrderDetails.timestamp).toLocaleTimeString(
                      "id-ID",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tipe:</span>{" "}
                  <span className="font-bold text-stone-800">
                    {lastOrderDetails.orderType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Metode:</span>{" "}
                  <span className="text-stone-800">
                    {lastOrderDetails.paymentMethod}
                  </span>
                </div>
              </div>

              <div className="mb-6 border-b-2 border-dashed border-stone-200 pb-5 space-y-3 relative">
                {lastOrderDetails.cartSnapshot.map((item: any) => (
                  <div key={item.id} className="text-sm">
                    <div className="font-bold text-stone-800 leading-tight">
                      {item.name}
                    </div>
                    <div className="flex justify-between text-stone-500 text-xs mt-1 font-mono">
                      <span>
                        {item.quantity} x {formatRupiah(item.price)}
                      </span>
                      <span className="text-stone-800 font-bold">
                        {formatRupiah(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm font-medium">
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal</span>
                  <span className="font-mono text-stone-800">
                    {formatRupiah(lastOrderDetails.subtotal)}
                  </span>
                </div>
                {lastOrderDetails.discount > 0 && (
                  <div className="flex justify-between text-[#D81B60]">
                    <span>Diskon</span>
                    <span className="font-mono">
                      -{formatRupiah(lastOrderDetails.discount)}
                    </span>
                  </div>
                )}
                {lastOrderDetails.tax > 0 && (
                  <div className="flex justify-between text-stone-500">
                    <span>PB1</span>
                    <span className="font-mono text-stone-800">
                      {formatRupiah(lastOrderDetails.tax)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black text-stone-800 pt-3 pb-3 border-y-2 border-stone-800 mt-2">
                  <span>TOTAL</span>
                  <span>{formatRupiah(lastOrderDetails.total)}</span>
                </div>
                <div className="flex justify-between text-stone-500 mt-3 font-mono text-xs">
                  <span>Bayar ({lastOrderDetails.paymentMethod})</span>
                  <span className="text-stone-800">
                    {formatRupiah(lastOrderDetails.cashGiven)}
                  </span>
                </div>
                {lastOrderDetails.paymentMethod === "Cash" && (
                  <div className="flex justify-between text-stone-500 pt-2 font-mono text-xs">
                    <span>Kembalian</span>
                    <span className="text-stone-800">
                      {formatRupiah(lastOrderDetails.change)}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-center mt-8 text-xs text-stone-400 font-medium space-y-1">
                {isEditingReceipt ? (
                  <div className="space-y-2 border-t border-dashed border-stone-200 pt-3">
                    <div>
                      <label className="text-[9px] font-bold text-[#D81B60] block uppercase tracking-wider text-left">Pesan Kaki 1</label>
                      <input
                        type="text"
                        className="text-center text-xs text-stone-600 p-1.5 border rounded-lg w-full outline-none focus:border-[#D81B60]"
                        value={receiptSettings.footerText1}
                        onChange={(e) => setReceiptSettings({ ...receiptSettings, footerText1: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-[#D81B60] block uppercase tracking-wider text-left">Pesan Kaki 2</label>
                      <input
                        type="text"
                        className="text-center text-xs font-bold text-stone-700 p-1.5 border rounded-lg w-full outline-none focus:border-[#D81B60]"
                        value={receiptSettings.footerText2}
                        onChange={(e) => setReceiptSettings({ ...receiptSettings, footerText2: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-[#D81B60] block uppercase tracking-wider text-left">Link QR Code (Linktree/Sosmed)</label>
                      <input
                        type="text"
                        className="text-center text-xs text-blue-600 p-1.5 border rounded-lg w-full outline-none focus:border-[#D81B60]"
                        value={receiptSettings.qrCodeUrl || "https://linktr.ee/legiy_dessert"}
                        onChange={(e) => setReceiptSettings({ ...receiptSettings, qrCodeUrl: e.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <p>{receiptSettings.footerText1}</p>
                    <p className="font-bold mt-1 text-stone-700 tracking-wider">
                      {receiptSettings.footerText2}
                    </p>
                    <div className="flex flex-col items-center justify-center mt-4 pt-3 border-t border-dashed border-stone-200">
                      <div className="bg-white p-2 border border-stone-200 rounded-xl shadow-sm">
                        <QRCodeCanvas
                          value={receiptSettings.qrCodeUrl || "https://linktr.ee/legiy_dessert"}
                          size={84}
                          level="M"
                        />
                      </div>
                      <p className="text-[10px] font-bold text-stone-600 mt-2">Scan untuk Menu & Sosmed</p>
                      <p className="text-[9px] text-[#D81B60] font-medium tracking-tight">linktr.ee/legiy_dessert</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-stone-50 border-t border-stone-100 flex flex-col gap-2.5 print:hidden">
              <button
                onClick={() => setIsEditingReceipt(!isEditingReceipt)}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex justify-center items-center transition-all border ${isEditingReceipt ? "bg-stone-800 text-white border-transparent" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50 shadow-sm"}`}
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
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-stone-500 bg-white border border-stone-200 hover:bg-stone-50 shadow-sm text-center text-xs transition-colors"
                >
                  Selesai (Done)
                </button>
                <button
                  onClick={printReceipt}
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-[#D81B60] text-white hover:brightness-110 active:scale-95 shadow-lg shadow-[#D81B60]/20 flex justify-center items-center text-xs transition-all"
                >
                  <Printer size={14} className="mr-1.5" /> Cetak Struk
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
            background: white !important;
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
          }
          #print-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            display: block !important;
            padding: 5mm 6mm !important;
            box-sizing: border-box !important;
            color: black !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 12px !important;
            line-height: 1.3 !important;
            background: white !important;
          }
          @page {
            margin: 0;
            size: 80mm auto;
          }
        }
      `}</style>

      {/* PRINTABLE RECEIPT TEMPLATE FOR 80MM (HIDDEN ON SCREEN) */}
      {receiptToPrint && (
        <div id="print-receipt" className="hidden print:block absolute top-0 left-0 bg-white z-[9999] w-[80mm] text-black font-mono text-[12px] leading-snug p-[5mm]">
          {/* Header Kop */}
          <div className="text-center mb-2">
            <div className="flex justify-center mb-1.5">
              <img
                src={STORE_LOGO_PRINT}
                alt="Logo"
                className="w-32 h-auto object-contain mx-auto mb-1"
              />
            </div>
            <div className="font-bold text-[16px] tracking-tight">{receiptSettings.storeName}</div>
            <div className="text-[11px] leading-tight mt-0.5">{receiptSettings.storeAddress}</div>
            <div className="text-[11px] leading-tight font-medium mt-0.5">{receiptSettings.storePhone || "0812-1252-7520"}</div>
          </div>

          <div className="border-b-2 border-dashed border-black my-2"></div>

          {/* Order Details */}
          <div className="space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span>No. Order :</span>
              <span className="font-bold">{receiptToPrint.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer   :</span>
              <span className="font-bold">{receiptToPrint.customerName || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal    :</span>
              <span>
                {new Date(receiptToPrint.timestamp).toLocaleDateString("id-ID")}{" "}
                {new Date(receiptToPrint.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tipe Order :</span>
              <span className="font-bold">{receiptToPrint.orderType}</span>
            </div>
            <div className="flex justify-between">
              <span>Metode     :</span>
              <span>{receiptToPrint.paymentMethod}</span>
            </div>
          </div>

          <div className="border-b-2 border-dashed border-black my-2"></div>

          {/* Item List */}
          <div className="space-y-1.5 my-1">
            {receiptToPrint.cartSnapshot && receiptToPrint.cartSnapshot.map((item: any, idx: number) => (
              <div key={idx} className="text-[12px]">
                <div className="font-bold leading-tight">{item.name}</div>
                <div className="flex justify-between text-[11px] pl-2">
                  <span>{item.quantity} x {Number(item.price).toLocaleString("id-ID")}</span>
                  <span className="font-bold">{Number(item.price * item.quantity).toLocaleString("id-ID")}</span>
                </div>
              </div>
            ))}

            {!receiptToPrint.cartSnapshot && receiptToPrint.items && typeof receiptToPrint.items === 'string' && (
              <div className="whitespace-pre-wrap text-[11px]">
                {receiptToPrint.items}
              </div>
            )}
          </div>

          <div className="border-b-2 border-dashed border-black my-2"></div>

          {/* Totals */}
          <div className="space-y-1 text-[12px]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{Number(receiptToPrint.subtotal).toLocaleString("id-ID")}</span>
            </div>
            {receiptToPrint.discount ? (
              <div className="flex justify-between">
                <span>Diskon</span>
                <span>-{Number(receiptToPrint.discount).toLocaleString("id-ID")}</span>
              </div>
            ) : null}
            {receiptToPrint.tax > 0 ? (
              <div className="flex justify-between">
                <span>PB1</span>
                <span>{Number(receiptToPrint.tax).toLocaleString("id-ID")}</span>
              </div>
            ) : null}
            <div className="border-b border-dashed border-black my-1"></div>
            <div className="flex justify-between font-black text-[15px] pt-0.5">
              <span>TOTAL</span>
              <span>Rp {Number(receiptToPrint.total).toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between mt-1 text-[11px]">
              <span>Bayar ({receiptToPrint.paymentMethod})</span>
              <span>{Number(receiptToPrint.cashGiven).toLocaleString("id-ID")}</span>
            </div>
            {receiptToPrint.paymentMethod === "Cash" && (
              <div className="flex justify-between text-[11px]">
                <span>Kembalian</span>
                <span>{Number(receiptToPrint.change).toLocaleString("id-ID")}</span>
              </div>
            )}
          </div>

          <div className="border-b-2 border-dashed border-black my-2.5"></div>

          {/* Footer Messages & QR Code */}
          <div className="text-center space-y-1 mt-2">
            <div className="font-medium text-[11px]">{receiptSettings.footerText1}</div>
            <div className="font-bold text-[12px]">{receiptSettings.footerText2}</div>

            <div className="flex flex-col items-center justify-center mt-3 pt-2">
              <QRCodeCanvas
                value={receiptSettings.qrCodeUrl || "https://linktr.ee/legiy_dessert"}
                size={86}
                level="M"
              />
              <div className="text-[10px] font-bold mt-1.5">Scan untuk Menu & Sosmed</div>
              <div className="text-[9px]">linktr.ee/legiy_dessert</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
