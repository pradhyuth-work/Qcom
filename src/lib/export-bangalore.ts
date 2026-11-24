import ExcelJS from "exceljs";
import path from "path";
import db from "./db";
import { getGpiOrder } from "./orders";
import { getDefaultCustomer } from "./customers";

const TEMPLATE_PATH = path.join(process.cwd(), "..", "BANGALORE MT DISPATCH ORDER FORMAT ALL WDs.xlsx");

export async function buildBangaloreExport(orderId: number): Promise<Buffer> {
  const { lines } = getGpiOrder(orderId) as {
    lines: { item_code: string; qty_m: number }[];
  };
  // Brand codes for the Bangalore export are GPI's own, which this template already keys off of --
  // resolved via the default customer's item_customer_codes for now (GPI brand codes don't vary by customer).
  const customer = getDefaultCustomer();
  const brandCodeByItem = new Map(
    (
      db
        .prepare(`SELECT item_code, brand_code FROM item_customer_codes WHERE customer_id = ?`)
        .all(customer.id) as { item_code: string; brand_code: string }[]
    ).map((r) => [r.item_code, r.brand_code])
  );
  const byBrandCode = new Map(
    lines.filter((l) => brandCodeByItem.has(l.item_code)).map((l) => [brandCodeByItem.get(l.item_code)!, l.qty_m])
  );

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);
  const ws = wb.worksheets[0];

  let written = 0;
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const brandCode = String(row.getCell(3).text || "").trim();
    if (byBrandCode.has(brandCode)) {
      row.getCell(8).value = byBrandCode.get(brandCode);
      written++;
    } else {
      row.getCell(8).value = 0;
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  console.log(`Bangalore export: wrote ${written}/${lines.length} order lines`);
  return Buffer.from(buf);
}
