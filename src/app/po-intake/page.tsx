"use client";
import { useState } from "react";

type PoImportResult = {
  poNo: string;
  action: "created" | "identical" | "conflict" | "skipped_closed";
  lineCount: number;
  diff?: { itemCode: string; tallyName: string; existingQty: number; newQty: number }[];
  unmatchedSkus?: string[];
};

export default function PoIntakePage() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<PoImportResult[] | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [committed, setCommitted] = useState<number | null>(null);

  async function preview() {
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    const res = await fetch("/api/po/preview", { method: "POST", body: form });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setResults(data.results);
      const sel: Record<string, boolean> = {};
      for (const r of data.results) {
        if (r.action === "created" || r.action === "conflict") sel[r.poNo] = true;
      }
      setSelected(sel);
    }
  }

  async function commit() {
    if (!file || !results) return;
    const poNos = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (poNos.length === 0) return;
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    form.set("poNos", JSON.stringify(poNos));
    const res = await fetch("/api/po/commit", { method: "POST", body: form });
    const data = await res.json();
    setBusy(false);
    if (res.ok) setCommitted(data.committed);
  }

  return (
    <div className="max-w-4xl">
      <div className="text-emerald-500 font-mono text-xs tracking-widest mb-1">00 PO INTAKE</div>
      <h1 className="text-2xl font-bold mb-1">Import Zepto purchase orders</h1>
      <p className="text-zinc-500 text-sm mb-6">Upload the PO export CSV. Every PO is checked before anything is committed.</p>

      {!results && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm mb-4"
          />
          <div>
            <button
              onClick={preview}
              disabled={!file || busy}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-50 rounded-md font-semibold text-sm"
            >
              {busy ? "Reading…" : "Preview import"}
            </button>
          </div>
        </div>
      )}

      {results && committed === null && (
        <div className="space-y-3">
          {results.map((r) => (
            <div key={r.poNo} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(r.action === "created" || r.action === "conflict") && (
                    <input
                      type="checkbox"
                      checked={!!selected[r.poNo]}
                      onChange={(e) => setSelected((s) => ({ ...s, [r.poNo]: e.target.checked }))}
                    />
                  )}
                  <span className="font-mono font-semibold">{r.poNo}</span>
                  <Badge action={r.action} />
                </div>
                <span className="text-zinc-500 text-sm">{r.lineCount} lines</span>
              </div>
              {r.action === "conflict" && r.diff && (
                <div className="mt-3 bg-amber-950/30 border border-amber-800/50 rounded-md p-3 text-sm">
                  <div className="text-amber-300 font-medium mb-2">
                    This PO already exists with different quantities — check the checkbox to overwrite with this CSV&apos;s version:
                  </div>
                  <table className="w-full text-xs">
                    <thead className="text-zinc-400">
                      <tr>
                        <th className="text-left pb-1">Item</th>
                        <th className="text-right pb-1">Existing</th>
                        <th className="text-right pb-1">New</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.diff.map((d) => (
                        <tr key={d.itemCode}>
                          <td>{d.tallyName}</td>
                          <td className="text-right">{d.existingQty}</td>
                          <td className="text-right text-amber-300">{d.newQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {r.unmatchedSkus && r.unmatchedSkus.length > 0 && (
                <div className="mt-2 text-xs text-red-400">
                  Unmatched SKU(s), skipped: {r.unmatchedSkus.join("; ")}
                </div>
              )}
            </div>
          ))}
          <button
            onClick={commit}
            disabled={busy || Object.values(selected).every((v) => !v)}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-50 rounded-md font-semibold text-sm"
          >
            {busy ? "Committing…" : "Commit selected POs"}
          </button>
        </div>
      )}

      {committed !== null && (
        <div className="bg-emerald-950/50 border border-emerald-800 rounded-lg p-4 text-emerald-300 text-sm">
          {committed} PO(s) imported. Go to GPI Order to compute the next supplier order.
        </div>
      )}
    </div>
  );
}

function Badge({ action }: { action: PoImportResult["action"] }) {
  const map = {
    created: ["New", "bg-emerald-900/50 text-emerald-300"],
    identical: ["Already imported, unchanged", "bg-zinc-900 text-zinc-400"],
    conflict: ["Lines differ from what we have", "bg-amber-900/50 text-amber-300"],
    skipped_closed: ["Already billed/closed — skipped", "bg-zinc-900 text-zinc-500"],
  } as const;
  const [label, cls] = map[action];
  return <span className={`text-xs px-2 py-0.5 rounded ${cls}`}>{label}</span>;
}
