import { NextRequest, NextResponse, connection } from "next/server";
import { getDefaultCustomer } from "@/lib/customers";
import { postPayment } from "@/lib/payments";

type CommitRow = { invoiceNo: string; netAmount: number; tds: number };

export async function POST(req: NextRequest) {
  await connection();
  const body = await req.json();
  const { rows, valueDate, reference } = body as { rows: CommitRow[]; valueDate: string; reference?: string };
  if (!rows?.length || !valueDate) {
    return NextResponse.json({ error: "Missing rows or value date" }, { status: 400 });
  }

  const customer = getDefaultCustomer();
  const results = rows.map((r) => {
    try {
      const res = postPayment(customer.id, r.invoiceNo, r.netAmount, r.tds, valueDate, reference);
      return { invoiceNo: r.invoiceNo, ok: true, fullyPaid: res.fullyPaid };
    } catch (e) {
      return { invoiceNo: r.invoiceNo, ok: false, error: (e as Error).message };
    }
  });

  return NextResponse.json({ results });
}
