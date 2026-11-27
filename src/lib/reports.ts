import db from "./db";
import { getDefaultCustomer } from "./customers";

export function getStockLedgerInRange(start: string, end: string, customerId?: number) {
  const cid = customerId ?? getDefaultCustomer().id;
  return db
    .prepare(
      `SELECT sl.date, sl.event_type, sl.reference, sl.item_code,
              COALESCE(icc.sku_desc, i.tally_name) as display_name, sl.qty_signed, sl.notes
       FROM stock_ledger sl
       JOIN items i ON i.item_code = sl.item_code
       LEFT JOIN item_customer_codes icc ON icc.item_code = i.item_code AND icc.customer_id = ?
       WHERE sl.date BETWEEN ? AND ?
       ORDER BY display_name, sl.date`
    )
    .all(cid, start, end);
}

/** Pivot sorted A->Z by SKU name -- matches the standing pivot-report convention. */
export function getSalesPivot(customerId: number, start: string, end: string) {
  return db
    .prepare(
      `SELECT sku_name, SUM(po_qty) as total_po_qty, SUM(billed_qty) as total_billed_qty, COUNT(*) as invoice_count
       FROM sales_tracker
       WHERE customer_id = ? AND invoice_date BETWEEN ? AND ?
       GROUP BY sku_name ORDER BY sku_name`
    )
    .all(customerId, start, end);
}

/** PO-wise pivot data, grouped by location then by PO -- matches the standing pivot-report format. */
export function getPivotReportData(customerId: number) {
  const pos = db
    .prepare(
      `SELECT po_no, po_date, del_location, po_amount FROM purchase_orders
       WHERE customer_id = ? AND status = 'PENDING' ORDER BY po_date`
    )
    .all(customerId) as { po_no: string; po_date: string | null; del_location: string | null; po_amount: number | null }[];

  const withLines = pos.map((po) => {
    const lines = db
      .prepare(
        `SELECT pl.item_code, COALESCE(pl.sku_desc, i.tally_name) as display_name, pl.qty_ordered, pl.unit_base_cost
         FROM po_lines pl JOIN items i ON i.item_code = pl.item_code
         WHERE pl.po_no = ? ORDER BY display_name`
      )
      .all(po.po_no) as { item_code: string; display_name: string; qty_ordered: number; unit_base_cost: number | null }[];
    const total_qty = lines.reduce((s, l) => s + l.qty_ordered, 0);
    const total_amount = Math.round(lines.reduce((s, l) => s + l.qty_ordered * (l.unit_base_cost ?? 0), 0) * 100) / 100;
    return { ...po, lines, total_qty, total_amount };
  });

  const byLocation = new Map<string, typeof withLines>();
  for (const po of withLines) {
    const loc = /nelamangala/i.test(po.del_location ?? "") ? "Nelamangala" : /sumadhura/i.test(po.del_location ?? "") ? "Sumadhura" : "Other";
    if (!byLocation.has(loc)) byLocation.set(loc, []);
    byLocation.get(loc)!.push(po);
  }
  return [...byLocation.entries()].map(([location, pos]) => ({ location, pos }));
}

/** One row per SKU across all open POs: current stock vs demand per location vs what's left. */
export function getStockCoverage(customerId: number) {
  const rows = db
    .prepare(
      `SELECT i.item_code, COALESCE(icc.sku_desc, i.tally_name) as display_name,
              s.qty_packs as current_stock, po.del_location, pl.qty_ordered
       FROM po_lines pl
       JOIN purchase_orders po ON po.po_no = pl.po_no
       JOIN items i ON i.item_code = pl.item_code
       JOIN stock_on_hand s ON s.item_code = i.item_code
       LEFT JOIN item_customer_codes icc ON icc.item_code = i.item_code AND icc.customer_id = ?
       WHERE po.status = 'PENDING' AND po.customer_id = ?`
    )
    .all(customerId, customerId) as {
    item_code: string;
    display_name: string;
    current_stock: number;
    del_location: string | null;
    qty_ordered: number;
  }[];

  const byItem = new Map<string, { display_name: string; current_stock: number; sumadhura: number; nelamangala: number }>();
  for (const r of rows) {
    if (!byItem.has(r.item_code)) {
      byItem.set(r.item_code, { display_name: r.display_name, current_stock: r.current_stock, sumadhura: 0, nelamangala: 0 });
    }
    const entry = byItem.get(r.item_code)!;
    if (/sumadhura/i.test(r.del_location ?? "")) entry.sumadhura += r.qty_ordered;
    else if (/nelamangala/i.test(r.del_location ?? "")) entry.nelamangala += r.qty_ordered;
  }

  const result = [...byItem.values()].map((v) => ({
    sku: v.display_name,
    current_stock: v.current_stock,
    sumadhura: v.sumadhura,
    nelamangala: v.nelamangala,
    left_after: v.current_stock - v.sumadhura - v.nelamangala,
  }));
  result.sort((a, b) => a.sku.localeCompare(b.sku));
  return result;
}

export function getAgingReport(customerId: number) {
  const rows = db
    .prepare(`SELECT invoice_number, invoice_amount, date_of_invoice FROM outstanding WHERE customer_id = ?`)
    .all(customerId) as { invoice_number: string; invoice_amount: number; date_of_invoice: string | null }[];
  const today = new Date();
  return rows
    .map((r) => {
      const days = r.date_of_invoice ? Math.floor((today.getTime() - new Date(r.date_of_invoice).getTime()) / 86400000) : null;
      const bracket =
        days === null ? "Unknown" : days <= 7 ? "0-7" : days <= 15 ? "8-15" : days <= 30 ? "16-30" : days <= 45 ? "31-45" : "45+";
      return { ...r, days_outstanding: days, bracket };
    })
    .sort((a, b) => a.invoice_number.localeCompare(b.invoice_number));
}
