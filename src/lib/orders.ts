import db from "./db";
import { getAllItems, packsToM, roundToNearest } from "./items";

export type OpenPO = {
  po_no: string;
  customer_id: number;
  po_date: string | null;
  del_location: string | null;
  status: string;
};

export function getOpenPOs(customerId?: number): OpenPO[] {
  if (customerId) {
    return db
      .prepare(`SELECT * FROM purchase_orders WHERE status = 'PENDING' AND customer_id = ? ORDER BY po_date`)
      .all(customerId) as OpenPO[];
  }
  return db
    .prepare(`SELECT * FROM purchase_orders WHERE status = 'PENDING' ORDER BY po_date`)
    .all() as OpenPO[];
}

/** Combined demand across all open POs (any customer), per item code (in packs). */
export function combinedOpenDemand(): Record<string, number> {
  const rows = db
    .prepare(
      `SELECT pl.item_code, SUM(pl.qty_ordered) as total
       FROM po_lines pl
       JOIN purchase_orders po ON po.po_no = pl.po_no
       WHERE po.status = 'PENDING'
       GROUP BY pl.item_code`
    )
    .all() as { item_code: string; total: number }[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.item_code] = r.total;
  return out;
}

export type ComputedOrderLine = {
  item_code: string;
  display_name: string;
  demand: number;
  buffer: number;
  stock: number;
  order_packs: number;
  order_m: number;
};

/**
 * Standing policy: Order Qty = max(0, combined open-PO demand + buffer − stock),
 * buffer = demand / (number of open POs across all customers), rounded to nearest 20 packs.
 */
export function computeGpiOrder(): { lines: ComputedOrderLine[]; totalM: number; openPoCount: number } {
  const openPOs = getOpenPOs();
  const openPoCount = openPOs.length || 1;
  const demand = combinedOpenDemand();
  const items = getAllItems();
  const stockRows = db.prepare(`SELECT item_code, qty_packs FROM stock_on_hand`).all() as {
    item_code: string;
    qty_packs: number;
  }[];
  const stockByCode: Record<string, number> = {};
  for (const r of stockRows) stockByCode[r.item_code] = r.qty_packs;

  const lines: ComputedOrderLine[] = [];
  let totalM = 0;
  for (const item of items) {
    if (!item.tracked) continue;
    const d = demand[item.item_code] ?? 0;
    if (d <= 0) continue;
    const buffer = d / openPoCount;
    const stock = stockByCode[item.item_code] ?? 0;
    const raw = Math.max(0, d + buffer - stock);
    const orderPacks = roundToNearest(raw, 20);
    const orderM = packsToM(item.item_code, orderPacks);
    totalM += orderM;
    lines.push({
      item_code: item.item_code,
      display_name: item.display_name,
      demand: d,
      buffer: Math.round(buffer * 100) / 100,
      stock,
      order_packs: orderPacks,
      order_m: orderM,
    });
  }
  totalM = Math.round(totalM * 100) / 100;
  return { lines, totalM, openPoCount };
}

export function placeGpiOrder(lines: ComputedOrderLine[], totalM: number, notes?: string): number {
  const insertOrder = db.prepare(
    `INSERT INTO gpi_orders (date, total_m, status, notes) VALUES (?, ?, 'PLACED', ?)`
  );
  const insertLine = db.prepare(
    `INSERT INTO gpi_order_lines (gpi_order_id, item_code, qty_packs, qty_m) VALUES (?, ?, ?, ?)`
  );
  let orderId = 0;
  const tx = db.transaction(() => {
    const today = new Date().toISOString().slice(0, 10);
    const info = insertOrder.run(today, totalM, notes ?? null);
    orderId = Number(info.lastInsertRowid);
    for (const l of lines) {
      insertLine.run(orderId, l.item_code, l.order_packs, l.order_m);
    }
  });
  tx();
  return orderId;
}

export function getGpiOrder(id: number) {
  const order = db.prepare(`SELECT * FROM gpi_orders WHERE id = ?`).get(id);
  const lines = db
    .prepare(
      `SELECT gol.*, COALESCE(icc.sku_desc, i.tally_name) as display_name
       FROM gpi_order_lines gol
       JOIN items i ON i.item_code = gol.item_code
       LEFT JOIN item_customer_codes icc ON icc.item_code = i.item_code
       WHERE gpi_order_id = ?`
    )
    .all(id);
  return { order, lines };
}

export function listGpiOrders() {
  return db.prepare(`SELECT * FROM gpi_orders ORDER BY id DESC`).all();
}
