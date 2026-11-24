import db from "./db";

export type OutstandingInvoice = {
  id: number;
  invoice_number: string;
  invoice_amount: number;
  date_of_invoice: string | null;
};

export function getOutstanding(customerId: number): OutstandingInvoice[] {
  return db
    .prepare(
      `SELECT id, invoice_number, invoice_amount, date_of_invoice FROM outstanding
       WHERE customer_id = ? ORDER BY date_of_invoice`
    )
    .all(customerId) as OutstandingInvoice[];
}

/**
 * Posts a payment against one outstanding invoice. A payment that (with TDS) covers the
 * invoice removes it from Outstanding entirely -- paid invoices are removed, not marked paid
 * (see CLAUDE.md, Varasidhi Outstanding Karnataka.xlsx). A partial payment reduces the
 * remaining outstanding amount instead.
 */
export function postPayment(
  customerId: number,
  invoiceNumber: string,
  amount: number,
  tds: number,
  date: string,
  reference?: string
) {
  const inv = db
    .prepare(`SELECT * FROM outstanding WHERE customer_id = ? AND invoice_number = ?`)
    .get(customerId, invoiceNumber) as { id: number; invoice_amount: number } | undefined;
  if (!inv) throw new Error(`Invoice ${invoiceNumber} not found in outstanding`);

  const fullyPaid = amount + tds >= inv.invoice_amount - 0.5;

  const tx = db.transaction(() => {
    const lastBalRow = db
      .prepare(`SELECT balance FROM ar_ledger WHERE customer_id = ? ORDER BY id DESC LIMIT 1`)
      .get(customerId) as { balance: number } | undefined;
    const newBalance = (lastBalRow?.balance ?? 0) - amount - tds;
    db.prepare(
      `INSERT INTO ar_ledger (customer_id, date, invoice_no, narration, credit, tds, balance, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(customerId, date, invoiceNumber, `PAYMENT against invoice ${invoiceNumber}`, amount, tds || null, newBalance, reference ?? null);

    if (fullyPaid) {
      db.prepare(`DELETE FROM outstanding WHERE id = ?`).run(inv.id);
    } else {
      db.prepare(`UPDATE outstanding SET invoice_amount = ? WHERE id = ?`).run(inv.invoice_amount - (amount + tds), inv.id);
    }
  });
  tx();
  return { fullyPaid };
}
