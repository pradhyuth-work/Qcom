import db from "./db";

export function getStockLedgerInRange(start: string, end: string) {
  return db
    .prepare(
      `SELECT sl.date, sl.event_type, sl.reference, sl.item_code, i.tally_name, sl.qty_signed, sl.notes
       FROM stock_ledger sl JOIN items i ON i.item_code = sl.item_code
       WHERE sl.date BETWEEN ? AND ?
       ORDER BY i.tally_name, sl.date`
    )
    .all(start, end);
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
