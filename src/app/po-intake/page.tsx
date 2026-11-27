"use client";
import { useState } from "react";
import { Badge, btnPrimary, Callout, Card, PageHeader } from "@/components/ui";

type PoImportResult = {
  poNo: string;
  action: "created" | "identical" | "conflict" | "skipped_closed";
  lineCount: number;
  diff?: { itemCode: string; displayName: string; existingQty: number; newQty: number }[];
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
      <PageHeader
        title="Import purchase orders"
        description="Upload the Zepto PO export CSV. Every PO is checked against what's already on file before anything is committed — nothing is overwritten silently."
      />

      {!results && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center">1</span>
            <span className="text-sm font-medium text-slate-700">Choose the PO CSV file</span>
          </div>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg py-10 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
            <span className="text-sm text-slate-500">{file ? file.name : "Click to choose a .csv file, or drag it here"}</span>
          </label>
          <div className="mt-5">
            <button onClick={preview} disabled={!file || busy} className={btnPrimary}>
              {busy ? "Reading…" : "Preview import"}
            </button>
          </div>
        </Card>
      )}

      {results && committed === null && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center">2</span>
            <span className="text-sm font-medium text-slate-700">Review and select which POs to commit</span>
          </div>
          {results.map((r) => (
            <Card key={r.poNo} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(r.action === "created" || r.action === "conflict") && (
                    <input
                      type="checkbox"
                      checked={!!selected[r.poNo]}
                      onChange={(e) => setSelected((s) => ({ ...s, [r.poNo]: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-600"
                    />
                  )}
                  <span className="font-semibold text-slate-900">{r.poNo}</span>
                  <StatusBadge action={r.action} />
                </div>
                <span className="text-slate-400 text-sm">{r.lineCount} line items</span>
              </div>
              {r.action === "conflict" && r.diff && (
                <div className="mt-3">
                  <Callout tone="amber">
                    <div className="font-medium mb-2">
                      This PO already exists with different quantities — check the box above to overwrite with this CSV&apos;s version:
                    </div>
                    <table className="w-full text-xs">
                      <thead className="text-amber-700/70">
                        <tr>
                          <th className="text-left pb-1 font-medium">Item</th>
                          <th className="text-right pb-1 font-medium">Existing</th>
                          <th className="text-right pb-1 font-medium">New</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.diff.map((d) => (
                          <tr key={d.itemCode}>
                            <td className="py-0.5">{d.displayName}</td>
                            <td className="text-right py-0.5">{d.existingQty}</td>
                            <td className="text-right py-0.5 font-semibold">{d.newQty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Callout>
                </div>
              )}
              {r.unmatchedSkus && r.unmatchedSkus.length > 0 && (
                <div className="mt-2">
                  <Callout tone="red">Unmatched SKU(s), skipped: {r.unmatchedSkus.join("; ")}</Callout>
                </div>
              )}
            </Card>
          ))}
          <div className="pt-2">
            <button onClick={commit} disabled={busy || Object.values(selected).every((v) => !v)} className={btnPrimary}>
              {busy ? "Committing…" : "Commit selected POs"}
            </button>
          </div>
        </div>
      )}

      {committed !== null && (
        <Callout tone="emerald">
          {committed} PO(s) imported successfully. Head to <strong>GPI Order</strong> to compute the next supplier order.
        </Callout>
      )}
    </div>
  );
}

function StatusBadge({ action }: { action: PoImportResult["action"] }) {
  const map = {
    created: ["New", "emerald"],
    identical: ["Already imported, unchanged", "neutral"],
    conflict: ["Lines differ from what we have", "amber"],
    skipped_closed: ["Already billed/closed — skipped", "neutral"],
  } as const;
  const [label, tone] = map[action];
  return <Badge tone={tone}>{label}</Badge>;
}
