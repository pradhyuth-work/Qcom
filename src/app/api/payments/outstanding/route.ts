import { NextResponse } from "next/server";
import { getDefaultCustomer } from "@/lib/customers";
import { getOutstanding } from "@/lib/payments";

export async function GET() {
  const customer = getDefaultCustomer();
  return NextResponse.json({ invoices: getOutstanding(customer.id) });
}
