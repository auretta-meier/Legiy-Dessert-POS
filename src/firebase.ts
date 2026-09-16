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

// Test connection on boot as mandated by skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
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
    console.error("Test Firestore connection error:", error);
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
      console.error("Firestore products subscribe error:", error);
    }
  );
}

export function subscribeToCategories(onData: (categories: string[]) => void) {
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
      console.error("Firestore categories subscribe error:", error);
    }
  );
}

// Quota-optimized orders listener: limits to recent 100 orders instead of scanning whole DB
export function subscribeToOrders(onData: (orders: any[]) => void, maxLimit = 100) {
  const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(maxLimit));
  return onSnapshot(
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
    (error) => {
      console.warn("Firestore orders subscribe orderBy error (falling back to limited query):", error);
      // Fallback query without orderBy index
      const fallbackQ = query(collection(db, "orders"), limit(maxLimit));
      return onSnapshot(fallbackQ, (snap) => {
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
      });
    }
  );
}

// Quota-optimized expenses listener (limit to 100)
export function subscribeToExpenses(onData: (expenses: any[]) => void, maxLimit = 100) {
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
      console.error("Firestore expenses subscribe error:", error);
    }
  );
}

// Quota-optimized pre-orders listener (limit to 100)
export function subscribeToPreOrders(onData: (preOrders: any[]) => void, maxLimit = 100) {
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
      console.error("Firestore preOrders subscribe error:", error);
    }
  );
}

export function subscribeToReceiptSettings(onData: (settings: any) => void) {
  const settingsDocRef = doc(db, "settings", "receipt");
  return onSnapshot(
    settingsDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onData(docSnap.data());
      }
    },
    (error) => {
      console.error("Firestore settings subscribe error:", error);
    }
  );
}

// Write / Mutate operations
export async function syncProductToFirestore(action: "UPSERT" | "DELETE", product: any) {
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
}

export async function syncCategoryToFirestore(action: "UPSERT" | "DELETE", category: { name: string }) {
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
}

export async function syncOrderToFirestore(action: "UPSERT" | "DELETE", order: any) {
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
}

export async function syncExpenseToFirestore(action: "UPSERT" | "DELETE", expense: any) {
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
}

export async function syncPreOrderToFirestore(action: "UPSERT" | "DELETE", preOrder: any) {
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
}

export async function syncReceiptSettingsToFirestore(settings: any) {
  const ref = doc(db, "settings", "receipt");
  await setDoc(ref, {
    ...settings,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
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
