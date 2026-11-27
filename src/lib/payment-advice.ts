export type ParsedAdviceLine = {
  invoiceNo: string;
  grossAmount: number;
  tds: number;
  netAmount: number;
  lineDate: string | null;
};

export type ParsedAdvice = {
  adviceReference: string | null;
  valueDate: string | null; // DD-MM-YYYY, matches the ledger's date convention
  remitterName: string | null;
  lines: ParsedAdviceLine[];
};

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function normalizeDate(raw: string): string | null {
  const m = raw.match(/(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[2].slice(0, 3)];
  if (!month) return null;
  return `${m[1].padStart(2, "0")}-${month}-${m[3]}`;
}

function normalizeInvoiceNo(raw: string): string {
  const m = raw.match(/^([A-Za-z]+)-?(\d+)$/);
  if (!m) return raw;
  return `${m[1].toUpperCase()}-${m[2]}`;
}

/**
 * Parses an HSBC payment advice's extracted text. Designed to be whitespace-tolerant since
 * different PDF text extractors lay out the same table differently -- normalizes all
 * whitespace to single spaces first, then scans for line-item rows anywhere in the text
 * rather than depending on exact line breaks.
 */
export function parsePaymentAdviceText(text: string): ParsedAdvice {
  const normalized = text.replace(/\s+/g, " ").trim();

  const refMatch = normalized.match(/Advice reference no:\s*(\S+)/);
  const valueDateMatch = normalized.match(/Value date:\s*(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})/);
  const remitterMatch = normalized.match(/Remitter's name:\s*(.+?)\s*(?:Remitting bank|Instruction reference):/);

  const lineRe = /([A-Za-z]+-?\d+)\s+INR\s+([\d,]+\.\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+INVOICE/g;
  const lines: ParsedAdviceLine[] = [];
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(normalized)) !== null) {
    lines.push({
      invoiceNo: normalizeInvoiceNo(m[1]),
      grossAmount: Number(m[2].replace(/,/g, "")),
      lineDate: m[3],
      tds: Number(m[4].replace(/,/g, "")),
      netAmount: Number(m[5].replace(/,/g, "")),
    });
  }

  return {
    adviceReference: refMatch?.[1] ?? null,
    valueDate: valueDateMatch ? normalizeDate(valueDateMatch[1]) : null,
    remitterName: remitterMatch?.[1]?.trim() ?? null,
    lines,
  };
}
