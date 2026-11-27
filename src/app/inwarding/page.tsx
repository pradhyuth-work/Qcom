"use client";
import { useEffect, useState } from "react";
import { btnPrimary, btnSecondary, Callout, Card, inputClass, Label, PageHeader } from "@/components/ui";

type Item = { item_code: string; display_name: string; qty_packs: number; qty_m: number; sticks_per_pack: number };
type LineInput = { itemCode: string; qtyM: string };

export default function Inwarding() {
  const [items, setItems] = useState<Item[]>([]);
  const [lines, setLines] = useState<LineInput[]>([{ itemCode: "", qtyM: "" }]);
  const [reference, setReference] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then(setItems);
  }, []);

  function updateLine(i: number, field: keyof LineInput, value: string) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { itemCode: "", qtyM: "" }]);
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  function applyBulk() {
    const rows = bulkText
      .split(/\r?\n/)
      .map((r) => r.trim())
      .filter(Boolean);
    const newLines: LineInput[] = [];
    for (const row of rows) {
      const parts = row.split(/[,\t]/).map((p) => p.trim());
      if (parts.length < 2) continue;
      const [key, qtyM] = parts;
      const match = items.find(
        (i) => i.item_code.toLowerCase() === key.toLowerCase() || i.display_name.toLowerCase() === key.toLowerCase()
      );
      if (match) newLines.push({ itemCode: match.item_code, qtyM });
    }
    if (newLines.length > 0) {
      setLines(newLines);
      setShowBulk(false);
      setStatus(`Parsed ${newLines.length} line(s) from bulk input.`);
    } else {
      setStatus("Could not match any rows — use 'Item Code or Name, Qty in M' per line.");
    }
  }

  async function submit() {
    setPosting(true);
    setStatus(null);
    const validLines = lines
      .filter((l) => l.itemCode && Number(l.qtyM) > 0)
      .map((l) => ({ itemCode: l.itemCode, qtyM: Number(l.qtyM) }));
    if (validLines.length === 0) {
      setStatus("Add at least one product with a quantity.");
      setPosting(false);
      return;
    }
    const res = await fetch("/api/inwarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, lines: validLines }),
    });
    const data = await res.json();
    setPosting(false);
    if (res.ok) {
      setStatus(`Posted ${data.posted} line(s) to stock.`);
      setLines([{ itemCode: "", qtyM: "" }]);
      setReference("");
      fetch("/api/items").then((r) => r.json()).then(setItems);
    } else {
      setStatus(`Error: ${data.error}`);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Record a GPI receipt"
        description="Post a supplier delivery and increase warehouse stock immediately. Quantities are in M (mille = 1000 sticks), same as the delivery note."
      />

      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Products on this receipt</span>
          <button onClick={() => setShowBulk((v) => !v)} className="text-sm text-emerald-700 hover:text-emerald-800 font-medium">
            {showBulk ? "Hide bulk entry" : "Paste multiple lines at once"}
          </button>
        </div>

        {showBulk && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-slate-500 text-xs mb-2">
              One line per product: <code className="bg-white border border-slate-200 rounded px-1 py-0.5">Item Code or Name, Qty in M</code>
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={5}
              className={`${inputClass} font-mono`}
              placeholder={"IT01, 8.0\nIT33, 33.28"}
            />
            <button onClick={applyBulk} className={`${btnSecondary} mt-3`}>
              Parse into product list
            </button>
          </div>
        )}

        <div className="space-y-2">
          {lines.map((line, i) => {
            const item = items.find((it) => it.item_code === line.itemCode);
            const projectedM = item ? Math.round((item.qty_m + Number(line.qtyM || 0)) * 100) / 100 : null;
            return (
              <div key={i} className="flex gap-2 items-center">
                <select
                  value={line.itemCode}
                  onChange={(e) => updateLine(i, "itemCode", e.target.value)}
                  className={`${inputClass} flex-1`}
                >
                  <option value="">Select product…</option>
                  {items.map((it) => (
                    <option key={it.item_code} value={it.item_code}>
                      {it.display_name} · {it.qty_m}M in stock
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={line.qtyM}
                  onChange={(e) => updateLine(i, "qtyM", e.target.value)}
                  placeholder="Qty (M)"
                  className={`${inputClass} w-32`}
                />
                {item && <span className="text-slate-400 text-xs w-28 shrink-0">→ {projectedM}M</span>}
                <button onClick={() => removeLine(i)} className="text-slate-400 hover:text-red-500 px-1 text-lg leading-none">
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <button onClick={addLine} className="text-sm text-emerald-700 hover:text-emerald-800 font-medium">
          + Add another product
        </button>

        <div>
          <Label hint="Optional">Supplier / bill reference</Label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. GPI invoice number, or leave blank if not legible"
            className={inputClass}
          />
        </div>

        <p className="text-slate-400 text-xs">Every line is posted together — if one fails, none are applied.</p>

        {status && <Callout tone={status.startsWith("Error") ? "red" : "emerald"}>{status}</Callout>}

        <button onClick={submit} disabled={posting} className={btnPrimary}>
          {posting ? "Posting…" : "Post purchase inward"}
        </button>
      </Card>
    </div>
  );
}
