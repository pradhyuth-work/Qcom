import { NextRequest, NextResponse } from "next/server";
import { parseZeptoPoCsv, previewPoImport } from "@/lib/po-import";
import { getDefaultCustomer } from "@/lib/customers";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  const text = await file.text();
  const customer = getDefaultCustomer();
  const lines = parseZeptoPoCsv(text);
  if (lines.length === 0) {
    return NextResponse.json({ error: "No PO lines found in CSV" }, { status: 400 });
  }
  const results = previewPoImport(customer.id, lines);
  return NextResponse.json({ results, rawLineCount: lines.length, customer: customer.name });
}
