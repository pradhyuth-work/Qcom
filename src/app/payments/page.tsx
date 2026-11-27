"use client";
import { useEffect, useState } from "react";
import { Badge, btnGhost, btnPrimary, btnSecondary, Callout, Card, EmptyState, inputClass, Label, PageHeader, thClass, tdClass, trClass } from "@/components/ui";

type Invoice = { id: number; invoice_number: string; invoice_amount: number; date_of_invoice: string | null };

type AdviceRow = {
  invoiceNo: string;
  grossAmount: number;
  tds: number;
  netAmount: number;
  lineDate: string | null;
  onFileAmount: number | null;
  found: boolean;
  amountMatches: boolean;
};

type ParsedAdvice = {
  adviceReference: string | null;
  valueDate: string | null;
  remitterName: string | null;
  rows: AdviceRow[];
};

type CommitResult = { invoiceNo: string; ok: boolean; fullyPaid?: boolean; error?: string };

function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function PaymentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [advice, setAdvice] = useState<ParsedAdvice | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [posting, setPosting] = useState(false);
  const [results, setResults] = useState<CommitResult[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const [showManual, setShowManual] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [amount, setAmount] = useState("");
  const [tds, setTds] = useState("");
  const [date, setDate] = useState("");
  const [reference, setReference] = useState("");
  const [manualBusy, setManualBusy] = useState(false);
  const [manualStatus, setManualStatus] = useState<string | null>(null);

  function loadManual() {
    fetch("/api/payments/outstanding")
      .then((r) => r.json())
      .then((data) => setInvoices(data.invoices));
  }
  useEffect(() => {
    if (showManual) loadManual();
    setDate(new Date().toISOString().slice(0, 10));
  }, [showManual]);

  async function parseAdvice() {
    if (!file) return;
    setParsing(true);
    setParseError(null);
    setAdvice(null);
    setResults(null);
    const form = new FormData();
    form.set("file", file);
    const res = await fetch("/api/payments/parse-advice", { method: "POST", body: form });
    const data = await res.json();
    setParsing(false);
    if (!res.ok) {
      setParseError(data.error);
      return;
    }
    setAdvice(data);
    const init: Record<string, boolean> = {};
    for (const r of data.rows as AdviceRow[]) init[r.invoiceNo] = r.found;
    setChecked(init);
  }

  async function postAdvice() {
    if (!advice) return;
    const rows = advice.rows.filter((r) => checked[r.invoiceNo]).map((r) => ({ invoiceNo: r.invoiceNo, netAmount: r.netAmount, tds: r.tds }));
    if (rows.length === 0) return;
    setPosting(true);
    const res = await fetch("/api/payments/commit-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, valueDate: advice.valueDate, reference: advice.adviceReference }),
    });
    const data = await res.json();
    setPosting(false);
    setResults(data.results);
  }

  function resetUpload() {
    setFile(null);
    setAdvice(null);
    setResults(null);
    setParseError(null);
  }

  function selectInvoice(inv: Invoice) {
    setSelected(inv);
    setAmount(String(inv.invoice_amount));
    setTds("");
    setReference("");
    setManualStatus(null);
  }

  async function postManual() {
    if (!selected) return;
    setManualBusy(true);
    setManualStatus(null);
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
    setManualBusy(false);
    if (res.ok) {
      setManualStatus(
        data.fullyPaid
          ? `Invoice ${selected.invoice_number} fully paid and removed from outstanding.`
          : `Partial payment recorded against ${selected.invoice_number}.`
      );
      setSelected(null);
      loadManual();
    } else {
      setManualStatus(`Error: ${data.error}`);
    }
  }

  const total = (Number(amount) || 0) + (Number(tds) || 0);
  const checkedCount = advice ? advice.rows.filter((r) => checked[r.invoiceNo]).length : 0;
  const checkedTotal = advice
    ? advice.rows.filter((r) => checked[r.invoiceNo]).reduce((s, r) => s + r.netAmount, 0)
    : 0;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Reconcile a payment"
        description="Upload the HSBC payment advice PDF. A fully-settled invoice (net + TDS) is removed from Outstanding entirely, not just marked paid."
      />

      {!advice && !results && (
        <Card className="p-6">
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg py-10 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
            <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
            <span className="text-sm text-slate-500">{file ? file.name : "Click to choose the payment advice PDF, or drag it here"}</span>
          </label>
          <div className="mt-5">
            <button onClick={parseAdvice} disabled={!file || parsing} className={btnPrimary}>
              {parsing ? "Reading…" : "Parse advice"}
            </button>
          </div>
          {parseError && (
            <div className="mt-4">
              <Callout tone="red">{parseError}</Callout>
            </div>
          )}
        </Card>
      )}

      {advice && !results && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
              <span>
                <span className="text-slate-400">Reference:</span> {advice.adviceReference ?? "—"}
              </span>
              <span>
                <span className="text-slate-400">Value date:</span> {advice.valueDate ?? "—"}
              </span>
              <span>
                <span className="text-slate-400">Remitter:</span> {advice.remitterName ?? "—"}
              </span>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className={`${thClass} w-10`}></th>
                  <th className={thClass}>Invoice</th>
                  <th className={`${thClass} text-right`}>On file</th>
                  <th className={`${thClass} text-right`}>Gross</th>
                  <th className={`${thClass} text-right`}>TDS</th>
                  <th className={`${thClass} text-right`}>Net</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {advice.rows.map((r) => (
                  <tr key={r.invoiceNo} className={trClass}>
                    <td className={tdClass}>
                      <input
                        type="checkbox"
                        checked={!!checked[r.invoiceNo]}
                        onChange={(e) => setChecked((c) => ({ ...c, [r.invoiceNo]: e.target.checked }))}
                        className="w-4 h-4 accent-emerald-600"
                      />
                    </td>
                    <td className={`${tdClass} font-medium text-slate-900`}>{r.invoiceNo}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{r.onFileAmount != null ? inr(r.onFileAmount) : "—"}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{inr(r.grossAmount)}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{inr(r.tds)}</td>
                    <td className={`${tdClass} text-right tabular-nums font-medium`}>{inr(r.netAmount)}</td>
                    <td className={tdClass}>
                      {!r.found ? (
                        <Badge tone="red">Not found in outstanding</Badge>
                      ) : !r.amountMatches ? (
                        <Badge tone="amber">Amount differs from on-file</Badge>
                      ) : (
                        <Badge tone="emerald">Matched</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="flex items-center justify-between">
            <button onClick={resetUpload} className={btnGhost}>
              ← Upload a different advice
            </button>
            <div className="text-sm text-slate-600">
              Posting <span className="font-semibold text-slate-900">{checkedCount}</span> payment(s), total{" "}
              <span className="font-semibold text-slate-900">{inr(checkedTotal)}</span>
            </div>
          </div>

          <button onClick={postAdvice} disabled={posting || checkedCount === 0} className={btnPrimary}>
            {posting ? "Posting…" : `Post ${checkedCount} payment(s)`}
          </button>
        </div>
      )}

      {results && (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className={thClass}>Invoice</th>
                  <th className={thClass}>Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.invoiceNo} className={trClass}>
                    <td className={`${tdClass} font-medium text-slate-900`}>{r.invoiceNo}</td>
                    <td className={tdClass}>
                      {r.ok ? (
                        <Badge tone="emerald">{r.fullyPaid ? "Fully paid, removed from outstanding" : "Partial payment recorded"}</Badge>
                      ) : (
                        <Badge tone="red">{r.error}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <button onClick={resetUpload} className={btnPrimary}>
            Upload another advice
          </button>
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-slate-200">
        <button onClick={() => setShowManual((v) => !v)} className="text-sm text-slate-500 hover:text-slate-700 font-medium">
          {showManual ? "Hide manual entry" : "Record a payment manually instead →"}
        </button>

        {showManual && (
          <div className="mt-4">
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
                        <td className={`${tdClass} text-right tabular-nums`}>{inr(inv.invoice_amount)}</td>
                        <td className={`${tdClass} text-right`}>
                          <button onClick={() => selectInvoice(inv)} className={btnSecondary}>
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
                    <span className="text-slate-500 text-sm">Outstanding: {inr(selected.invoice_amount)}</span>
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
                  Total settling this invoice: <span className="font-semibold text-slate-800">{inr(total)}</span>
                  {total < selected.invoice_amount - 0.5 && (
                    <span className="text-amber-600"> — less than outstanding; recorded as a partial payment.</span>
                  )}
                </div>

                {manualStatus && <Callout tone={manualStatus.startsWith("Error") ? "red" : "emerald"}>{manualStatus}</Callout>}

                <button onClick={postManual} disabled={manualBusy} className={btnPrimary}>
                  {manualBusy ? "Posting…" : "Post payment"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
