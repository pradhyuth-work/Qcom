import db from "../src/lib/db";

const pos = db.prepare(`SELECT po_no, del_location FROM purchase_orders WHERE status = 'PENDING' ORDER BY po_no`).all() as {
  po_no: string;
  del_location: string;
}[];

const out: Record<string, { location: string; lines: { skuDesc: string; itemCode: string; qty: number; unitPrice: number | null }[] }> = {};
for (const po of pos) {
  const lines = db
    .prepare(
      `SELECT pl.sku_desc, pl.item_code, pl.qty_ordered, i.unit_base_cost
       FROM po_lines pl JOIN items i ON i.item_code = pl.item_code
       WHERE pl.po_no = ?`
    )
    .all(po.po_no) as { sku_desc: string; item_code: string; qty_ordered: number; unit_base_cost: number | null }[];
  out[po.po_no] = {
    location: po.del_location,
    lines: lines.map((l) => ({ skuDesc: l.sku_desc, itemCode: l.item_code, qty: l.qty_ordered, unitPrice: l.unit_base_cost })),
  };
}

console.log(JSON.stringify(out, null, 2));
