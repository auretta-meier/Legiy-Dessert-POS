import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDocFromServer,
  query,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";
import { Product } from "./data";

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom databaseId if specified
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Helper to detect Firestore quota limits and resource exhaustion
export function isQuotaError(error: any): boolean {
  if (!error) return false;
  const msg = String(error?.message || error || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return (
    code === "resource-exhausted" ||
    msg.includes("quota exceeded") ||
    msg.includes("resource-exhausted") ||
    msg.includes("quota")
  );
}

// Test connection on boot as mandated by skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error: any) {
    if (isQuotaError(error)) {
      console.warn("Firestore daily quota limit reached on boot test. Running in local-first cache mode.");
    } else if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Please check your Firebase configuration or network connection.");
    }
  }
}
testConnection();

// Active connection test for diagnostic and UI feedback
export async function testFirestoreConnection(): Promise<{
  connected: boolean;
  message: string;
  projectId: string;
  databaseId: string;
  latencyMs?: number;
}> {
  const start = performance.now();
  try {
    const testDocRef = doc(db, "test", "connection");
    await setDoc(testDocRef, { ping: true, lastPingAt: new Date().toISOString() }, { merge: true });
    await getDocFromServer(testDocRef);
    const latency = Math.round(performance.now() - start);
    return {
      connected: true,
      message: `Terhubung langsung ke Cloud Firestore (${latency} ms)`,
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId || "(default)",
      latencyMs: latency,
    };
  } catch (error: any) {
    const latency = Math.round(performance.now() - start);
    if (isQuotaError(error)) {
      console.warn("Test Firestore connection: Quota exceeded, local storage active.");
      return {
        connected: true, // App operates normally in local-first mode
        message: "Kuota harian Cloud Firestore tercapai. Mode offline/lokal aktif.",
        projectId: firebaseConfig.projectId,
        databaseId: firebaseConfig.firestoreDatabaseId || "(default)",
        latencyMs: latency,
      };
    }
    console.warn("Test Firestore connection error:", error);
    return {
      connected: false,
      message: error?.message || "Gagal menghubungi server Firestore",
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId || "(default)",
      latencyMs: latency,
    };
  }
}

// Ensure anonymous sign-in for cashier terminal sessions
let currentUser: User | null = null;
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (!user) {
    signInAnonymously(auth).catch((err) => {
      console.warn("Firebase anonymous auth fallback:", err);
    });
  }
});

// Real-time subscribers with Quota Optimization (limit and efficient queries)
export function subscribeToProducts(onData: (products: Product[]) => void) {
  try {
    const q = query(collection(db, "products"), limit(300));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: Product[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          items.push({
            id: docSnap.id,
            name: d.name || "",
            price: Number(d.price) || 0,
            cogs: Number(d.cogs) || 0,
            category: d.category || "General",
            imageColor: d.imageColor || "bg-pink-100 text-pink-800",
            addons: d.addons || undefined,
          });
        });
        onData(items);
      },
      (error) => {
        if (isQuotaError(error)) {
          console.warn("Firestore products subscribe: Quota exceeded, using local cached catalog.");
        } else {
          console.warn("Firestore products subscribe warning:", error);
        }
      }
    );
  } catch (err) {
    console.warn("Firestore products query setup warning:", err);
    return () => {};
  }
}

export function subscribeToCategories(onData: (categories: string[]) => void) {
  try {
    const q = query(collection(db, "categories"), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: string[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.name) items.push(d.name);
        });
        onData(items);
      },
      (error) => {
        if (isQuotaError(error)) {
          console.warn("Firestore categories subscribe: Quota exceeded, using local categories.");
        } else {
          console.warn("Firestore categories subscribe warning:", error);
        }
      }
    );
  } catch (err) {
    console.warn("Firestore categories query setup warning:", err);
    return () => {};
  }
}

// Quota-optimized orders listener: loads complete order history without artificial truncation
export function subscribeToOrders(onData: (orders: any[]) => void, maxLimit = 5000) {
  try {
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(maxLimit));
    let fallbackUnsub: (() => void) | null = null;

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            ...data,
            orderId: data.orderId || docSnap.id,
          });
        });
        onData(items);
      },
      (error: any) => {
        if (isQuotaError(error)) {
          console.warn("Firestore orders subscribe: Quota exceeded, operating with local order history.");
          return;
        }
        // Only attempt fallback query if index was missing
        if (error?.code === "failed-precondition") {
          console.warn("Firestore orders subscribe orderBy error (falling back to limited query):", error);
          try {
            const fallbackQ = query(collection(db, "orders"), limit(maxLimit));
            fallbackUnsub = onSnapshot(
              fallbackQ,
              (snap) => {
                const items: any[] = [];
                snap.forEach((docSnap) => {
                  const data = docSnap.data();
                  items.push({
                    ...data,
                    orderId: data.orderId || docSnap.id,
                  });
                });
                items.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
                onData(items);
              },
              (fallbackErr) => {
                if (isQuotaError(fallbackErr)) {
                  console.warn("Firestore orders fallback subscribe: Quota exceeded, using local order history.");
                } else {
                  console.warn("Firestore orders fallback subscription warning:", fallbackErr);
                }
              }
            );
          } catch (e) {
            console.warn("Firestore orders fallback setup warning:", e);
          }
        } else {
          console.warn("Firestore orders subscribe warning:", error);
        }
      }
    );

    return () => {
      unsub();
      if (fallbackUnsub) fallbackUnsub();
    };
  } catch (err) {
    console.warn("Firestore orders query setup warning:", err);
    return () => {};
  }
}

// Quota-optimized expenses listener (up to 500 records)
export function subscribeToExpenses(onData: (expenses: any[]) => void, maxLimit = 500) {
  try {
    const q = query(collection(db, "expenses"), limit(maxLimit));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            ...data,
            id: docSnap.id,
          });
        });
        items.sort((a, b) => new Date(b.timestamp || b.date || 0).getTime() - new Date(a.timestamp || a.date || 0).getTime());
        onData(items);
      },
      (error) => {
        if (isQuotaError(error)) {
          console.warn("Firestore expenses subscribe: Quota exceeded, using local expenses.");
        } else {
          console.warn("Firestore expenses subscribe warning:", error);
        }
      }
    );
  } catch (err) {
    console.warn("Firestore expenses query setup warning:", err);
    return () => {};
  }
}

// Quota-optimized pre-orders listener (up to 500 records)
export function subscribeToPreOrders(onData: (preOrders: any[]) => void, maxLimit = 500) {
  try {
    const q = query(collection(db, "preOrders"), limit(maxLimit));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            ...data,
            id: docSnap.id,
          });
        });
        items.sort((a, b) => new Date(b.pickupDate || 0).getTime() - new Date(a.pickupDate || 0).getTime());
        onData(items);
      },
      (error) => {
        if (isQuotaError(error)) {
          console.warn("Firestore preOrders subscribe: Quota exceeded, using local pre-orders.");
        } else {
          console.warn("Firestore preOrders subscribe warning:", error);
        }
      }
    );
  } catch (err) {
    console.warn("Firestore preOrders query setup warning:", err);
    return () => {};
  }
}

export function subscribeToReceiptSettings(onData: (settings: any) => void) {
  try {
    const settingsDocRef = doc(db, "settings", "receipt");
    return onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onData(docSnap.data());
        }
      },
      (error) => {
        if (isQuotaError(error)) {
          console.warn("Firestore settings subscribe: Quota exceeded, using local receipt settings.");
        } else {
          console.warn("Firestore settings subscribe warning:", error);
        }
      }
    );
  } catch (err) {
    console.warn("Firestore settings query setup warning:", err);
    return () => {};
  }
}

// Write / Mutate operations with Quota Graceful Fallback
export async function syncProductToFirestore(action: "UPSERT" | "DELETE", product: any) {
  try {
    const docId = String(product.id || product.name);
    const ref = doc(db, "products", docId);
    if (action === "DELETE") {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        id: docId,
        name: product.name,
        price: Number(product.price) || 0,
        cogs: Number(product.cogs) || 0,
        category: product.category || "General",
        imageColor: product.imageColor || "bg-pink-100 text-pink-800",
        addons: product.addons || null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err: any) {
    if (isQuotaError(err)) {
      console.warn("Firestore syncProduct: Quota reached. Saved locally in browser.");
      return;
    }
    throw err;
  }
}

export async function syncCategoryToFirestore(action: "UPSERT" | "DELETE", category: { name: string }) {
  try {
    const safeId = category.name.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    const ref = doc(db, "categories", safeId);
    if (action === "DELETE") {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        name: category.name,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err: any) {
    if (isQuotaError(err)) {
      console.warn("Firestore syncCategory: Quota reached. Saved locally in browser.");
      return;
    }
    throw err;
  }
}

export async function syncOrderToFirestore(action: "UPSERT" | "DELETE", order: any) {
  try {
    const docId = String(order.orderId);
    const ref = doc(db, "orders", docId);
    if (action === "DELETE") {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        ...order,
        orderId: docId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err: any) {
    if (isQuotaError(err)) {
      console.warn("Firestore syncOrder: Quota reached. Order saved locally in browser.");
      return;
    }
    throw err;
  }
}

export async function syncExpenseToFirestore(action: "UPSERT" | "DELETE", expense: any) {
  try {
    const docId = String(expense.id);
    const ref = doc(db, "expenses", docId);
    if (action === "DELETE") {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        ...expense,
        id: docId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err: any) {
    if (isQuotaError(err)) {
      console.warn("Firestore syncExpense: Quota reached. Saved locally in browser.");
      return;
    }
    throw err;
  }
}

export async function syncPreOrderToFirestore(action: "UPSERT" | "DELETE", preOrder: any) {
  try {
    const docId = String(preOrder.id);
    const ref = doc(db, "preOrders", docId);
    if (action === "DELETE") {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        ...preOrder,
        id: docId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err: any) {
    if (isQuotaError(err)) {
      console.warn("Firestore syncPreOrder: Quota reached. Saved locally in browser.");
      return;
    }
    throw err;
  }
}

export async function syncReceiptSettingsToFirestore(settings: any) {
  try {
    const ref = doc(db, "settings", "receipt");
    await setDoc(ref, {
      ...settings,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err: any) {
    if (isQuotaError(err)) {
      console.warn("Firestore syncReceiptSettings: Quota reached. Saved locally in browser.");
      return;
    }
    throw err;
  }
}

// Initial seed helper: if products collection in Firestore is empty, seed defaults
export async function seedInitialFirestoreData(
  defaultProducts: Product[],
  defaultCategories: string[]
) {
  // Prevent repeated checks if already confirmed seeded in this browser
  if (typeof window !== "undefined" && localStorage.getItem("legiy_firestore_seeded_v1")) {
    return false;
  }
  try {
    const prodSnap = await getDocs(query(collection(db, "products"), limit(1)));
    if (prodSnap.empty && defaultProducts.length > 0) {
      console.log("Firestore products collection is empty. Seeding default products...");
      const batch = writeBatch(db);
      
      // Seed products
      defaultProducts.forEach((p) => {
        const ref = doc(db, "products", p.id);
        batch.set(ref, {
          ...p,
          updatedAt: new Date().toISOString(),
        });
      });

      // Seed categories
      defaultCategories.forEach((cat) => {
        const safeId = cat.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
        const ref = doc(db, "categories", safeId);
        batch.set(ref, {
          name: cat,
          updatedAt: new Date().toISOString(),
        });
      });

      await batch.commit();
      if (typeof window !== "undefined") {
        localStorage.setItem("legiy_firestore_seeded_v1", "true");
      }
      return true;
    } else if (!prodSnap.empty && typeof window !== "undefined") {
      localStorage.setItem("legiy_firestore_seeded_v1", "true");
    }
    return false;
  } catch (error) {
    if (isQuotaError(error)) {
      console.warn("Firestore seed check: Quota exceeded, operating with local defaults.");
      if (typeof window !== "undefined") {
        localStorage.setItem("legiy_firestore_seeded_v1", "true");
      }
      return false;
    }
    console.warn("Seeding initial data to Firestore encountered an issue:", error);
    return false;
  }
}

// Function to pull all legacy Excel/Google Sheets data and migrate to Firestore
export async function importFromGoogleSheetsToFirestore(): Promise<{
  success: boolean;
  categoriesCount: number;
  productsCount: number;
  ordersCount: number;
  message?: string;
}> {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxkjzZ4qKRd83IFr3qK_rv3r5UlxQKjGUWe3SX-kSKzxwicv8G_mDxj_vQxufynKWSo/exec';
  try {
    const res = await fetch(SCRIPT_URL, { redirect: 'follow' });
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
    const json = await res.json();
    const data = json.data || {};

    const categories = data.CATEGORY || [];
    const products = data.PRODUCT || [];
    const orders = data.ORDER || [];
    const expenses = data.EXPENSE || [];
    const preOrders = data.PRE_ORDER || [];

    // Migrate Categories
    if (categories.length > 0) {
      const catBatch = writeBatch(db);
      categories.forEach((cat: any) => {
        const name = cat.name || cat.id;
        if (!name) return;
        const safeId = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        const ref = doc(db, 'categories', safeId);
        catBatch.set(ref, {
          name,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });
      await catBatch.commit();
    }

    // Migrate Products
    if (products.length > 0) {
      for (let i = 0; i < products.length; i += 400) {
        const chunk = products.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach((p: any) => {
          const id = String(p.id || p.name);
          const ref = doc(db, 'products', id);
          batch.set(ref, {
            id,
            name: p.name || "",
            category: p.category || "General",
            price: Number(p.price) || 0,
            cogs: Number(p.cogs) || 0,
            imageColor: p.imageColor || "bg-pink-100 text-pink-800",
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        });
        await batch.commit();
      }
    }

    // Migrate Orders
    if (orders.length > 0) {
      for (let i = 0; i < orders.length; i += 350) {
        const chunk = orders.slice(i, i + 350);
        const batch = writeBatch(db);
        chunk.forEach((o: any, idx: number) => {
          const orderId = String(o.orderId || `LGY-LEGACY-${i + idx}`);
          const ref = doc(db, 'orders', orderId);
          batch.set(ref, {
            orderId,
            timestamp: o.timestamp || new Date().toISOString(),
            customerName: o.customerName || "Guest",
            items: o.items || "",
            orderType: o.orderType || "Dine-in",
            paymentMethod: o.paymentMethod || "Cash",
            subtotal: Number(o.subtotal) || Number(o.total) || 0,
            tax: Number(o.tax) || 0,
            discount: Number(o.discount) || 0,
            total: Number(o.total) || 0,
            cashGiven: Number(o.cashGiven) || Number(o.total) || 0,
            change: Number(o.change) || 0,
            cartSnapshot: o.cartSnapshot || null,
            migratedFrom: "GoogleSheets_Excel",
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        });
        await batch.commit();
      }
    }

    // Migrate Expenses if any
    if (expenses.length > 0) {
      const expBatch = writeBatch(db);
      expenses.forEach((e: any, idx: number) => {
        const expId = String(e.id || `EXP-${idx}`);
        const ref = doc(db, 'expenses', expId);
        expBatch.set(ref, {
          ...e,
          id: expId,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });
      await expBatch.commit();
    }

    // Migrate Pre-orders if any
    if (preOrders.length > 0) {
      const poBatch = writeBatch(db);
      preOrders.forEach((po: any, idx: number) => {
        const poId = String(po.id || `PO-${idx}`);
        const ref = doc(db, 'preOrders', poId);
        poBatch.set(ref, {
          ...po,
          id: poId,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });
      await poBatch.commit();
    }

    return {
      success: true,
      categoriesCount: categories.length,
      productsCount: products.length,
      ordersCount: orders.length,
    };
  } catch (err: any) {
    console.error("Failed to import from Google Sheets:", err);
    return {
      success: false,
      categoriesCount: 0,
      productsCount: 0,
      ordersCount: 0,
      message: err.message || String(err),
    };
  }
}
