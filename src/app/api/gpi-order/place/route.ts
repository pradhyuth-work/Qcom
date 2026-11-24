import { NextRequest, NextResponse } from "next/server";
import { placeGpiOrder, type ComputedOrderLine } from "@/lib/orders";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const lines: ComputedOrderLine[] = body.lines;
  const totalM: number = body.totalM;
  const orderId = placeGpiOrder(lines, totalM);
  return NextResponse.json({ orderId });
}
