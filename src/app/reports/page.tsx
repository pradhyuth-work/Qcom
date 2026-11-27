"use client";
import { useEffect, useState } from "react";
import { btnPrimary, btnSecondary, Card, EmptyState, inputClass, Label, PageHeader, thClass, tdClass, trClass } from "@/components/ui";

type ReportType = "pivot" | "coverage" | "sales" | "ledger" | "aging";

const reportLabels: Record<ReportType, string> = {
  pivot: "PO-wise Pivot Report (by location)",
  coverage: "Stock Coverage Summary",
  sales: "Sales / Fill-rate Pivot (by SKU, A→Z)",
  ledger: "Stock Ledger",
  aging: "Outstanding AR Aging",
};

const needsDateRange: Record<ReportType, boolean> = {
  pivot: false,
  coverage: false,
  sales: true,
  ledger: true,
  aging: false,
};

type PivotLine = { item_code: string; display_name: string; qty_ordered: number; unit_base_cost: number | null };
type PivotPo = {
  po_no: string;
  po_date: string | null;
  del_location: string | null;
  po_amount: number | null;
  lines: PivotLine[];
  total_qty: number;
  total_amount: number;
};
type PivotGroup = { location: string; pos: PivotPo[] };

function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>("pivot");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [groups, setGroups] = useState<PivotGroup[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStart(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
    setEnd(new Date().toISOString().slice(0, 10));
  }, []);

  async function run() {
    setBusy(true);
    setRows(null);
    setGroups(null);
    const params = new URLSearchParams({ type, start, end });
    const res = await fetch(`/api/reports?${params}`);
    const data = await res.json();
    setBusy(false);
    if (data.groups) setGroups(data.groups);
    else setRows(data.rows);
  }

  function downloadCsv() {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qcom-${type}-${start}-to-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function csvCell(v: unknown) {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="max-w-5xl">
      <PageHeader title="Reports" description="Pick a report, then view it live or download as CSV." />

      <Card className="p-5 mb-6">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="w-72">
            <Label>Report</Label>
            <select value={type} onChange={(e) => setType(e.target.value as ReportType)} className={inputClass}>
              {(Object.keys(reportLabels) as ReportType[]).map((t) => (
                <option key={t} value={t}>
                  {reportLabels[t]}
                </option>
              ))}
            </select>
          </div>
          {needsDateRange[type] && (
            <>
              <div>
                <Label>From</Label>
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label>To</Label>
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
              </div>
            </>
          )}
          <button onClick={run} disabled={busy} className={btnPrimary}>
            {busy ? "Running…" : "Run report"}
          </button>
          {rows && rows.length > 0 && (
            <button onClick={downloadCsv} className={btnSecondary}>
              ⬇ Download CSV
            </button>
          )}
        </div>
      </Card>

      {groups && (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.location}>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">{g.location}</h2>
              {g.pos.length === 0 && <EmptyState>No open POs for this location.</EmptyState>}
              <div className="space-y-5">
                {g.pos.map((po) => (
                  <Card key={po.po_no} className="overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-semibold text-slate-800">
                      PO: {po.po_no}
                    </div>
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className={`${thClass} w-12`}>S.No</th>
                          <th className={thClass}>Item</th>
                          <th className={`${thClass} text-right`}>Unit Price</th>
                          <th className={`${thClass} text-right`}>Qty (Packs)</th>
                          <th className={`${thClass} text-right`}>Sum of Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {po.lines.map((l, i) => (
                          <tr key={l.item_code} className={trClass}>
                            <td className={tdClass}>{i + 1}</td>
                            <td className={tdClass}>{l.display_name}</td>
                            <td className={`${tdClass} text-right tabular-nums`}>{l.unit_base_cost ?? "—"}</td>
                            <td className={`${tdClass} text-right tabular-nums`}>{l.qty_ordered}</td>
                            <td className={`${tdClass} text-right tabular-nums`}>
                              {l.unit_base_cost != null ? Math.round(l.qty_ordered * l.unit_base_cost * 100) / 100 : "—"}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-300 bg-slate-50">
                          <td className={tdClass}></td>
                          <td className={`${tdClass} font-semibold`}>TOTAL</td>
                          <td className={tdClass}></td>
                          <td className={`${tdClass} text-right tabular-nums font-semibold`}>{po.total_qty}</td>
                          <td className={`${tdClass} text-right tabular-nums font-semibold`}>{inr(po.total_amount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {rows && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className={`${thClass} whitespace-nowrap`}>
                      {c.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length || 1}>
                      <EmptyState>No rows in range.</EmptyState>
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr key={i} className={trClass}>
                    {columns.map((c) => {
                      const v = r[c];
                      const isNegative = typeof v === "number" && v < 0 && c === "left_after";
                      return (
                        <td key={c} className={`${tdClass} whitespace-nowrap ${isNegative ? "text-red-600 font-semibold" : ""}`}>
                          {String(v ?? "")}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
