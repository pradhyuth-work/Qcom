import { NextResponse, connection } from "next/server";
import db from "@/lib/db";
import { getStockRows } from "@/lib/items";
import { getDefaultCustomer } from "@/lib/customers";

export async function GET() {
  await connection();
  const customer = getDefaultCustomer();
  const stock = getStockRows().filter((s) => s.tracked);
  const openPOs = db
    .prepare(
      `SELECT po_no, po_date, del_location, po_amount FROM purchase_orders WHERE status = 'PENDING' ORDER BY po_date`
    )
    .all();
  const arBalance = db
    .prepare(`SELECT balance FROM ar_ledger WHERE customer_id = ? ORDER BY id DESC LIMIT 1`)
    .get(customer.id) as { balance: number } | undefined;
  const outstandingTotal = db
    .prepare(`SELECT COALESCE(SUM(invoice_amount),0) as total, COUNT(*) as cnt FROM outstanding WHERE customer_id = ?`)
    .get(customer.id) as { total: number; cnt: number };
  const lastGpiOrder = db.prepare(`SELECT * FROM gpi_orders ORDER BY id DESC LIMIT 1`).get();
  const recentLedger = db
    .prepare(
      `SELECT sl.*, COALESCE(icc.sku_desc, i.tally_name) as display_name
       FROM stock_ledger sl
       JOIN items i ON i.item_code = sl.item_code
       LEFT JOIN item_customer_codes icc ON icc.item_code = i.item_code AND icc.customer_id = ?
       ORDER BY sl.id DESC LIMIT 15`
    )
    .all(customer.id);

  const flags: string[] = [];
  for (const s of stock) {
    if (s.qty_packs < 0) flags.push(`${s.display_name}: stock negative (${s.qty_packs} packs)`);
  }

  return NextResponse.json({
    customer: customer.name,
    stock,
    openPOs,
    arBalance: arBalance?.balance ?? 0,
    outstanding: outstandingTotal,
    lastGpiOrder,
    recentLedger,
    flags,
  });
}
