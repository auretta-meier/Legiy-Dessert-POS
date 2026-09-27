import { Product } from "./data";

export const CLOUD_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxkjzZ4qKRd83IFr3qK_rv3r5UlxQKjGUWe3SX-kSKzxwicv8G_mDxj_vQxufynKWSo/exec";

export interface CloudDatabaseData {
  categories: string[];
  products: Product[];
  orders: any[];
  expenses: any[];
  preOrders: any[];
  settings?: any;
}

/**
 * Fetch all live data from the centralized Google Cloud database
 * Used by both Live and Preview instances to ensure 100% data parity.
 */
export async function fetchFromGoogleCloud(): Promise<CloudDatabaseData | null> {
  try {
    const response = await fetch(CLOUD_APPS_SCRIPT_URL, {
      method: "GET",
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`Cloud fetch HTTP ${response.status}`);
    }
    const result = await response.json();
    const rawData = result.data || {};

    // 1. Categories
    const categories: string[] = [];
    if (Array.isArray(rawData.CATEGORY)) {
      rawData.CATEGORY.forEach((c: any) => {
        const name = c.name || c.id || String(c);
        if (name && !categories.includes(name)) {
          categories.push(name);
        }
      });
    }

    // 2. Products
    const products: Product[] = [];
    if (Array.isArray(rawData.PRODUCT)) {
      rawData.PRODUCT.forEach((p: any) => {
        let addonsParsed = undefined;
        if (p.addons) {
          if (typeof p.addons === "string") {
            try {
              addonsParsed = JSON.parse(p.addons);
            } catch (_) {}
          } else if (Array.isArray(p.addons)) {
            addonsParsed = p.addons;
          }
        }
        products.push({
          id: String(p.id || p.name),
          name: p.name || "",
          price: Number(p.price) || 0,
          cogs: Number(p.cogs) || 0,
          category: p.category || "General",
          imageColor: p.imageColor || "bg-pink-100 text-pink-800",
          addons: addonsParsed,
        });
      });
    }

    // 3. Orders
    const orders: any[] = [];
    if (Array.isArray(rawData.ORDER)) {
      rawData.ORDER.forEach((o: any) => {
        let cartSnapshot = o.cartSnapshot;
        if (cartSnapshot && typeof cartSnapshot === "string") {
          try {
            cartSnapshot = JSON.parse(cartSnapshot);
          } catch (_) {}
        }
        orders.push({
          ...o,
          orderId: String(o.orderId || o.id),
          total: Number(o.total) || 0,
          subtotal: Number(o.subtotal) || Number(o.total) || 0,
          discount: Number(o.discount) || 0,
          tax: Number(o.tax) || 0,
          cashGiven: Number(o.cashGiven) || Number(o.total) || 0,
          change: Number(o.change) || 0,
          cartSnapshot: cartSnapshot || undefined,
          timestamp: o.timestamp || o.date || new Date().toISOString(),
        });
      });
    }

    // 4. Expenses
    const expenses: any[] = [];
    if (Array.isArray(rawData.EXPENSE)) {
      rawData.EXPENSE.forEach((e: any) => {
        expenses.push({
          ...e,
          id: String(e.id),
          amount: Number(e.amount) || 0,
          timestamp: e.timestamp || e.date || new Date().toISOString(),
        });
      });
    }

    // 5. Pre-orders
    const preOrders: any[] = [];
    if (Array.isArray(rawData.PRE_ORDER)) {
      rawData.PRE_ORDER.forEach((po: any) => {
        preOrders.push({
          ...po,
          id: String(po.id),
        });
      });
    }

    return {
      categories,
      products,
      orders,
      expenses,
      preOrders,
    };
  } catch (error) {
    console.warn("Could not fetch latest data from Google Cloud:", error);
    return null;
  }
}

/**
 * Send record mutation (UPSERT / DELETE) to Google Cloud database
 */
export async function syncToGoogleCloud(
  type: "PRODUCT" | "ORDER" | "EXPENSE" | "PRE_ORDER" | "CATEGORY" | "SETTINGS" | string,
  action: "UPSERT" | "DELETE",
  data: any
): Promise<{ success: boolean; message?: string }> {
  try {
    let sheetType = type;
    if (type.startsWith("DELETE_")) {
      sheetType = type.replace("DELETE_", "");
      action = "DELETE";
    }

    const payload = {
      type: sheetType,
      action,
      data,
    };

    // Use mode: 'no-cors' so browser fetch to Google Apps Script 302 redirect completes cleanly
    await fetch(CLOUD_APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(payload),
    });

    return { success: true };
  } catch (error: any) {
    console.warn(`Error syncing ${type} to Google Cloud:`, error);
    return { success: false, message: error?.message || String(error) };
  }
}

// Backwards compatibility aliases
export const syncToGoogleSheets = async (type: string, data: any) => {
  const action = type.startsWith("DELETE_") ? "DELETE" : "UPSERT";
  return syncToGoogleCloud(type, action, data);
};

export const fetchFromGoogleSheets = fetchFromGoogleCloud;
