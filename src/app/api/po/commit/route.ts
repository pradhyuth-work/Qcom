import { NextRequest, NextResponse } from "next/server";
import { parseZeptoPoCsv, commitPoImport } from "@/lib/po-import";
import { getDefaultCustomer } from "@/lib/customers";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const poNosJson = form.get("poNos") as string | null;
  if (!file || !poNosJson) {
    return NextResponse.json({ error: "Missing file or poNos" }, { status: 400 });
  }
  const poNos: string[] = JSON.parse(poNosJson);
  const text = await file.text();
  const customer = getDefaultCustomer();
  const lines = parseZeptoPoCsv(text);
  const created = commitPoImport(customer.id, lines, poNos);
  return NextResponse.json({ committed: created });
}
