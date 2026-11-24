import { NextRequest, NextResponse } from "next/server";
import { getDefaultCustomer } from "@/lib/customers";
import { getStockLedgerInRange, getSalesPivot, getAgingReport } from "@/lib/reports";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "sales";
  const start = searchParams.get("start") || "2000-01-01";
  const end = searchParams.get("end") || "2100-01-01";
  const customer = getDefaultCustomer();

  if (type === "ledger") return NextResponse.json({ rows: getStockLedgerInRange(start, end) });
  if (type === "aging") return NextResponse.json({ rows: getAgingReport(customer.id) });
  return NextResponse.json({ rows: getSalesPivot(customer.id, start, end) });
}
