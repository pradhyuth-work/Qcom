import { NextResponse } from "next/server";
import { getStockRows } from "@/lib/items";

export async function GET() {
  const rows = getStockRows().filter((r) => r.tracked);
  return NextResponse.json(rows);
}
