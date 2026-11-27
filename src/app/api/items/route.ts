import { NextResponse, connection } from "next/server";
import { getStockRows } from "@/lib/items";

export async function GET() {
  await connection();
  const rows = getStockRows().filter((r) => r.tracked);
  return NextResponse.json(rows);
}
