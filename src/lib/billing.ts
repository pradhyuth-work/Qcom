import db from "./db";
import { getItemByCode } from "./items";
import { postLedgerLines } from "./stock";

export type OpenPoWithLines = {
  po_no: string;
  po_date: string | null;
  del_location: string | null;
  po_amount: number | null;
  lines: {
    item_code: string;
    tally_name: string;
    sku_desc: string | null;
    qty_ordered: number;
    unit_base_cost: number | null;
  }[];
};

export function getOpenPOsWithLines(customerId: number): OpenPoWithLines[] {
  const pos = db
    .prepare(
      `SELECT po_no, po_date, del_location, po_amount FROM purchase_orders
       WHERE customer_id = ? AND status = 'PENDING' ORDER BY po_date`
    )
    .all(customerId) as OpenPoWithLines[];
  return pos.map((po) => ({
    ...po,
    lines: db
      .prepare(
        `SELECT pl.item_code, i.tally_name, pl.sku_desc, pl.qty_ordered, pl.unit_base_cost
         FROM po_lines pl JOIN items i ON i.item_code = pl.item_code
         WHERE pl.po_no = ? ORDER BY i.tally_name`
      )
      .all(po.po_no) as OpenPoWithLines["lines"],
  }));
}

export type BillingLineInput = { itemCode: string; qtyBilled: number };

/**
 * Policy: a PO closes the moment it's billed, partial or full, for any reason -- a shortfall
 * becomes demand for a future order, never a debt tracked against this PO (see CLAUDE.md
 * Standing Policy 2).
 */
export function commitBilling(
  customerId: number,
  poNo: string,
  invoiceNo: string,
  invoiceDate: string,
  lines: BillingLineInput[],
  invoiceAmount: number,
  notes?: string
) {
  const po = db.prepare(`SELECT * FROM purchase_orders WHERE po_no = ? AND customer_id = ?`).get(poNo, customerId) as
    | { status: string; notes: string | null }
    | undefined;
  if (!po) throw new Error(`PO ${poNo} not found`);
  if (po.status === "CLOSED") throw new Error(`PO ${poNo} is already closed`);

  const ledgerLines = lines
    .filter((l) => l.qtyBilled > 0)
    .map((l) => ({
      date: invoiceDate,
      eventType: "ZEPTO DISPATCH/SALE",
      reference: invoiceNo,
      itemCode: l.itemCode,
      qtySigned: -Math.abs(l.qtyBilled),
      notes: `Billed against PO ${poNo}.`,
    }));

  const updateLine = db.prepare(`UPDATE po_lines SET qty_billed = ? WHERE po_no = ? AND item_code = ?`);
  const updatePo = db.prepare(
    `UPDATE purchase_orders SET status = 'CLOSED', billing_invoice = ?, billing_date = ?, notes = ? WHERE po_no = ?`
  );
  const insertAr = db.prepare(
    `INSERT INTO ar_ledger (customer_id, date, invoice_no, narration, debit, balance, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertOutstanding = db.prepare(
    `INSERT INTO outstanding (customer_id, invoice_number, invoice_amount, date_of_invoice) VALUES (?, ?, ?, ?)`
  );
  const insertSales = db.prepare(
    `INSERT INTO sales_tracker (customer_id, sku_name, po_number, invoice_no, invoice_date, po_qty, billed_qty, fill_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    postLedgerLines(ledgerLines);

    const polines = db.prepare(`SELECT item_code, qty_ordered FROM po_lines WHERE po_no = ?`).all(poNo) as {
      item_code: string;
      qty_ordered: number;
    }[];
    const billedByCode = new Map(lines.map((l) => [l.itemCode, l.qtyBilled]));
    for (const pl of polines) {
      const billed = billedByCode.get(pl.item_code) ?? 0;
      updateLine.run(billed, poNo, pl.item_code);
      const item = getItemByCode(pl.item_code)!;
      const fillRate = pl.qty_ordered > 0 ? Math.round((billed / pl.qty_ordered) * 1000) / 10 : 0;
      insertSales.run(customerId, item.tally_name, poNo, invoiceNo, invoiceDate, pl.qty_ordered, billed, `${fillRate}%`);
    }

    const lastBalRow = db
      .prepare(`SELECT balance FROM ar_ledger WHERE customer_id = ? ORDER BY id DESC LIMIT 1`)
      .get(customerId) as { balance: number } | undefined;
    const newBalance = (lastBalRow?.balance ?? 0) + invoiceAmount;
    insertAr.run(customerId, invoiceDate, invoiceNo, `ZEPTO DISPATCH/SALE against PO ${poNo}`, invoiceAmount, newBalance, notes ?? null);
    insertOutstanding.run(customerId, invoiceNo, invoiceAmount, invoiceDate);
    updatePo.run(invoiceNo, invoiceDate, notes ?? po.notes, poNo);
  });
  tx();
}
