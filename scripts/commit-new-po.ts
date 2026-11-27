import fs from "fs";
import { parseZeptoPoCsv, commitPoImport } from "../src/lib/po-import";
import { getDefaultCustomer } from "../src/lib/customers";

const csvPath = "C:\\Users\\gspra\\Downloads\\PO_8c30eeb63712b314.csv";
const text = fs.readFileSync(csvPath, "utf-8");
const lines = parseZeptoPoCsv(text);
const customer = getDefaultCustomer();
const newPos = ["P6375143", "P6375468", "P6390520", "P6406634"];
const created = commitPoImport(customer.id, lines, newPos);
console.log(`Committed ${created} new PO(s).`);
