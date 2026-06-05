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
} from "lucide-react";
import { products, formatRupiah, Category, Product, initialCategories } from "./data";
import { syncToGoogleSheets, fetchFromGoogleSheets } from "./googleSheetsService";

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
        <h3 className="text-lg font-bold text-stone-800">Product Menu</h3>
        <button
          onClick={openAdd}
          className="bg-[#D81B60] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          <Plus size={16} /> Add Product
        </button>
        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="bg-white border hover:bg-stone-50 text-stone-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ml-2"
        >
           Manage Categories
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-widest">
              <th className="pb-3 font-bold">Product Name</th>
              <th className="pb-3 font-bold">Category</th>
              <th className="pb-3 font-bold">Price</th>
              <th className="pb-3 font-bold">COGS</th>
              <th className="pb-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {productList.map((p, idx) => (
              <tr
                key={`${p.id}-${idx}`}
                className="border-b border-stone-100 hover:bg-stone-50"
              >
                <td className="py-4 text-sm font-bold text-stone-800">
                  {p.name}
                </td>
                <td className="py-4 text-xs font-semibold text-stone-500">
                  {p.category}
                </td>
                <td className="py-4 text-sm font-mono text-stone-800">
                  {formatRupiah(p.price)}
                </td>
                <td className="py-4 text-sm font-mono text-stone-500">
                  {formatRupiah(p.cogs)}
                </td>
                <td className="py-4 text-right">
                  <button
                    onClick={() => openEdit(p)}
                    className="text-blue-500 hover:underline text-xs font-bold mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteProduct(p.id)}
                    className="text-red-500 hover:underline text-xs font-bold"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center mb-6">
        <h3 className="text-lg font-bold text-stone-800">
          Order History ({orderHistory.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {orderHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-300">
            <History size={48} className="opacity-20 mb-3" />
            <p className="text-sm font-bold text-stone-400">
              Belum ada transaksi selesai.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
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
              {orderHistory.map((o, idx) => (
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
                    {formatRupiah(o.total)}
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ManagementFinance({
  orderHistory,
  expenses,
  setExpenses,
}: {
  orderHistory: any[];
  expenses: any[];
  setExpenses: any;
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

  const filteredOrders = useMemo(() => {
    return orderHistory.filter((o) => {
      const date = new Date(o.timestamp);
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
  }, [orderHistory, filter, customStart, customEnd]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const date = new Date(e.timestamp);
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
  }, [expenses, filter, customStart, customEnd]);

  const totalRevenue = filteredOrders.reduce((acc, o) => acc + o.total, 0);
  const totalCOGS = filteredOrders.reduce((acc, o) => {
    const cogs = o.cartSnapshot
      ? o.cartSnapshot.reduce(
          (cAcc: number, item: any) => cAcc + (item.cogs || 0) * item.quantity,
          0,
        )
      : 0;
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
        <table className="w-full text-left border-collapse">
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
  );
}

function ManagementPerformance({ orderHistory }: { orderHistory: any[] }) {
  const itemCounts = orderHistory.reduce(
    (acc, order) => {
      if (order.cartSnapshot) {
        order.cartSnapshot.forEach((item: any) => {
          acc[item.name] = (acc[item.name] || 0) + item.quantity;
        });
      } else if (order.items) {
        // parse the items string fallback if cartSnapshot is missing
        // format: "2x Item Name (Rp 20.000)\n1x ..."
        const lines = typeof order.items === 'string' ? order.items.split('\n') : [];
        lines.forEach((line: string) => {
          const match = line.match(/^(\d+)x\s+(.+)\s+\(Rp.*$/);
          if (match) {
            const qty = parseInt(match[1]);
            const name = match[2];
            acc[name] = (acc[name] || 0) + qty;
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
                {orderHistory.filter((o) => o.orderType === "Dine-in").length}
              </p>
              <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest mt-2">
                Dine-In
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-2xl w-32 outline outline-1 outline-orange-100">
              <p className="text-3xl font-black text-orange-600">
                {orderHistory.filter((o) => o.orderType === "Takeaway").length}
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
}: {
  receiptSettings: any;
  setReceiptSettings: any;
}) {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center mb-6">
        <h3 className="text-lg font-bold text-stone-800">
          Pengaturan Struk (Receipt)
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-w-xl">
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1">
              Nama Toko / Store Name
            </label>
            <input
              type="text"
              value={receiptSettings.storeName}
              onChange={(e) =>
                setReceiptSettings({ ...receiptSettings, storeName: e.target.value })
              }
              className="w-full text-sm p-3 rounded-xl border border-stone-200 outline-none focus:border-[#D81B60]"
              placeholder="Misal: LEGIY DESSERT & COFFEE"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1">
              Alamat Toko
            </label>
            <textarea
              value={receiptSettings.storeAddress}
              onChange={(e) =>
                setReceiptSettings({ ...receiptSettings, storeAddress: e.target.value })
              }
              rows={2}
              className="w-full text-sm p-3 rounded-xl border border-stone-200 outline-none focus:border-[#D81B60]"
              placeholder="Alamat toko yang akan dicetak di struk"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1">
              Footer / Pesan Terima Kasih (Baris 1)
            </label>
            <input
              type="text"
              value={receiptSettings.footerText1}
              onChange={(e) =>
                setReceiptSettings({ ...receiptSettings, footerText1: e.target.value })
              }
              className="w-full text-sm p-3 rounded-xl border border-stone-200 outline-none focus:border-[#D81B60]"
              placeholder="Misal: Suka dessert-nya?"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1">
              Footer / Pesan Terima Kasih (Baris 2)
            </label>
            <input
              type="text"
              value={receiptSettings.footerText2}
              onChange={(e) =>
                setReceiptSettings({ ...receiptSettings, footerText2: e.target.value })
              }
              className="w-full text-sm p-3 rounded-xl border border-stone-200 outline-none focus:border-[#D81B60]"
              placeholder="Misal: Yuk, tag Instagram kami di @legiy.dessert"
            />
          </div>
          <div className="mt-4 bg-blue-50 text-blue-800 p-3 rounded-xl text-xs font-medium border border-blue-100">
            Perubahan otomatis tersimpan dan akan langsung digunakan pada pencetakan struk berikutnya.
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [orderType, setOrderType] = useState<OrderType>("Dine-in");
  const [customerName, setCustomerName] = useState("");
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const [syncQueue, setSyncQueue] = useLocalStorage<SyncOperation[]>("legiy_sync_queue", []);
  
  const [receiptSettings, setReceiptSettings] = useLocalStorage("legiy_receipt_settings", {
    storeName: "LEGIY DESSERT & COFFEE",
    storeAddress: "Puri Indah Mall, Jakarta Barat",
    footerText1: "Manisnya pas, kayak senyum kamu hari ini :)",
    footerText2: "Yuk, tag Instagram kami di @legiy.dessert"
  });

  const [receiptToPrint, setReceiptToPrint] = useState<any>(null);

  useEffect(() => {
    if (receiptToPrint) {
      setTimeout(() => {
        window.print();
        setReceiptToPrint(null);
      }, 500);
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

  // Filter products by category
  const filteredProducts =
    activeCategory === "Semua"
      ? productList
      : productList.filter((p) => p.category === activeCategory);

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
    <div className="flex flex-col h-screen w-screen bg-[#FDFBF7] font-sans text-stone-800 overflow-hidden relative">
      <div className="flex flex-col h-full w-full print:hidden">
      {/* Top Header Bar */}
      <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-stone-200 shadow-sm shrink-0 print:hidden z-10">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white border border-stone-200 rounded-lg flex items-center justify-center drop-shadow-sm overflow-hidden shrink-0">
              {/* PASTE_BASE64_LOGO_DISINI */}
              {/* Ganti atribut src di bawah ini dengan string Base64 gambar Anda */}
              <img
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAB9AAAAWGCAYAAADXcD66AAAAtGVYSWZJSSoACAAAAAYAEgEDAAEAAAABAAAAGgEFAAEAAABWAAAAGwEFAAEAAABeAAAAKAEDAAEAAAACAAAAEwIDAAEAAAABAAAAaYcEAAEAAABmAAAAAAAAAKsAAAABAAAAqwAAAAEAAAAGAACQBwAEAAAAMDIxMAGRBwAEAAAAAQIDAACgBwAEAAAAMDEwMAGgAwABAAAA//8AAAKgBAABAAAA0AcAAAOgBAABAAAAhgUAAAAAAACp95QEAAAACXBIWXMAABpMAAAaTAEcLDmcAAAGA2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI2LTA1LTA0PC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkRhdGE+eyZxdW90O2RvYyZxdW90OzomcXVvdDtEQUhJaU1TQVhBOCZxdW90OywmcXVvdDt1c2VyJnF1b3Q7OiZxdW90O1VBRUhZb3JuWVJRJnF1b3Q7LCZxdW90O2JyYW5kJnF1b3Q7OiZxdW90O1NpcnVw4oCZcyB0ZWFtJnF1b3Q7LCZxdW90O3RlbXBsYXRlJnF1b3Q7OiZxdW90O1BpbmsgQ3V0ZSBTb2xkIG91dCBQcm9tbyBBbm5vdW5jZW1lbnQgSW5zdGFncmFtIFBvc3QmcXVvdDt9PC9BdHRyaWI6RGF0YT4KICAgICA8QXR0cmliOkV4dElkPjkyYzM5YThiLWM5ODQtNDAwYS1hMjk4LTg5ODNhNWUzY2RmZDwvQXR0cmliOkV4dElkPgogICAgIDxBdHRyaWI6RmJJZD41MjUyNjU5MTQxNzk1ODA8L0F0dHJpYjpGYklkPgogICAgIDxBdHRyaWI6VG91Y2hUeXBlPjI8L0F0dHJpYjpUb3VjaFR5cGU+CiAgICA8L3JkZjpsaT4KICAgPC9yZGY6U2VxPgogIDwvQXR0cmliOkFkcz4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6ZGM9J2h0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvJz4KICA8ZGM6dGl0bGU+CiAgIDxyZGY6QWx0PgogICAgPHJkZjpsaSB4bWw6bGFuZz0neC1kZWZhdWx0Jz5QaW5rIEN1dGUgU29sZCBvdXQgUHJvbW8gQW5ub3VuY2VtZW50IEluc3RhZ3JhbSBQb3N0IC0gMzwvcmRmOmxpPgogICA8L3JkZjpBbHQ+CiAgPC9kYzp0aXRsZT4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6cGRmPSdodHRwOi8vbnMuYWRvYmUuY29tL3BkZi8xLjMvJz4KICA8cGRmOkF1dGhvcj5hdXJldHRhIG1laWVyPC9wZGY6QXV0aG9yPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczp4bXA9J2h0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8nPgogIDx4bXA6Q3JlYXRvclRvb2w+Q2FudmEgZG9jPURBSElpTVNBWEE4IHVzZXI9VUFFSFlvcm5ZUlEgYnJhbmQ9U2lydXDigJlzIHRlYW0gdGVtcGxhdGU9UGluayBDdXRlIFNvbGQgb3V0IFByb21vIEFubm91bmNlbWVudCBJbnN0YWdyYW0gUG9zdDwveG1wOkNyZWF0b3JUb29sPgogPC9yZGY6RGVzY3JpcHRpb24+CjwvcmRmOlJERj4KPC94OnhtcG1ldGE+Cjw/eHBhY2tldCBlbmQ9J3InPz6ZZmIjAAAgAElEQVR4nOzda5hkV10vYD8SciEQksGhCT3dVWt1V63Vcj2Cl8NNgWBCvBzjAUQ8AhEEhaCQCBzwQZSbBgEjJ0QOIQFECAIiRCRSe1fPjBOcAwnKRUg0F4gSQhLI7SNn10zQABmmrr2qu9/3efbTk8l01W/9d3371Vr7h34IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACA/9ceHBIAAAAACPr/2hsGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA5BG5dwAAAQ9JREFUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG4C7kXdDPnCNFEAAAAASUVORK5CYII="
                alt="Logo"
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#5D4037]">
                Legiy <span className="text-[#D81B60]">Dessert</span>
              </h1>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest leading-none mt-0.5">
                Premium Home Cafe
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center bg-stone-100 p-1.5 rounded-full">
            <button
              onClick={() => setViewMode("POS")}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${viewMode === "POS" ? "bg-white shadow-sm text-[#D81B60]" : "text-stone-500 hover:text-stone-700"}`}
            >
              Kasir
            </button>
            <button
              onClick={() => setViewMode("MANAGEMENT")}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${viewMode === "MANAGEMENT" ? "bg-white shadow-sm text-[#D81B60]" : "text-stone-500 hover:text-stone-700"}`}
            >
              Management
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {syncStatus && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-stone-500 bg-stone-100 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              {syncStatus}
            </div>
          )}
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">Legiy System</p>
            <p className="text-[10px] text-stone-400 uppercase font-black tracking-widest">
              {viewMode === "POS" ? "POS Module" : "Admin Module"}
            </p>
          </div>
        </div>
      </header>

      {viewMode === "POS" ? (
        <main className="flex-1 flex overflow-hidden p-4 gap-4 max-w-7xl mx-auto w-full">
          {/* Category Navigation (Left) */}
          <nav className="w-24 flex flex-col gap-3 overflow-y-auto shrink-0 print:hidden hidden sm:flex pb-4 custom-scrollbar">
            {(
              ["Semua", ...categories]
            ).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex flex-col items-center justify-center p-3 h-16 rounded-2xl transition-all duration-200
                ${
                  activeCategory === cat
                    ? "bg-[#D81B60] text-white shadow-lg border-2 border-transparent"
                    : "bg-white text-stone-500 shadow-sm border border-stone-100 hover:bg-stone-50 hover:border-stone-200"
                }`}
              >
                <span className="text-[10px] font-bold leading-tight text-center">
                  {cat.replace("Signature Dessert", "Dessert")}
                </span>
              </button>
            ))}
          </nav>

          {/* Product Grid (Center) */}
          <section className="flex-1 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start overflow-y-auto pb-8 print:hidden pr-1 custom-scrollbar">
            {/* Mobile Categories Dropdown */}
            <div className="col-span-full sm:hidden mb-2">
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {(
                  ["Semua", ...categories]
                ).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all duration-200
                      ${
                        activeCategory === cat
                          ? "bg-[#D81B60] text-white shadow-md"
                          : "bg-white text-stone-500 border border-stone-100"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {filteredProducts.map((product, idx) => (
              <div
                key={`${product.id}-${idx}`}
                onClick={() => addToCart(product)}
                className={`bg-white rounded-2xl p-4 shadow-sm border flex flex-col cursor-pointer transition-all active:scale-95 group select-none hover:shadow-md h-full min-h-[120px]
                ${cart.find((c) => c.id === product.id) ? "border-[#D81B60] ring-2 ring-[#D81B60] ring-offset-2" : "border-stone-100 hover:border-[#D81B60]"}`}
              >
                <h3 className="text-sm font-bold text-stone-700 leading-tight line-clamp-2 min-h-[2.5rem] mb-3">
                  {product.name}
                </h3>
                <div className="mt-auto flex justify-between items-center">
                  <span className="text-sm font-bold text-[#D81B60]">
                    {formatRupiah(product.price)}
                  </span>

                  {cart.find((c) => c.id === product.id) ? (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white bg-[#D81B60]">
                      <span className="text-xs">
                        {cart.find((c) => c.id === product.id)?.quantity}x
                      </span>
                    </div>
                  ) : (
                    <button className="w-8 h-8 bg-stone-100 group-hover:bg-[#D81B60] group-hover:text-white transition-colors rounded-lg flex items-center justify-center font-bold text-stone-600">
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>

          {/* Right Panel: Cart & Payment */}
          <aside className="w-80 flex flex-col gap-4 overflow-hidden shrink-0 print:hidden hidden md:flex">
            {/* Order Summary Card */}
            <div className="flex-1 bg-white rounded-3xl shadow-md border border-stone-100 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-stone-50">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Current Order</h2>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-stone-400 hover:text-[#D81B60] transition-colors p-1 bg-stone-50 rounded-md"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="flex items-center bg-stone-50 rounded-xl px-3 outline outline-1 outline-stone-200 focus-within:outline-[#D81B60] transition-all mb-4">
                  <User size={14} className="text-stone-400" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama Pelanggan / Meja"
                    className="w-full bg-transparent px-3 py-2 text-sm font-bold text-stone-700 placeholder-stone-400 outline-none"
                  />
                </div>
                <div className="flex gap-2 p-1 bg-stone-50 rounded-xl">
                  {(["Dine-in", "Takeaway"] as OrderType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setOrderType(type)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        orderType === type
                          ? "bg-white shadow-sm text-[#D81B60]"
                          : "text-stone-400 hover:text-stone-600"
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
                  <div className="h-full flex flex-col items-center justify-center text-stone-300 space-y-3 pb-8">
                    <ShoppingBag size={42} className="opacity-30" />
                    <p className="text-xs font-bold text-stone-400">
                      Keranjang Kosong
                    </p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex gap-3 group items-center">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <h4 className="text-xs font-bold text-stone-800 line-clamp-1">
                            {item.name}
                          </h4>
                          <span className="text-xs font-bold text-[#D81B60] whitespace-nowrap">
                            {formatRupiah(item.price)}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 italic mb-1.5">
                          {item.category}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-3 bg-stone-100 rounded-lg p-0.5">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-6 h-6 flex items-center justify-center rounded text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-colors"
                            >
                              <Minus size={12} strokeWidth={3} />
                            </button>
                            <span className="text-[10px] font-bold w-2 text-center text-stone-700">
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
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Calculation */}
              <div className="p-5 bg-stone-50 border-t border-stone-100 space-y-2 mt-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500 font-medium">Subtotal</span>
                  <span className="font-bold text-stone-700">
                    {formatRupiah(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-500 font-medium">Diskon</span>
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 text-[10px]">Rp</span>
                    <input 
                      type="number" 
                      value={discount || ""}
                      onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-6 pr-2 py-1 text-right bg-white border border-stone-200 rounded text-xs text-stone-700 font-bold focus:outline-none focus:border-[#D81B60] transition-colors hide-arrows"
                      placeholder="0"
                    />
                  </div>
                </div>
                {TAX_RATE > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500 font-medium">
                      PB1 ({(TAX_RATE * 100).toFixed(0)}%)
                    </span>
                    <span className="font-bold text-stone-700">
                      {formatRupiah(tax)}
                    </span>
                  </div>
                )}
                <div className="pt-3 border-t border-stone-200 flex justify-between items-center mt-3">
                  <span className="font-bold text-stone-800">Total Amount</span>
                  <span className="text-lg font-extrabold text-[#D81B60]">
                    {formatRupiah(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Shortcuts & Checkout Process... */}
            <button
              onClick={() => setIsCheckoutModalOpen(true)}
              disabled={cart.length === 0}
              className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all shrink-0 ${
                cart.length === 0
                  ? "bg-stone-200 text-stone-400 shadow-none cursor-not-allowed"
                  : "bg-[#D81B60] text-white hover:brightness-110 active:scale-95"
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
                <h2 className="text-2xl font-black text-stone-800">
                  Management <span className="text-[#D81B60]">Dashboard</span>
                </h2>
                <p className="text-xs text-stone-500 font-medium tracking-wide mt-1 uppercase">
                  Monitor business performance
                </p>
              </div>
              <div className="flex bg-white rounded-2xl shadow-sm border border-stone-200 p-1 w-full sm:w-fit overflow-x-auto custom-scrollbar">
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
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${managementTab === tab ? "bg-stone-800 text-white shadow-md" : "text-stone-500 hover:bg-stone-50"}`}
                  >
                    {tab.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-white rounded-t-3xl shadow-sm border border-stone-200 overflow-hidden flex flex-col print:hidden">
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col flex-1 max-h-[90vh] border border-stone-100">
            <div className="p-6 border-b border-stone-100 bg-stone-50/50">
              <h2 className="text-xl font-black text-stone-800">
                Payment Process
              </h2>
              <p className="text-stone-500 text-sm mt-1">
                Total Amount:{" "}
                <span className="font-bold text-[#D81B60] text-lg">
                  {formatRupiah(total)}
                </span>
              </p>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              <div>
                <label className="text-[10px] font-bold text-stone-400 tracking-widest uppercase mb-3 block">
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
                        className={`rounded-2xl flex items-center justify-start px-3 py-2 gap-3 transition-all outline-none
                          ${
                            isActive
                              ? "bg-stone-800 text-white shadow-lg ring-2 ring-[#D81B60] ring-offset-2"
                              : "bg-white border text-stone-600 border-stone-200 hover:bg-stone-50 shadow-sm"
                          }
                        `}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${isActive ? "bg-white/20" : "bg-stone-100"}`}
                        >
                          {icon}
                        </div>
                        <span
                          className={`text-xs font-bold ${isActive ? "text-white" : "text-stone-700"}`}
                        >
                          {cat}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {paymentMethod.includes("Transfer") && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 mb-4 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <label className="text-[10px] font-bold text-stone-500 tracking-widest uppercase mb-2 block">
                      Pilih Bank
                    </label>
                    <div className="flex gap-2">
                      {["Transfer BRI", "Transfer JAGO"].map((bank) => (
                        <button
                          key={bank}
                          onClick={() =>
                            setPaymentMethod(bank as PaymentMethod)
                          }
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all outline-none ${paymentMethod === bank ? "bg-blue-600 text-white shadow-md" : "bg-white text-stone-600 border border-stone-200 shadow-sm hover:bg-stone-100"}`}
                        >
                          {bank.replace("Transfer ", "")}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {["Gopay", "Dana", "Shopeepay"].includes(paymentMethod) && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 mb-4 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <label className="text-[10px] font-bold text-stone-500 tracking-widest uppercase mb-2 block">
                      Pilih E-Wallet
                    </label>
                    <div className="flex gap-2">
                      {["Gopay", "Dana", "Shopeepay"].map((ewallet) => (
                        <button
                          key={ewallet}
                          onClick={() =>
                            setPaymentMethod(ewallet as PaymentMethod)
                          }
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all outline-none ${paymentMethod === ewallet ? "bg-emerald-600 text-white shadow-md" : "bg-white text-stone-600 border border-stone-200 shadow-sm hover:bg-stone-100"}`}
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
                  <label className="text-[10px] font-bold text-stone-400 tracking-widest uppercase mb-3 block">
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
                    className="w-full text-2xl font-bold p-4 bg-stone-50 border-2 rounded-2xl border-stone-200 focus:border-[#D81B60] focus:bg-white focus:ring-4 focus:ring-[#D81B60]/10 outline-none transition-all text-stone-800 placeholder-stone-300"
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
                        className="py-2.5 bg-white border border-stone-100 hover:bg-stone-50 rounded-xl text-xs font-bold text-stone-600 shadow-sm"
                      >
                        {amount === total
                          ? "Exact Amount"
                          : amount / 1000 + "K"}
                      </button>
                    ))}
                  </div>

                  {cashGiven >= total && (
                    <div className="mt-5 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                      <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-1">
                        Change Return
                      </p>
                      <p className="text-3xl font-black text-emerald-600">
                        {formatRupiah(change)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-stone-100 bg-white flex gap-3">
              <button
                onClick={() => {
                  setIsCheckoutModalOpen(false);
                  setPaymentMethod("");
                  setCashAmount("");
                }}
                className="px-6 py-4 rounded-2xl font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors flex-none"
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
                className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center transition-all
                  ${
                    !paymentMethod ||
                    (paymentMethod === "Cash" && cashGiven < total) ||
                    isProcessing
                      ? "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"
                      : "bg-[#D81B60] hover:brightness-110 active:scale-95 text-white shadow-lg shadow-[#D81B60]/20"
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
                <h1 className="text-2xl font-black text-stone-800 tracking-tight mb-1">
                  LEGIY <span className="text-[#D81B60]">DESSERT</span>
                </h1>
                <p className="text-xs text-stone-500 font-medium">
                  Jl. Contoh No. 123, Kota Anda
                </p>
                <p className="text-xs text-stone-500 font-medium tracking-wide mt-1">
                  IG: @legiydessert
                </p>
              </div>

              <div className="mb-6 font-mono text-xs space-y-1.5 text-stone-500">
                <div className="flex justify-between">
                  <span>No Order:</span>{" "}
                  <span className="text-stone-800">
                    {lastOrderDetails.orderId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>{" "}
                  <span className="text-stone-800">
                    {lastOrderDetails.customerName}
                  </span>
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

              <div className="text-center mt-10 text-xs text-stone-400 font-medium">
                <p>Terima kasih telah berbelanja di</p>
                <p className="font-bold mt-1 text-stone-700 tracking-wider">
                  Legiy Dessert!
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 bg-stone-50 border-t border-stone-100 flex gap-3 print:hidden">
              <button
                onClick={() => {
                  setLastOrderDetails(null);
                  setIsCheckoutModalOpen(false);
                }}
                className="flex-1 py-4 px-4 rounded-2xl font-bold text-stone-500 bg-white border border-stone-200 hover:bg-stone-50 shadow-sm text-center transition-colors"
              >
                Done
              </button>
              <button
                onClick={printReceipt}
                className="flex-1 py-4 px-4 rounded-2xl font-bold bg-[#D81B60] text-white hover:brightness-110 active:scale-95 shadow-lg shadow-[#D81B60]/20 flex justify-center items-center transition-all"
              >
                <Printer size={18} className="mr-2" /> Print Receipt
              </button>
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
          @page { margin: 0; size: 58mm auto; }
          body { 
            font-family: monospace; 
            margin: 0; 
            padding: 4mm;
            width: 58mm;
            box-sizing: border-box;
            color: black;
            font-size: 11px;
            line-height: 1.2;
            background: white !important;
          }
        }
      `}</style>

      {/* PRINTABLE RECEIPT TEMPLATE (HIDDEN ON SCREEN) */}
      {receiptToPrint && (
        <div className="hidden print:block absolute top-0 left-0 bg-white z-[9999] w-[58mm] text-black font-mono text-[11px] leading-tight p-[4mm]">
          <div className="text-center mb-1">
            <div className="font-bold text-[14px]">{receiptSettings.storeName}</div>
            <div style={{ padding: "2px 0 4px 0" }}>{receiptSettings.storeAddress}</div>
          </div>
          <div className="border-b border-dashed border-black my-1"></div>
          <div>No: {receiptToPrint.orderId}</div>
          <div>Customer: {receiptToPrint.customerName || "-"}</div>
          <div>TGL: {new Date(receiptToPrint.timestamp).toLocaleDateString("id-ID")} {new Date(receiptToPrint.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
          <div>Tipe: {receiptToPrint.orderType}</div>
          <div className="border-b border-dashed border-black my-1"></div>
          
          {receiptToPrint.cartSnapshot && receiptToPrint.cartSnapshot.map((item: any, idx: number) => (
            <div key={idx} className="mb-1">
              <div className="font-bold truncate">{item.name}</div>
              <div className="flex justify-between">
                <span>{item.quantity} x {item.price.toLocaleString("id-ID")}</span>
                <span>{(item.price * item.quantity).toLocaleString("id-ID")}</span>
              </div>
            </div>
          ))}

          {!receiptToPrint.cartSnapshot && receiptToPrint.items && typeof receiptToPrint.items === 'string' && (
            <div className="mb-1 whitespace-pre-wrap">
              {receiptToPrint.items}
            </div>
          )}
          
          <div className="border-b border-dashed border-black my-1"></div>
          <div className="flex justify-between"><span>Subtotal</span><span>{receiptToPrint.subtotal.toLocaleString("id-ID")}</span></div>
          {receiptToPrint.discount ? <div className="flex justify-between"><span>Diskon</span><span>-{receiptToPrint.discount.toLocaleString("id-ID")}</span></div> : null}
          {receiptToPrint.tax > 0 ? <div className="flex justify-between"><span>PB1</span><span>{receiptToPrint.tax.toLocaleString("id-ID")}</span></div> : null}
          <div className="border-b border-dashed border-black my-1"></div>
          <div className="flex justify-between font-bold text-[13px]"><span>TOTAL</span><span>{receiptToPrint.total.toLocaleString("id-ID")}</span></div>
          <div className="flex justify-between mt-1"><span>Pay ({receiptToPrint.paymentMethod})</span><span>{receiptToPrint.cashGiven.toLocaleString("id-ID")}</span></div>
          {receiptToPrint.paymentMethod === "Cash" && (
            <div className="flex justify-between"><span>Kembalian</span><span>{receiptToPrint.change.toLocaleString("id-ID")}</span></div>
          )}
          <div className="border-b border-dashed border-black my-2"></div>
          <div className="text-center mt-2">
            <div className="mb-1">{receiptSettings.footerText1}</div>
            <div className="mb-1">{receiptSettings.footerText2}</div>
          </div>
        </div>
      )}
    </div>
  );
}
