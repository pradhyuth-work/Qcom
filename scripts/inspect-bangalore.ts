import ExcelJS from "exceljs";
import path from "path";

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(process.cwd(), "..", "BANGALORE MT DISPATCH ORDER FORMAT ALL WDs.xlsx"));
  const ws = wb.worksheets[0];
  console.log("Sheet:", ws.name, "rows:", ws.rowCount, "cols:", ws.columnCount);
  for (let r = 1; r <= 3; r++) {
    const row = ws.getRow(r);
    const vals: string[] = [];
    for (let c = 1; c <= 10; c++) vals.push(`[${c}]=${row.getCell(c).text}`);
    console.log(`Row ${r}:`, vals.join(" | "));
  }
}
main();
