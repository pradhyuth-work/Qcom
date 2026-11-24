import { NextResponse } from "next/server";
import { computeGpiOrder } from "@/lib/orders";

export async function GET() {
  const result = computeGpiOrder();
  return NextResponse.json(result);
}
