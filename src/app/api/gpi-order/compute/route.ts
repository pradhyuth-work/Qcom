import { NextResponse, connection } from "next/server";
import { computeGpiOrder } from "@/lib/orders";

export async function GET() {
  await connection();
  const result = computeGpiOrder();
  return NextResponse.json(result);
}
