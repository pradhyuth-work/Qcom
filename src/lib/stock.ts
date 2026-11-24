import db from "./db";

export function currentStock(itemCode: string): number {
  const row = db
    .prepare(`SELECT qty_packs FROM stock_on_hand WHERE item_code = ?`)
    .get(itemCode) as { qty_packs: number } | undefined;
  return row?.qty_packs ?? 0;
}

/** Posts one or more stock ledger lines atomically and updates stock_on_hand. */
export function postLedgerLines(
  lines: { date: string; eventType: string; reference: string; itemCode: string; qtySigned: number; notes?: string }[]
) {
  const insertLedger = db.prepare(
    `INSERT INTO stock_ledger (date, event_type, reference, item_code, qty_signed, notes) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const upsertStock = db.prepare(
    `INSERT INTO stock_on_hand (item_code, qty_packs) VALUES (?, ?)
     ON CONFLICT(item_code) DO UPDATE SET qty_packs = qty_packs + excluded.qty_packs`
  );
  const tx = db.transaction(() => {
    for (const line of lines) {
      insertLedger.run(line.date, line.eventType, line.reference, line.itemCode, line.qtySigned, line.notes ?? null);
      upsertStock.run(line.itemCode, line.qtySigned);
    }
  });
  tx();
}

export function getLedgerHistory(itemCode?: string, limit = 200) {
  if (itemCode) {
    return db
      .prepare(`SELECT * FROM stock_ledger WHERE item_code = ? ORDER BY id DESC LIMIT ?`)
      .all(itemCode, limit);
  }
  return db.prepare(`SELECT * FROM stock_ledger ORDER BY id DESC LIMIT ?`).all(limit);
}
