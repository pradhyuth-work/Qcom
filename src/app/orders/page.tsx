"use client";
import { useEffect, useState } from "react";
import { Badge, btnPrimary, btnSecondary, Callout, Card, EmptyState, PageHeader, thClass, tdClass, trClass } from "@/components/ui";

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
    const orderLines = result.lines.filter((l) => l.order_packs > 0);
    const res = await fetch("/api/gpi-order/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: orderLines, totalM: result.totalM }),
    });
    const data = await res.json();
    setPlacing(false);
    setPlacedOrderId(data.orderId);
  }

  if (loading) return <div className="text-slate-400 text-sm">Computing order…</div>;
  if (!result) return <Callout tone="red">Failed to compute order.</Callout>;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Place supplier order"
        description={`Order qty = demand + buffer − stock, buffer = demand ÷ ${result.openPoCount} open PO(s), rounded to the nearest 20.`}
      />

      {result.lines.length === 0 ? (
        <Card className="p-6">
          <EmptyState>No order needed right now — either no open POs, or stock already covers demand + buffer for every item.</EmptyState>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden mb-4">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className={thClass}>Item</th>
                  <th className={`${thClass} text-right`}>Demand</th>
                  <th className={`${thClass} text-right`}>Buffer</th>
                  <th className={`${thClass} text-right`}>Stock</th>
                  <th className={`${thClass} text-right`}>Order (packs)</th>
                  <th className={`${thClass} text-right`}>M</th>
                </tr>
              </thead>
              <tbody>
                {result.lines.map((l) => (
                  <tr key={l.item_code} className={`${trClass} ${l.order_packs === 0 ? "opacity-50" : ""}`}>
                    <td className={`${tdClass} font-medium text-slate-900`}>{l.tally_name}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{l.demand}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{l.buffer}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{l.stock}</td>
                    <td className={`${tdClass} text-right tabular-nums font-semibold`}>{l.order_packs}</td>
                    <td className={`${tdClass} text-right tabular-nums text-emerald-600 font-medium`}>{l.order_m}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className={`${tdClass} font-semibold`} colSpan={5}>
                    Total
                  </td>
                  <td className={`${tdClass} text-right tabular-nums text-emerald-700 font-bold`}>{result.totalM}M</td>
                </tr>
              </tfoot>
            </table>
          </Card>

          {placedOrderId === null ? (
            <button onClick={place} disabled={placing} className={btnPrimary}>
              {placing ? "Placing…" : "Approve & place order"}
            </button>
          ) : (
            <Callout tone="emerald">
              <div className="flex items-center justify-between">
                <span>
                  Order #{placedOrderId} placed ({result.totalM}M).
                </span>
                <a href={`/api/gpi-order/${placedOrderId}/export`} className={btnSecondary}>
                  ⬇ Download Bangalore dispatch format
                </a>
              </div>
            </Callout>
          )}
        </>
      )}
    </div>
  );
}
