import { NextResponse, connection } from "next/server";
import { listGpiOrders } from "@/lib/orders";

export async function GET() {
  await connection();
  return NextResponse.json(listGpiOrders());
}
