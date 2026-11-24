import ExcelJS from "exceljs";
import path from "path";

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(process.cwd(), "..", "PO TALLY.xlsx"));
  const ws = wb.worksheets.find((w) => w.name === "M TO PACKS LOGIC")!;
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    console.log(rowNum, row.getCell(1).value, row.getCell(2).text, row.getCell(3).value);
  });
}
main();
