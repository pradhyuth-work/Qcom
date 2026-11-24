"use client";
import { useEffect, useState } from "react";

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
      <div className="text-emerald-500 font-mono text-xs tracking-widest mb-1">03 BILLING</div>
      <h1 className="text-2xl font-bold mb-1">Record a Zepto billing invoice</h1>
      <p className="text-neutral-500 text-sm mb-6">
        Pick the PO the invoice bills against, confirm quantities per line, then post. Closing a PO is one-shot — any
        shortfall becomes demand for a future order, not a debt against this PO.
      </p>

      {!selected && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800 text-neutral-400 text-left">
              <tr>
                <th className="p-2 pl-3">PO No</th>
                <th className="p-2">Location</th>
                <th className="p-2 text-right">Lines</th>
                <th className="p-2 text-right pr-3">PO Amount</th>
                <th className="p-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {pos.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-neutral-500">
                    No open POs to bill.
                  </td>
                </tr>
              )}
              {pos.map((po) => (
                <tr key={po.po_no} className="border-t border-neutral-800">
                  <td className="p-2 pl-3 font-mono">{po.po_no}</td>
                  <td className="p-2">{po.del_location}</td>
                  <td className="p-2 text-right">{po.lines.length}</td>
                  <td className="p-2 text-right pr-3">{po.po_amount?.toLocaleString("en-IN")}</td>
                  <td className="p-2 pr-3 text-right">
                    <button
                      onClick={() => selectPo(po)}
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 rounded-md text-xs font-medium"
                    >
                      Bill this PO
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div>
          <button onClick={() => setSelected(null)} className="text-neutral-500 hover:text-neutral-300 text-sm mb-4">
            ← Back to open POs
          </button>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 mb-4">
            <div className="font-mono font-semibold mb-3">{selected.po_no}</div>
            <table className="w-full text-sm">
              <thead className="text-neutral-400 text-left">
                <tr>
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-right">Ordered</th>
                  <th className="pb-2 text-right pr-3">Billed qty</th>
                </tr>
              </thead>
              <tbody>
                {selected.lines.map((l) => (
                  <tr key={l.item_code} className="border-t border-neutral-800">
                    <td className="py-2">{l.tally_name}</td>
                    <td className="py-2 text-right text-neutral-400">{l.qty_ordered}</td>
                    <td className="py-2 text-right pr-3">
                      <input
                        type="number"
                        step="1"
                        value={billed[l.item_code] ?? ""}
                        onChange={(e) => setBilled((b) => ({ ...b, [l.item_code]: e.target.value }))}
                        className={`w-24 text-right bg-neutral-950 border rounded-md px-2 py-1 text-sm ${
                          Number(billed[l.item_code]) < l.qty_ordered ? "border-amber-600 text-amber-300" : "border-neutral-700"
                        }`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm block mb-1">Invoice No (MTQ-NN)</label>
              <input
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="MTQ-66"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm block mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm block mb-1">Invoice Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm"
              />
              <div className="text-neutral-600 text-xs mt-1">Suggested from pre-tax unit cost — edit to match the actual tax invoice.</div>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm block mb-1">Notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Filter Black Kretek billed at 159.36 — flag price variant"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm"
            />
          </div>

          {status && <div className="mb-4 text-sm text-amber-300">{status}</div>}

          <button
            onClick={commit}
            disabled={busy}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-md font-semibold text-sm"
          >
            {busy ? "Posting…" : "Post billing & close PO"}
          </button>
        </div>
      )}
    </div>
  );
}
