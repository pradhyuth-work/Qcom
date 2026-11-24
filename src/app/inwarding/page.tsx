"use client";
import { useEffect, useState } from "react";

type Item = { item_code: string; tally_name: string; qty_packs: number; qty_m: number; sticks_per_pack: number };

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
    // Expect lines like: ITEM CODE or NAME, QTY IN M  (comma or tab separated)
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
        (i) => i.item_code.toLowerCase() === key.toLowerCase() || i.tally_name.toLowerCase() === key.toLowerCase()
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
      setStatus(`Posted ${data.posted} line(s) to stock. Reload to see updated balances.`);
      setLines([{ itemCode: "", qtyM: "" }]);
      setReference("");
      fetch("/api/items").then((r) => r.json()).then(setItems);
    } else {
      setStatus(`Error: ${data.error}`);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="text-emerald-500 font-mono text-xs tracking-widest mb-1">01 INWARDING</div>
      <h1 className="text-2xl font-bold mb-1">Record inventory purchase</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Post a GPI receipt and increase warehouse stock immediately. Quantities are in M (mille = 1000 sticks), same as the delivery note.
      </p>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowBulk((v) => !v)}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-md text-sm font-medium"
        >
          ⬆ Bulk entry from CSV
        </button>
      </div>

      {showBulk && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-6">
          <p className="text-zinc-400 text-xs mb-2">
            One line per product: <code className="text-zinc-300">Item Code or Name, Qty in M</code>
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={6}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-md p-3 text-sm font-mono"
            placeholder={"IT01, 8.0\nIT33, 33.28"}
          />
          <button
            onClick={applyBulk}
            className="mt-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-md text-sm font-semibold"
          >
            Parse into product list
          </button>
        </div>
      )}

      <div className="mb-2 font-semibold text-sm">Products on this receipt</div>
      <div className="space-y-2 mb-4">
        {lines.map((line, i) => {
          const item = items.find((it) => it.item_code === line.itemCode);
          const projectedM = item ? Math.round((item.qty_m + Number(line.qtyM || 0)) * 100) / 100 : null;
          return (
            <div key={i} className="flex gap-2 items-center">
              <select
                value={line.itemCode}
                onChange={(e) => updateLine(i, "itemCode", e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select product…</option>
                {items.map((it) => (
                  <option key={it.item_code} value={it.item_code}>
                    {it.tally_name} · {it.qty_m}M in stock
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                value={line.qtyM}
                onChange={(e) => updateLine(i, "qtyM", e.target.value)}
                placeholder="Qty (M)"
                className="w-32 bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm"
              />
              {item && (
                <span className="text-zinc-600 text-xs w-28">→ {projectedM}M</span>
              )}
              <button onClick={() => removeLine(i)} className="text-zinc-500 hover:text-red-400 px-2">
                ✕
              </button>
            </div>
          );
        })}
      </div>
      <button onClick={addLine} className="text-emerald-400 text-sm hover:text-emerald-300 mb-6">
        + Add another product
      </button>

      <div className="mb-6">
        <label className="flex justify-between text-sm mb-1">
          <span>Supplier / bill reference</span>
          <span className="text-zinc-500">Optional</span>
        </label>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. GPI invoice number, or leave blank if not legible"
          className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm"
        />
      </div>

      <p className="text-zinc-500 text-xs mb-3">Every line is posted together — if one fails, none are applied.</p>

      {status && <div className="mb-4 text-sm text-amber-300">{status}</div>}

      <button
        onClick={submit}
        disabled={posting}
        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-50 rounded-md font-semibold text-sm"
      >
        {posting ? "Posting…" : "Post purchase inward"}
      </button>
    </div>
  );
}
