import { NextResponse, connection } from "next/server";
import { getDefaultCustomer } from "@/lib/customers";
import { getOpenPOsWithLines } from "@/lib/billing";

export async function GET() {
  await connection();
  const customer = getDefaultCustomer();
  return NextResponse.json({ customer: customer.name, pos: getOpenPOsWithLines(customer.id) });
}
