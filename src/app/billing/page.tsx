"use client";
import { useEffect, useState } from "react";
import { btnPrimary, btnGhost, Callout, Card, EmptyState, inputClass, Label, PageHeader, thClass, tdClass, trClass } from "@/components/ui";

type Line = { item_code: string; tally_name: string; sku_desc: string | null; qty_ordered: number; unit_base_cost: number | null };
type OpenPo = { po_no: string; po_date: string | null; del_location: string | null; po_amount: number | null; lines: Line[] };

export default function BillingPage() {
  const [pos, setPos] = useState<OpenPo[]>([]);
  const [selected, setSelected] = useState<OpenPo | null>(null);
  const [billed, setBilled] = useState<Record<string, string>>({});
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function load() {
    fetch("/api/billing/open-pos")
      .then((r) => r.json())
      .then((data) => setPos(data.pos));
  }
  useEffect(load, []);

  function selectPo(po: OpenPo) {
    setSelected(po);
    const init: Record<string, string> = {};
    for (const l of po.lines) init[l.item_code] = String(l.qty_ordered);
    setBilled(init);
    const suggested = po.lines.reduce((sum, l) => sum + (l.unit_base_cost ?? 0) * Number(init[l.item_code] || 0), 0);
    setInvoiceAmount(suggested ? String(Math.round(suggested * 100) / 100) : "");
    setInvoiceNo("");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setStatus(null);
  }

  async function commit() {
    if (!selected || !invoiceNo || !invoiceDate) {
      setStatus("Invoice number and date are required.");
      return;
    }
    setBusy(true);
    setStatus(null);
    const lines = selected.lines.map((l) => ({ itemCode: l.item_code, qtyBilled: Number(billed[l.item_code]) || 0 }));
    const res = await fetch("/api/billing/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poNo: selected.po_no, invoiceNo, invoiceDate, lines, invoiceAmount: Number(invoiceAmount) || 0, notes }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setStatus(`PO ${selected.po_no} billed as ${invoiceNo} and closed.`);
      setSelected(null);
      load();
    } else {
      setStatus(`Error: ${data.error}`);
    }
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Record a billing invoice"
        description="Pick the PO the invoice bills against, confirm quantities per line, then post. Closing a PO is one-shot — any shortfall becomes demand for a future order, not a debt against this PO."
      />

      {!selected && (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className={thClass}>PO No</th>
                <th className={thClass}>Location</th>
                <th className={`${thClass} text-right`}>Lines</th>
                <th className={`${thClass} text-right`}>PO Amount</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {pos.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState>No open POs to bill.</EmptyState>
                  </td>
                </tr>
              )}
              {pos.map((po) => (
                <tr key={po.po_no} className={trClass}>
                  <td className={`${tdClass} font-medium text-slate-900`}>{po.po_no}</td>
                  <td className={tdClass}>{po.del_location}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{po.lines.length}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{po.po_amount?.toLocaleString("en-IN")}</td>
                  <td className={`${tdClass} text-right`}>
                    <button onClick={() => selectPo(po)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold transition-colors">
                      Bill this PO
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {selected && (
        <div className="space-y-5">
          <button onClick={() => setSelected(null)} className={btnGhost}>
            ← Back to open POs
          </button>

          <Card className="p-5">
            <div className="font-semibold text-slate-900 mb-3">{selected.po_no}</div>
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="text-left pb-2">Item</th>
                  <th className="text-right pb-2">Ordered</th>
                  <th className="text-right pb-2">Billed qty</th>
                </tr>
              </thead>
              <tbody>
                {selected.lines.map((l) => {
                  const short = Number(billed[l.item_code]) < l.qty_ordered;
                  return (
                    <tr key={l.item_code} className="border-t border-slate-100">
                      <td className="py-2.5 text-sm">{l.tally_name}</td>
                      <td className="py-2.5 text-right text-sm text-slate-500 tabular-nums">{l.qty_ordered}</td>
                      <td className="py-2.5 text-right">
                        <input
                          type="number"
                          step="1"
                          value={billed[l.item_code] ?? ""}
                          onChange={(e) => setBilled((b) => ({ ...b, [l.item_code]: e.target.value }))}
                          className={`w-24 text-right rounded-lg px-2 py-1.5 text-sm border tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                            short ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-300"
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card className="p-5">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Invoice No (MTQ-NN)</Label>
                <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="MTQ-66" className={inputClass} />
              </div>
              <div>
                <Label>Invoice Date</Label>
                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label hint="Pre-tax suggestion — edit to match invoice">Invoice Amount (₹)</Label>
                <input
                  type="number"
                  step="0.01"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-4">
              <Label hint="Optional">Notes</Label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Filter Black Kretek billed at 159.36 — flag price variant"
                className={inputClass}
              />
            </div>
          </Card>

          {status && <Callout tone={status.startsWith("Error") ? "red" : "emerald"}>{status}</Callout>}

          <button onClick={commit} disabled={busy} className={btnPrimary}>
            {busy ? "Posting…" : "Post billing & close PO"}
          </button>
        </div>
      )}
    </div>
  );
}
