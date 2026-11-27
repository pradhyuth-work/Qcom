import db from "./db";
import { getDefaultCustomer } from "./customers";

export type Item = {
  item_code: string;
  tally_name: string;
  display_name: string;
  sticks_per_pack: number;
  unit_base_cost: number | null;
  pricing_source: string | null;
  pricing_date: string | null;
  tracked: number;
};

export type StockRow = Item & { qty_packs: number; qty_m: number };

/** `display_name` is the customer's own SKU description text -- shown everywhere in the UI
 * instead of the internal `tally_name` shorthand, falling back to `tally_name` only when a
 * customer hasn't been mapped to this item (untracked/legacy codes). */
export function getAllItems(customerId?: number): Item[] {
  const cid = customerId ?? getDefaultCustomer().id;
  return db
    .prepare(
      `SELECT i.*, COALESCE(icc.sku_desc, i.tally_name) as display_name
       FROM items i
       LEFT JOIN item_customer_codes icc ON icc.item_code = i.item_code AND icc.customer_id = ?
       ORDER BY display_name`
    )
    .all(cid) as Item[];
}

export function getStockRows(customerId?: number): StockRow[] {
  const cid = customerId ?? getDefaultCustomer().id;
  const rows = db
    .prepare(
      `SELECT i.*, s.qty_packs, COALESCE(icc.sku_desc, i.tally_name) as display_name
       FROM items i
       JOIN stock_on_hand s ON s.item_code = i.item_code
       LEFT JOIN item_customer_codes icc ON icc.item_code = i.item_code AND icc.customer_id = ?
       ORDER BY display_name`
    )
    .all(cid) as (Item & { qty_packs: number })[];
  return rows.map((r) => ({ ...r, qty_m: round2((r.qty_packs * r.sticks_per_pack) / 1000) }));
}

export function getItemByCode(code: string, customerId?: number): Item | undefined {
  const cid = customerId ?? getDefaultCustomer().id;
  return db
    .prepare(
      `SELECT i.*, COALESCE(icc.sku_desc, i.tally_name) as display_name
       FROM items i
       LEFT JOIN item_customer_codes icc ON icc.item_code = i.item_code AND icc.customer_id = ?
       WHERE i.item_code = ?`
    )
    .get(cid, code) as Item | undefined;
}

/**
 * A physical item can have a different SKU description per customer (Zepto, Blinkit, etc).
 * A couple of SKU descriptions are shared between a real, actively-priced item and an
 * untracked legacy code in the source catalog that happens to carry stale leftover stock
 * (e.g. IT05 "VISTA" vs IT16 "DOUBLE FUSION" both map to the same Zepto SKU Desc text).
 * `tracked` alone isn't a reliable tiebreak -- a legacy code can look "tracked" just because
 * it has nonzero stock. Prefer whichever match actually has pricing data (the real, currently
 * ordered SKU), then fall back to `tracked`.
 */
export function findItemByCustomerSkuDesc(customerId: number, skuDesc: string): Item | undefined {
  return db
    .prepare(
      `SELECT i.*, icc.sku_desc as display_name FROM items i
       JOIN item_customer_codes icc ON icc.item_code = i.item_code
       WHERE icc.customer_id = ? AND icc.sku_desc = ? COLLATE NOCASE
       ORDER BY (i.unit_base_cost IS NOT NULL) DESC, i.tracked DESC LIMIT 1`
    )
    .get(customerId, skuDesc.trim()) as Item | undefined;
}

export function getCustomerSkuDesc(itemCode: string, customerId: number): string | undefined {
  const row = db
    .prepare(`SELECT sku_desc FROM item_customer_codes WHERE item_code = ? AND customer_id = ?`)
    .get(itemCode, customerId) as { sku_desc: string } | undefined;
  return row?.sku_desc;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function packsToM(code: string, packs: number): number {
  const item = getItemByCode(code);
  if (!item) return 0;
  return round2((packs * item.sticks_per_pack) / 1000);
}

export function roundToNearest(qty: number, step: number): number {
  return Math.round(qty / step) * step;
}
