"use client";
import { useEffect, useState } from "react";

type ReportType = "sales" | "ledger" | "aging";

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
      <div className="text-emerald-500 font-mono text-xs tracking-widest mb-1">05 REPORTS</div>
      <h1 className="text-2xl font-bold mb-1">Reports</h1>
      <p className="text-zinc-500 text-sm mb-6">Pick a report and date range, then view it live or download as CSV.</p>

      <div className="flex gap-3 items-end mb-6 flex-wrap">
        <div>
          <label className="text-sm block mb-1">Report</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ReportType)}
            className="bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm"
          >
            <option value="sales">Sales pivot (by SKU, A→Z)</option>
            <option value="ledger">Stock ledger</option>
            <option value="aging">Outstanding aging</option>
          </select>
        </div>
        {type !== "aging" && (
          <>
            <div>
              <label className="text-sm block mb-1">From</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm block mb-1">To</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </>
        )}
        <button onClick={run} disabled={busy} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-50 rounded-md text-sm font-medium">
          {busy ? "Running…" : "Run report"}
        </button>
        {rows && rows.length > 0 && (
          <button onClick={downloadCsv} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-md text-sm font-medium">
            ⬇ Download CSV
          </button>
        )}
      </div>

      {rows && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400 text-left">
              <tr>
                {columns.map((c) => (
                  <th key={c} className="p-2 pl-3 whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length || 1} className="p-4 text-center text-zinc-500">
                    No rows in range.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-zinc-800">
                  {columns.map((c) => (
                    <td key={c} className="p-2 pl-3 whitespace-nowrap">
                      {String(r[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
