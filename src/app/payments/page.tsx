"use client";
import { useEffect, useState } from "react";
import { btnPrimary, btnGhost, Callout, Card, EmptyState, inputClass, Label, PageHeader, thClass, tdClass, trClass } from "@/components/ui";

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
      setStatus(
        data.fullyPaid
          ? `Invoice ${selected.invoice_number} fully paid and removed from outstanding.`
          : `Partial payment recorded against ${selected.invoice_number}.`
      );
      setSelected(null);
      load();
    } else {
      setStatus(`Error: ${data.error}`);
    }
  }

  const total = (Number(amount) || 0) + (Number(tds) || 0);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Reconcile a payment"
        description="Match an HSBC payment advice to its outstanding invoice. A fully-settled invoice (payment + TDS) is removed from Outstanding entirely, not just marked paid."
      />

      {!selected && (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className={thClass}>Invoice</th>
                <th className={thClass}>Date</th>
                <th className={`${thClass} text-right`}>Amount</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState>No outstanding invoices.</EmptyState>
                  </td>
                </tr>
              )}
              {invoices.map((inv) => (
                <tr key={inv.id} className={trClass}>
                  <td className={`${tdClass} font-medium text-slate-900`}>{inv.invoice_number}</td>
                  <td className={tdClass}>{inv.date_of_invoice}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>₹{inv.invoice_amount.toLocaleString("en-IN")}</td>
                  <td className={`${tdClass} text-right`}>
                    <button
                      onClick={() => selectInvoice(inv)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold transition-colors"
                    >
                      Record payment
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
            ← Back to outstanding
          </button>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">{selected.invoice_number}</span>
              <span className="text-slate-500 text-sm">Outstanding: ₹{selected.invoice_amount.toLocaleString("en-IN")}</span>
            </div>
          </Card>

          <Card className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount received (₹)</Label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label hint="Optional">TDS deducted (₹)</Label>
                <input type="number" step="0.01" value={tds} onChange={(e) => setTds(e.target.value)} placeholder="0" className={inputClass} />
              </div>
              <div>
                <Label>Payment Date</Label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label hint="Optional">Reference</Label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="HSBC advice ref / UTR"
                  className={inputClass}
                />
              </div>
            </div>
          </Card>

          <div className="text-slate-500 text-sm">
            Total settling this invoice: <span className="font-semibold text-slate-800">₹{total.toLocaleString("en-IN")}</span>
            {total < selected.invoice_amount - 0.5 && (
              <span className="text-amber-600"> — less than outstanding; recorded as a partial payment.</span>
            )}
          </div>

          {status && <Callout tone={status.startsWith("Error") ? "red" : "emerald"}>{status}</Callout>}

          <button onClick={post} disabled={busy} className={btnPrimary}>
            {busy ? "Posting…" : "Post payment"}
          </button>
        </div>
      )}
    </div>
  );
}
