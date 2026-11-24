import db from "./db";

export type Customer = { id: number; name: string; po_csv_format: string };

export function getAllCustomers(): Customer[] {
  return db.prepare(`SELECT * FROM customers ORDER BY name`).all() as Customer[];
}

export function getCustomerByName(name: string): Customer | undefined {
  return db.prepare(`SELECT * FROM customers WHERE name = ?`).get(name) as Customer | undefined;
}

export function getCustomerById(id: number): Customer | undefined {
  return db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id) as Customer | undefined;
}

/** Until the UI has a customer switcher, routes fall back to the first configured customer (Zepto). */
export function getDefaultCustomer(): Customer {
  const c = db.prepare(`SELECT * FROM customers ORDER BY id LIMIT 1`).get() as Customer | undefined;
  if (!c) throw new Error("No customers configured — run the seed script.");
  return c;
}

export function getOrCreateLocation(customerId: number, rawDelLocation: string): number {
  const name = normalizeLocationName(rawDelLocation);
  const existing = db
    .prepare(`SELECT id FROM locations WHERE customer_id = ? AND name = ?`)
    .get(customerId, name) as { id: number } | undefined;
  if (existing) return existing.id;
  const info = db
    .prepare(`INSERT INTO locations (customer_id, name, raw_del_location) VALUES (?, ?, ?)`)
    .run(customerId, name, rawDelLocation);
  return Number(info.lastInsertRowid);
}

function normalizeLocationName(raw: string): string {
  const loc = raw.toLowerCase();
  if (loc.includes("nelamangala")) return "Nelamangala";
  if (loc.includes("sumadhura")) return "Sumadhura";
  return raw.trim() || "Unspecified";
}
