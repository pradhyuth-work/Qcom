import fs from "fs";
import { parseZeptoPoCsv, previewPoImport } from "../src/lib/po-import";
import { getDefaultCustomer } from "../src/lib/customers";

const csvPath = "C:\\Users\\gspra\\Downloads\\PO_8c30eeb63712b314.csv";
const text = fs.readFileSync(csvPath, "utf-8");
const lines = parseZeptoPoCsv(text);
const customer = getDefaultCustomer();
const preview = previewPoImport(customer.id, lines);
for (const p of preview) {
  console.log(`${p.poNo}: ${p.action} (${p.lineCount} lines)`);
  if (p.diff) {
    for (const d of p.diff) console.log(`   DIFF ${d.itemCode} ${d.displayName}: ${d.existingQty} -> ${d.newQty}`);
  }
  if (p.unmatchedSkus && p.unmatchedSkus.length) {
    console.log(`   UNMATCHED: ${p.unmatchedSkus.join("; ")}`);
  }
}
