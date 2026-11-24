import db from "./db";
import { findItemByCustomerSkuDesc } from "./items";
import { getOrCreateLocation } from "./customers";

export type ParsedPoLine = {
  poNo: string;
  poDate: string;
  delLocation: string;
  poAmount: number;
  skuDesc: string;
  qty: number;
  unitBaseCost: number;
};

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ",") {
          cells.push(cur);
          cur = "";
        } else cur += ch;
      }
    }
    cells.push(cur);
    return cells;
  });
}

/** Parses the Zepto PO export CSV format. Other customers' formats get their own parser later. */
export function parseZeptoPoCsv(text: string): ParsedPoLine[] {
  const rows = parseCsv(text);
  const header = rows[0].map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  const iPoNo = idx("PO No.");
  const iPoDate = idx("PO Date");
  const iDelLoc = idx("Del Location");
  const iPoAmt = idx("PO Amount");
  const iSkuDesc = idx("SKU Desc");
  const iQty = idx("Qty");
  const iUnitCost = idx("Unit Base Cost");

  const out: ParsedPoLine[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row[iPoNo]) continue;
    out.push({
      poNo: row[iPoNo].trim(),
      poDate: row[iPoDate]?.trim() ?? "",
      delLocation: row[iDelLoc]?.trim() ?? "",
      poAmount: Number(row[iPoAmt]) || 0,
      skuDesc: row[iSkuDesc]?.trim() ?? "",
      qty: Number(row[iQty]) || 0,
      unitBaseCost: Number(row[iUnitCost]) || 0,
    });
  }
  return out;
}

export type PoImportResult = {
  poNo: string;
  action: "created" | "identical" | "conflict" | "skipped_closed";
  lineCount: number;
  diff?: { itemCode: string; tallyName: string; existingQty: number; newQty: number }[];
  unmatchedSkus?: string[];
};

export function previewPoImport(customerId: number, lines: ParsedPoLine[]): PoImportResult[] {
  const byPo = groupByPo(lines);
  const results: PoImportResult[] = [];
  for (const [poNo, poLines] of byPo) {
    results.push(evaluatePo(customerId, poNo, poLines));
  }
  return results;
}

function groupByPo(lines: ParsedPoLine[]): Map<string, ParsedPoLine[]> {
  const map = new Map<string, ParsedPoLine[]>();
  for (const l of lines) {
    if (!map.has(l.poNo)) map.set(l.poNo, []);
    map.get(l.poNo)!.push(l);
  }
  return map;
}

function evaluatePo(customerId: number, poNo: string, poLines: ParsedPoLine[]): PoImportResult {
  const existing = db.prepare(`SELECT * FROM purchase_orders WHERE po_no = ?`).get(poNo) as
    | { status: string }
    | undefined;

  const unmatchedSkus: string[] = [];
  const resolved: { itemCode: string; tallyName: string; qty: number; unitCost: number; skuDesc: string }[] = [];
  for (const l of poLines) {
    const item = findItemByCustomerSkuDesc(customerId, l.skuDesc);
    if (!item) {
      unmatchedSkus.push(l.skuDesc);
      continue;
    }
    resolved.push({ itemCode: item.item_code, tallyName: item.tally_name, qty: l.qty, unitCost: l.unitBaseCost, skuDesc: l.skuDesc });
  }

  if (existing?.status === "CLOSED") {
    return { poNo, action: "skipped_closed", lineCount: resolved.length, unmatchedSkus };
  }

  if (!existing) {
    return { poNo, action: "created", lineCount: resolved.length, unmatchedSkus };
  }

  const existingLines = db
    .prepare(`SELECT item_code, qty_ordered FROM po_lines WHERE po_no = ?`)
    .all(poNo) as { item_code: string; qty_ordered: number }[];
  const existingByCode = new Map(existingLines.map((l) => [l.item_code, l.qty_ordered]));
  const newByCode = new Map(resolved.map((l) => [l.itemCode, l.qty]));

  const diff: PoImportResult["diff"] = [];
  const allCodes = new Set([...existingByCode.keys(), ...newByCode.keys()]);
  for (const code of allCodes) {
    const ex = existingByCode.get(code) ?? 0;
    const nw = newByCode.get(code) ?? 0;
    if (ex !== nw) {
      const item = resolved.find((r) => r.itemCode === code);
      diff.push({ itemCode: code, tallyName: item?.tallyName ?? code, existingQty: ex, newQty: nw });
    }
  }

  if (diff.length === 0) {
    return { poNo, action: "identical", lineCount: resolved.length, unmatchedSkus };
  }
  return { poNo, action: "conflict", lineCount: resolved.length, diff, unmatchedSkus };
}

/** Commits the PO(s): creates new ones, or replaces lines for ones the user confirmed to overwrite. */
export function commitPoImport(customerId: number, lines: ParsedPoLine[], poNosToApply: string[]) {
  const byPo = groupByPo(lines);
  const insertPo = db.prepare(
    `INSERT INTO purchase_orders (po_no, customer_id, po_date, del_location, location_id, status, po_amount)
     VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
     ON CONFLICT(po_no) DO UPDATE SET po_amount = excluded.po_amount, del_location = excluded.del_location, location_id = excluded.location_id`
  );
  const deleteLines = db.prepare(`DELETE FROM po_lines WHERE po_no = ?`);
  const insertLine = db.prepare(
    `INSERT INTO po_lines (po_no, item_code, sku_desc, qty_ordered, unit_base_cost) VALUES (?, ?, ?, ?, ?)`
  );

  let created = 0;
  const tx = db.transaction(() => {
    for (const poNo of poNosToApply) {
      const poLines = byPo.get(poNo);
      if (!poLines || poLines.length === 0) continue;
      const first = poLines[0];
      const locationId = getOrCreateLocation(customerId, first.delLocation);
      insertPo.run(poNo, customerId, first.poDate, first.delLocation, locationId, first.poAmount);
      deleteLines.run(poNo);
      for (const l of poLines) {
        const item = findItemByCustomerSkuDesc(customerId, l.skuDesc);
        if (!item) continue;
        insertLine.run(poNo, item.item_code, l.skuDesc, l.qty, l.unitBaseCost);
      }
      created++;
    }
  });
  tx();
  return created;
}
