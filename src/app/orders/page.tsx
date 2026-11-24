"use client";
import { useEffect, useState } from "react";

type ComputedLine = {
  item_code: string;
  tally_name: string;
  demand: number;
  buffer: number;
  stock: number;
  order_packs: number;
  order_m: number;
};

type ComputeResult = { lines: ComputedLine[]; totalM: number; openPoCount: number };

export default function OrdersPage() {
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/gpi-order/compute")
      .then((r) => r.json())
      .then((d) => {
        setResult(d);
        setLoading(false);
      });
  }

  useEffect(load, []);

  async function place() {
    if (!result) return;
    setPlacing(true);
    const res = await fetch("/api/gpi-order/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: result.lines, totalM: result.totalM }),
    });
    const data = await res.json();
    setPlacing(false);
    setPlacedOrderId(data.orderId);
  }

  if (loading) return <div className="text-neutral-500">Computing order…</div>;
  if (!result) return <div className="text-red-400">Failed to compute order.</div>;

  return (
    <div className="max-w-4xl">
      <div className="text-emerald-500 font-mono text-xs tracking-widest mb-1">02 GPI ORDER</div>
      <h1 className="text-2xl font-bold mb-1">Place supplier order</h1>
      <p className="text-neutral-500 text-sm mb-6">
        Order qty = demand + buffer − stock, buffer = demand ÷ {result.openPoCount} open PO(s), rounded to nearest 20.
      </p>

      {result.lines.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 text-neutral-400 text-sm">
          No order needed right now — either no open POs, or stock already covers demand + buffer for every item.
        </div>
      ) : (
        <>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-neutral-800 text-neutral-400 text-left">
                <tr>
                  <th className="p-2 pl-3">Item</th>
                  <th className="p-2 text-right">Demand</th>
                  <th className="p-2 text-right">Buffer</th>
                  <th className="p-2 text-right">Stock</th>
                  <th className="p-2 text-right">Order (packs)</th>
                  <th className="p-2 text-right pr-3">M</th>
                </tr>
              </thead>
              <tbody>
                {result.lines.map((l) => (
                  <tr key={l.item_code} className="border-t border-neutral-800">
                    <td className="p-2 pl-3">{l.tally_name}</td>
                    <td className="p-2 text-right text-neutral-400">{l.demand}</td>
                    <td className="p-2 text-right text-neutral-400">{l.buffer}</td>
                    <td className="p-2 text-right text-neutral-400">{l.stock}</td>
                    <td className="p-2 text-right font-semibold">{l.order_packs}</td>
                    <td className="p-2 text-right pr-3 text-emerald-400">{l.order_m}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-700 font-semibold">
                  <td className="p-2 pl-3" colSpan={5}>
                    Total
                  </td>
                  <td className="p-2 text-right pr-3 text-emerald-400">{result.totalM}M</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {placedOrderId === null ? (
            <button
              onClick={place}
              disabled={placing}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-md font-semibold text-sm"
            >
              {placing ? "Placing…" : "Approve & place order"}
            </button>
          ) : (
            <div className="bg-emerald-950/50 border border-emerald-800 rounded-lg p-4 flex items-center justify-between">
              <span className="text-emerald-300 text-sm">
                Order #{placedOrderId} placed ({result.totalM}M).
              </span>
              <a
                href={`/api/gpi-order/${placedOrderId}/export`}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-md text-sm font-medium"
              >
                ⬇ Download BANGALORE MT DISPATCH format
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
