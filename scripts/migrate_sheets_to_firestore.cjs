const { initializeApp } = require('firebase/app');
const { getFirestore, doc, writeBatch } = require('firebase/firestore');
const fs = require('fs');

const config = require('../firebase-applet-config.json');
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function migrate() {
  console.log("Starting migration from sheets_backup.json to Firestore...");
  const raw = fs.readFileSync('sheets_backup.json', 'utf8');
  const data = JSON.parse(raw);

  const categories = data.CATEGORY || [];
  const products = data.PRODUCT || [];
  const orders = data.ORDER || [];
  const expenses = data.EXPENSE || [];
  const preOrders = data.PRE_ORDER || [];

  console.log(`Found: ${categories.length} categories, ${products.length} products, ${orders.length} orders, ${expenses.length} expenses, ${preOrders.length} pre-orders.`);

  // 1. Migrate Categories
  if (categories.length > 0) {
    const catBatch = writeBatch(db);
    categories.forEach((cat) => {
      const name = cat.name || cat.id;
      if (!name) return;
      const safeId = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      const ref = doc(db, 'categories', safeId);
      catBatch.set(ref, {
        name,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
    await catBatch.commit();
    console.log(`Migrated ${categories.length} categories.`);
  }

  // 2. Migrate Products
  if (products.length > 0) {
    for (let i = 0; i < products.length; i += 400) {
      const chunk = products.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((p) => {
        const id = String(p.id || p.name);
        const ref = doc(db, 'products', id);
        batch.set(ref, {
          id,
          name: p.name || "",
          category: p.category || "General",
          price: Number(p.price) || 0,
          cogs: Number(p.cogs) || 0,
          imageColor: p.imageColor || "bg-pink-100 text-pink-800",
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
      await batch.commit();
      console.log(`Migrated product chunk ${i} to ${i + chunk.length}`);
    }
  }

  // 3. Migrate Orders
  if (orders.length > 0) {
    console.log(`Migrating ${orders.length} orders in batches of 350...`);
    for (let i = 0; i < orders.length; i += 350) {
      const chunk = orders.slice(i, i + 350);
      const batch = writeBatch(db);
      chunk.forEach((o, idx) => {
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
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
      await batch.commit();
      console.log(`Migrated order batch ${i} to ${i + chunk.length}`);
    }
  }

  // 4. Migrate Expenses
  if (expenses.length > 0) {
    const expBatch = writeBatch(db);
    expenses.forEach((e, idx) => {
      const expId = String(e.id || `EXP-${idx}`);
      const ref = doc(db, 'expenses', expId);
      expBatch.set(ref, {
        ...e,
        id: expId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
    await expBatch.commit();
    console.log(`Migrated ${expenses.length} expenses.`);
  }

  // 5. Migrate Pre-orders
  if (preOrders.length > 0) {
    const poBatch = writeBatch(db);
    preOrders.forEach((po, idx) => {
      const poId = String(po.id || `PO-${idx}`);
      const ref = doc(db, 'preOrders', poId);
      poBatch.set(ref, {
        ...po,
        id: poId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
    await poBatch.commit();
    console.log(`Migrated ${preOrders.length} pre-orders.`);
  }

  console.log("MIGRATION COMPLETED SUCCESSFULLY!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
