import db from "../src/lib/db";

const rows = db
  .prepare(
    `SELECT pl.item_code, SUM(pl.qty_ordered) as total
     FROM po_lines pl JOIN purchase_orders po ON po.po_no = pl.po_no
     WHERE po.status = 'PENDING'
     GROUP BY pl.item_code`
  )
  .all() as { item_code: string; total: number }[];

const openPos = db.prepare(`SELECT po_no, po_date, del_location, po_amount FROM purchase_orders WHERE status = 'PENDING' ORDER BY po_no`).all();
console.log("OPEN_POS:", JSON.stringify(openPos, null, 2));
console.log("DEMAND:", JSON.stringify(rows, null, 2));
