"use client";
import { useEffect, useState } from "react";

type Invoice = { id: number; invoice_number: string; invoice_amount: number; date_of_invoice: string | null };

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [amount, setAmount] = useState("");
  const [tds, setTds] = useState("");
  const [date, setDate] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function load() {
    fetch("/api/payments/outstanding")
      .then((r) => r.json())
      .then((data) => setInvoices(data.invoices));
  }
  useEffect(() => {
    load();
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  function selectInvoice(inv: Invoice) {
    setSelected(inv);
    setAmount(String(inv.invoice_amount));
    setTds("");
    setReference("");
    setStatus(null);
  }

  async function post() {
    if (!selected) return;
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/payments/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceNumber: selected.invoice_number,
        amount: Number(amount) || 0,
        tds: Number(tds) || 0,
        date,
        reference,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setStatus(data.fullyPaid ? `Invoice ${selected.invoice_number} fully paid and removed from outstanding.` : `Partial payment recorded against ${selected.invoice_number}.`);
      setSelected(null);
      load();
    } else {
      setStatus(`Error: ${data.error}`);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="text-emerald-500 font-mono text-xs tracking-widest mb-1">04 PAYMENTS</div>
      <h1 className="text-2xl font-bold mb-1">Reconcile an HSBC payment advice</h1>
      <p className="text-neutral-500 text-sm mb-6">
        Match the payment to its outstanding invoice. A fully-settled invoice (payment + TDS) is removed from
        Outstanding entirely, not just marked paid.
      </p>

      {!selected && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800 text-neutral-400 text-left">
              <tr>
                <th className="p-2 pl-3">Invoice</th>
                <th className="p-2">Date</th>
                <th className="p-2 text-right pr-3">Amount</th>
                <th className="p-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-neutral-500">
                    No outstanding invoices.
                  </td>
                </tr>
              )}
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-neutral-800">
                  <td className="p-2 pl-3 font-mono">{inv.invoice_number}</td>
                  <td className="p-2">{inv.date_of_invoice}</td>
                  <td className="p-2 text-right pr-3">₹{inv.invoice_amount.toLocaleString("en-IN")}</td>
                  <td className="p-2 pr-3 text-right">
                    <button
                      onClick={() => selectInvoice(inv)}
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 rounded-md text-xs font-medium"
                    >
                      Record payment
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
            ← Back to outstanding
          </button>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 mb-4">
            <div className="font-mono font-semibold mb-1">{selected.invoice_number}</div>
            <div className="text-neutral-500 text-sm">Outstanding: ₹{selected.invoice_amount.toLocaleString("en-IN")}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm block mb-1">Amount received (₹)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm block mb-1">TDS deducted (₹)</label>
              <input
                type="number"
                step="0.01"
                value={tds}
                onChange={(e) => setTds(e.target.value)}
                placeholder="0"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm block mb-1">Payment Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm block mb-1">Reference (optional)</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="HSBC advice ref / UTR"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="text-neutral-500 text-xs mb-4">
            Total settling this invoice: ₹{((Number(amount) || 0) + (Number(tds) || 0)).toLocaleString("en-IN")}
            {(Number(amount) || 0) + (Number(tds) || 0) < selected.invoice_amount - 0.5 && (
              <span className="text-amber-400"> — less than the outstanding amount; this will be recorded as a partial payment.</span>
            )}
          </div>

          {status && <div className="mb-4 text-sm text-amber-300">{status}</div>}

          <button
            onClick={post}
            disabled={busy}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-md font-semibold text-sm"
          >
            {busy ? "Posting…" : "Post payment"}
          </button>
        </div>
      )}
    </div>
  );
}
