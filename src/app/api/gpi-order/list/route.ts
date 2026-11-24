import { NextResponse } from "next/server";
import { listGpiOrders } from "@/lib/orders";

export async function GET() {
  return NextResponse.json(listGpiOrders());
}
