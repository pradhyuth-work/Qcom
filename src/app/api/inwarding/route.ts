import { NextRequest, NextResponse } from "next/server";
import { postLedgerLines } from "@/lib/stock";
import { getItemByCode } from "@/lib/items";

type InwardingBody = {
  reference: string;
  lines: { itemCode: string; qtyM: number }[];
};

export async function POST(req: NextRequest) {
  const body: InwardingBody = await req.json();
  if (!body.lines || body.lines.length === 0) {
    return NextResponse.json({ error: "No product lines given" }, { status: 400 });
  }
  const today = new Date().toISOString().slice(0, 10);
  const ledgerLines = [];
  for (const l of body.lines) {
    if (!l.qtyM || l.qtyM <= 0) continue;
    const item = getItemByCode(l.itemCode);
    if (!item) {
      return NextResponse.json({ error: `Unknown item code ${l.itemCode}` }, { status: 400 });
    }
    // Receipts are always quoted in M (mille = 1000 sticks) on the GPI delivery note.
    // Stock is tracked in packs internally, so convert: packs = M * 1000 / sticks_per_pack.
    const qtyPacks = Math.round(((l.qtyM * 1000) / item.sticks_per_pack) * 100) / 100;
    ledgerLines.push({
      date: today,
      eventType: "GPI RECEIPT",
      reference: body.reference || "(no reference provided)",
      itemCode: l.itemCode,
      qtySigned: qtyPacks,
      notes: `Posted via qcom Inwarding. Entered as ${l.qtyM}M -> ${qtyPacks} packs (${item.sticks_per_pack} sticks/pack).`,
    });
  }
  if (ledgerLines.length === 0) {
    return NextResponse.json({ error: "All quantities were zero" }, { status: 400 });
  }
  postLedgerLines(ledgerLines);
  return NextResponse.json({ posted: ledgerLines.length });
}
