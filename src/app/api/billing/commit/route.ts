import { NextRequest, NextResponse } from "next/server";
import { getDefaultCustomer } from "@/lib/customers";
import { commitBilling } from "@/lib/billing";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { poNo, invoiceNo, invoiceDate, lines, invoiceAmount, notes } = body;
  if (!poNo || !invoiceNo || !invoiceDate || !lines?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const customer = getDefaultCustomer();
  try {
    commitBilling(customer.id, poNo, invoiceNo, invoiceDate, lines, Number(invoiceAmount) || 0, notes);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
