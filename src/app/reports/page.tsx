"use client";
import { useEffect, useState } from "react";
import { btnPrimary, btnSecondary, Card, EmptyState, inputClass, Label, PageHeader, thClass, tdClass, trClass } from "@/components/ui";

type ReportType = "sales" | "ledger" | "aging";

const reportLabels: Record<ReportType, string> = {
  sales: "Sales pivot (by SKU, A→Z)",
  ledger: "Stock ledger",
  aging: "Outstanding aging",
};

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>("sales");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStart(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
    setEnd(new Date().toISOString().slice(0, 10));
  }, []);

  async function run() {
    setBusy(true);
    const params = new URLSearchParams({ type, start, end });
    const res = await fetch(`/api/reports?${params}`);
    const data = await res.json();
    setBusy(false);
    setRows(data.rows);
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
      <PageHeader title="Reports" description="Pick a report and date range, then view it live or download as CSV." />

      <Card className="p-5 mb-6">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="w-64">
            <Label>Report</Label>
            <select value={type} onChange={(e) => setType(e.target.value as ReportType)} className={inputClass}>
              {(Object.keys(reportLabels) as ReportType[]).map((t) => (
                <option key={t} value={t}>
                  {reportLabels[t]}
                </option>
              ))}
            </select>
          </div>
          {type !== "aging" && (
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
                    {columns.map((c) => (
                      <td key={c} className={`${tdClass} whitespace-nowrap`}>
                        {String(r[c] ?? "")}
                      </td>
                    ))}
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
