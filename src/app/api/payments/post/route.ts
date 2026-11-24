import { NextRequest, NextResponse } from "next/server";
import { getDefaultCustomer } from "@/lib/customers";
import { postPayment } from "@/lib/payments";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { invoiceNumber, amount, tds, date, reference } = body;
  if (!invoiceNumber || !date || (!amount && !tds)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const customer = getDefaultCustomer();
  try {
    const result = postPayment(customer.id, invoiceNumber, Number(amount) || 0, Number(tds) || 0, date, reference);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
