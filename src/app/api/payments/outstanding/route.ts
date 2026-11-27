import { NextResponse, connection } from "next/server";
import { getDefaultCustomer } from "@/lib/customers";
import { getOutstanding } from "@/lib/payments";

export async function GET() {
  await connection();
  const customer = getDefaultCustomer();
  return NextResponse.json({ invoices: getOutstanding(customer.id) });
}
