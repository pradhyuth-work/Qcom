import ExcelJS from "exceljs";
import path from "path";
import db, { SCHEMA } from "../src/lib/db";

const ROOT = path.join(process.cwd(), "..");
const PO_TALLY = path.join(ROOT, "PO TALLY.xlsx");
const ZEPTO_LEDGER = path.join(ROOT, "Zepto ledger MT.xlsx");
const OUTSTANDING = path.join(ROOT, "Varasidhi Outstanding Karnataka.xlsx");

async function main() {
  db.exec(`
    DROP TABLE IF EXISTS item_customer_codes; DROP TABLE IF EXISTS locations; DROP TABLE IF EXISTS customers;
    DROP TABLE IF EXISTS items; DROP TABLE IF EXISTS stock_on_hand; DROP TABLE IF EXISTS stock_ledger;
    DROP TABLE IF EXISTS purchase_orders; DROP TABLE IF EXISTS po_lines; DROP TABLE IF EXISTS gpi_orders;
    DROP TABLE IF EXISTS gpi_order_lines; DROP TABLE IF EXISTS ar_ledger; DROP TABLE IF EXISTS outstanding;
    DROP TABLE IF EXISTS sales_tracker; DROP TABLE IF EXISTS meta;
  `);
  db.exec(SCHEMA);

  // qcom is built customer-agnostic; Zepto is just the first one configured.
  const zeptoId = Number(
    db.prepare(`INSERT INTO customers (name, po_csv_format) VALUES ('Zepto', 'zepto')`).run().lastInsertRowid
  );

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(PO_TALLY);

  const mToPacks = wb.worksheets.find((w) => w.name === "M TO PACKS LOGIC")!;
  const skuMapping = wb.worksheets.find((w) => w.name === "SKU MAPPING")!;
  const stockOnHand = wb.worksheets.find((w) => w.name === "STOCK ON HAND")!;
  const pricing = wb.worksheets.find((w) => w.name === "PRICING")!;

  // Keyed by item code (via TALLY ROW = item number + 1), NOT by tally name --
  // several pairs of items (10-pack vs 20-pack variants) share the same tally name
  // (FUSE, LIGHTS, RED, ADVANCE), so a name-keyed lookup silently collides and picks
  // whichever row happens to be read last. Confirmed TALLY ROW 2..37 = IT01..IT36.
  const sticksByItemCode: Record<string, number> = {};
  mToPacks.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const tallyRow = Number(row.getCell(1).value);
    const sticks = Number(row.getCell(3).value);
    if (!tallyRow || !sticks) return;
    const itemNum = tallyRow - 1;
    const itemCode = "IT" + String(itemNum).padStart(2, "0");
    sticksByItemCode[itemCode] = sticks;
  });

  type ItemMeta = { tallyName: string; brandCode: string; skuDesc: string };
  const itemMeta: Record<string, ItemMeta> = {};
  skuMapping.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const code = String(row.getCell(1).text || "").trim();
    const name = String(row.getCell(2).text || "").trim();
    const skuDesc = String(row.getCell(3).text || "").trim();
    const brandCode = String(row.getCell(4).text || "").trim();
    if (code) itemMeta[code] = { tallyName: name, brandCode, skuDesc };
  });

  const priceByCode: Record<string, { cost: number; source: string; date: string }> = {};
  pricing.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const code = String(row.getCell(1).text || "").trim();
    const cost = Number(row.getCell(3).value);
    const source = String(row.getCell(4).text || "").trim();
    const date = String(row.getCell(5).text || "").trim();
    if (code && !isNaN(cost)) priceByCode[code] = { cost, source, date };
  });

  const stockByCode: Record<string, number> = {};
  stockOnHand.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const code = String(row.getCell(3).text || "").trim();
    const qty = Number(row.getCell(2).value);
    if (code) stockByCode[code] = isNaN(qty) ? 0 : qty;
  });

  const insertItem = db.prepare(
    `INSERT INTO items (item_code, tally_name, sticks_per_pack, unit_base_cost, pricing_source, pricing_date, tracked)
     VALUES (@item_code, @tally_name, @sticks_per_pack, @unit_base_cost, @pricing_source, @pricing_date, @tracked)`
  );
  const insertStock = db.prepare(`INSERT INTO stock_on_hand (item_code, qty_packs) VALUES (?, ?)`);
  const insertCustomerCode = db.prepare(
    `INSERT INTO item_customer_codes (item_code, customer_id, sku_desc, brand_code) VALUES (?, ?, ?, ?)`
  );

  let itemCount = 0;
  const insertAll = db.transaction(() => {
    for (const code of Object.keys(itemMeta)) {
      const meta = itemMeta[code];
      const sticks = sticksByItemCode[code] ?? 20;
      const price = priceByCode[code];
      const qty = stockByCode[code] ?? 0;
      const tracked = qty > 0 || price ? 1 : 0;
      insertItem.run({
        item_code: code,
        tally_name: meta.tallyName,
        sticks_per_pack: sticks,
        unit_base_cost: price?.cost ?? null,
        pricing_source: price?.source ?? null,
        pricing_date: price?.date ?? null,
        tracked,
      });
      insertStock.run(code, qty);
      if (meta.skuDesc.trim()) {
        insertCustomerCode.run(code, zeptoId, meta.skuDesc.trim(), meta.brandCode || null);
      }
      itemCount++;
    }
  });
  insertAll();
  console.log(`Seeded ${itemCount} items (customer: Zepto) with stock + pricing + SKU codes.`);

  const wbZepto = new ExcelJS.Workbook();
  await wbZepto.xlsx.readFile(ZEPTO_LEDGER);
  const zSheet = wbZepto.worksheets[0];
  let lastBalance = 0;
  let lastDate = "";
  zSheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const bal = Number(row.getCell(7).value);
    const dt = String(row.getCell(1).text || "");
    if (!isNaN(bal) && bal !== 0) {
      lastBalance = bal;
      lastDate = dt;
    }
  });
  db.prepare(
    `INSERT INTO ar_ledger (customer_id, date, invoice_no, narration, credit, tds, debit, balance, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    zeptoId,
    lastDate || new Date().toISOString().slice(0, 10),
    "OPENING",
    "OPENING BALANCE",
    null,
    null,
    null,
    lastBalance,
    "Imported opening balance from Zepto ledger MT.xlsx at time of qcom migration."
  );
  console.log(`AR ledger (Zepto) opening balance: ${lastBalance} (as of ${lastDate})`);

  const wbOut = new ExcelJS.Workbook();
  await wbOut.xlsx.readFile(OUTSTANDING);
  const outSheet = wbOut.worksheets.find((w) => w.name.trim() === "Base File")!;
  let outTotal = 0;
  const outRows: { invNo: string; amt: number; date: string }[] = [];
  outSheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const invNo = String(row.getCell(7).text || "").trim();
    const amt = Number(row.getCell(8).value);
    const dt = String(row.getCell(9).text || "");
    if (invNo === "Zepto Outstanding") {
      outTotal = amt;
    } else if (invNo && !isNaN(amt)) {
      outRows.push({ invNo, amt, date: dt });
    }
  });
  const insertOutstanding = db.prepare(
    `INSERT INTO outstanding (customer_id, invoice_number, invoice_amount, date_of_invoice) VALUES (?, ?, ?, ?)`
  );
  const insertOutAll = db.transaction(() => {
    for (const r of outRows) insertOutstanding.run(zeptoId, r.invNo, r.amt, r.date);
  });
  insertOutAll();
  console.log(`Outstanding (Zepto): ${outRows.length} invoices imported, total on file: ${outTotal}`);

  db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?)`).run("seeded_at", new Date().toISOString());
  db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?)`).run(
    "source_note",
    "Seeded from current PO TALLY.xlsx / Zepto ledger MT.xlsx / Varasidhi Outstanding Karnataka.xlsx state, all tagged to the Zepto customer. qcom's schema supports additional customers (new row in `customers`, their own PO CSV parser, their own item_customer_codes) without a schema change. Full historical ledger rows were NOT replayed -- those Excel files remain the historical record; qcom starts from current balances going forward."
  );

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
