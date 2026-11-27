import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const srcPath = process.argv[2];
const outPath = process.argv[3];
if (!srcPath || !outPath) {
  console.error("Usage: tsx excel-to-html.ts <source.xlsx> <output.html>");
  process.exit(1);
}

function argbToCss(argb: string | undefined): string | null {
  if (!argb || argb.length < 6) return null;
  const hex = argb.length === 8 ? argb.slice(2) : argb;
  return `#${hex}`;
}

function colWidthToPx(width: number | undefined): number {
  const w = width ?? 8.43;
  return Math.round(w * 7 + 5);
}

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function cellBorderCss(border: ExcelJS.Borders | undefined, side: "top" | "left" | "bottom" | "right"): string {
  const b = border?.[side];
  if (!b || !b.style) return "1px solid #d4d4d4";
  const color = argbToCss(b.color?.argb) ?? "#000000";
  const width = b.style === "thick" ? "2px" : b.style === "medium" ? "1.5px" : "1px";
  const dash = b.style === "dashed" || b.style === "dotted" ? b.style : "solid";
  return `${width} ${dash} ${color}`;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(srcPath);

  const sheetsHtml: string[] = [];
  const tabsHtml: string[] = [];

  wb.worksheets.forEach((ws, sheetIdx) => {
    if (ws.state === "hidden" || ws.state === "veryHidden") return;

    let maxCol = 1;
    let maxRow = 1;
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      maxRow = Math.max(maxRow, rowNum);
      row.eachCell({ includeEmpty: false }, (cell, colNum) => {
        maxCol = Math.max(maxCol, colNum);
      });
    });
    maxCol = Math.min(Math.max(maxCol, 1), 60);
    maxRow = Math.min(Math.max(maxRow, 1), 2000);

    const merges = new Map<string, { rowSpan: number; colSpan: number }>();
    const covered = new Set<string>();
    const mergeRanges: string[] = (ws.model as unknown as { merges?: string[] }).merges ?? [];
    for (const range of mergeRanges) {
      const [startRef, endRef] = range.split(":");
      const start = ws.getCell(startRef);
      const end = ws.getCell(endRef || startRef);
      const r1 = start.row, c1 = start.col, r2 = end.row, c2 = end.col;
      merges.set(`${r1}:${c1}`, { rowSpan: r2 - r1 + 1, colSpan: c2 - c1 + 1 });
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          if (r === r1 && c === c1) continue;
          covered.add(`${r}:${c}`);
        }
      }
    }

    let colgroup = `<col style="width:36px">`;
    for (let c = 1; c <= maxCol; c++) {
      colgroup += `<col style="width:${colWidthToPx(ws.getColumn(c).width)}px">`;
    }

    let headerRow = `<tr><th class="corner"></th>`;
    for (let c = 1; c <= maxCol; c++) headerRow += `<th class="colhead">${colLetter(c)}</th>`;
    headerRow += `</tr>`;

    let bodyRows = "";
    for (let r = 1; r <= maxRow; r++) {
      const row = ws.getRow(r);
      const h = row.height ? `${row.height}pt` : "15pt";
      bodyRows += `<tr style="height:${h}"><th class="rowhead">${r}</th>`;
      for (let c = 1; c <= maxCol; c++) {
        const key = `${r}:${c}`;
        if (covered.has(key)) continue;
        const span = merges.get(key);
        const cell = row.getCell(c);
        const style = cell.style || {};
        const font = style.font;
        const fill = style.fill as ExcelJS.FillPattern | undefined;
        const align = style.alignment;
        const border = style.border;

        const css: string[] = [];
        if (font?.bold) css.push("font-weight:700");
        if (font?.italic) css.push("font-style:italic");
        if (font?.size) css.push(`font-size:${font.size}pt`);
        const fontColor = argbToCss(font?.color?.argb);
        if (fontColor) css.push(`color:${fontColor}`);
        if (fill?.type === "pattern" && fill.pattern === "solid") {
          const bg = argbToCss((fill.fgColor as ExcelJS.Color | undefined)?.argb);
          if (bg) css.push(`background:${bg}`);
        }
        if (align?.horizontal) css.push(`text-align:${align.horizontal}`);
        else if (typeof cell.value === "number") css.push("text-align:right");
        if (align?.vertical) css.push(`vertical-align:${align.vertical === "middle" ? "middle" : align.vertical}`);
        if (align?.wrapText) css.push("white-space:normal");

        css.push(`border-top:${cellBorderCss(border, "top")}`);
        css.push(`border-left:${cellBorderCss(border, "left")}`);
        css.push(`border-bottom:${cellBorderCss(border, "bottom")}`);
        css.push(`border-right:${cellBorderCss(border, "right")}`);

        const text = cell.text ?? "";
        const spanAttrs = span ? ` rowspan="${span.rowSpan}" colspan="${span.colSpan}"` : "";
        bodyRows += `<td style="${css.join(";")}"${spanAttrs}>${escapeHtml(String(text))}</td>`;
      }
      bodyRows += `</tr>`;
    }

    const active = sheetIdx === 0 ? "active" : "";
    sheetsHtml.push(
      `<div class="sheet ${active}" id="sheet-${sheetIdx}"><table><colgroup>${colgroup}</colgroup><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table></div>`
    );
    tabsHtml.push(`<button class="tab ${active}" onclick="showSheet(${sheetIdx})">${escapeHtml(ws.name)}</button>`);
  });

  const fileName = path.basename(srcPath);
  const html = `<title>${escapeHtml(fileName)}</title>
<style>
:root{
  --grid-line:#d4d4d4; --header-bg:#f3f2f1; --header-border:#c7c7c7; --header-text:#3b3b3b;
  --tab-bg:#e8e8e8; --tab-active-bg:#ffffff; --tab-active-border:#107c41; --app-bg:#faf9f8;
  --corner-bg:#f3f2f1;
}
*{box-sizing:border-box}
body{background:var(--app-bg);color:#1f1f1f;font-family:Calibri,"Segoe UI",Arial,sans-serif;margin:0;padding:16px;}
.filebar{font-size:13px;color:#605e5c;margin-bottom:10px;padding:0 4px;}
.filebar b{color:#1f1f1f;}
.sheetwrap{background:#fff;border:1px solid var(--header-border);border-radius:4px;overflow:auto;max-height:72vh;}
.sheet{display:none;}
.sheet.active{display:block;}
table{border-collapse:collapse;table-layout:fixed;}
th,td{padding:2px 6px;font-size:11pt;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
th.corner{position:sticky;top:0;left:0;z-index:3;background:var(--corner-bg);border-right:1px solid var(--header-border);border-bottom:1px solid var(--header-border);}
th.colhead{position:sticky;top:0;z-index:2;background:var(--header-bg);color:var(--header-text);font-weight:600;text-align:center;border-right:1px solid var(--header-border);border-bottom:1px solid var(--header-border);}
th.rowhead{position:sticky;left:0;z-index:1;background:var(--header-bg);color:var(--header-text);font-weight:600;text-align:center;border-right:1px solid var(--header-border);border-bottom:1px solid var(--grid-line);min-width:36px;}
td{background:#fff;}
.tabbar{display:flex;gap:2px;margin-top:0;background:var(--tab-bg);border:1px solid var(--header-border);border-top:none;border-radius:0 0 4px 4px;padding:4px 6px;overflow-x:auto;}
.tab{border:none;background:transparent;padding:6px 14px;font-size:12px;font-family:Calibri,"Segoe UI",Arial,sans-serif;color:#3b3b3b;cursor:pointer;border-radius:2px;white-space:nowrap;border-bottom:3px solid transparent;}
.tab:hover{background:rgba(0,0,0,0.05);}
.tab.active{background:var(--tab-active-bg);border-bottom:3px solid var(--tab-active-border);font-weight:600;color:#107c41;}
</style>
<div class="filebar">📊 <b>${escapeHtml(fileName)}</b> — read-only preview, matches the live file's current formatting and values</div>
<div class="sheetwrap">${sheetsHtml.join("")}</div>
<div class="tabbar">${tabsHtml.join("")}</div>
<script>
function showSheet(idx){
  document.querySelectorAll('.sheet').forEach(function(el){ el.classList.remove('active'); });
  document.querySelectorAll('.tab').forEach(function(el){ el.classList.remove('active'); });
  document.getElementById('sheet-' + idx).classList.add('active');
  document.querySelectorAll('.tab')[idx].classList.add('active');
}
</script>`;

  fs.writeFileSync(outPath, html, "utf-8");
  console.log(`Wrote ${outPath} (${wb.worksheets.length} sheets)`);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
