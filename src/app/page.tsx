"use client";
import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, PageHeader, StatCard, tdClass, thClass, trClass } from "@/components/ui";

type StockRow = {
  item_code: string;
  display_name: string;
  qty_packs: number;
  qty_m: number;
};

type DashboardData = {
  customer: string;
  stock: StockRow[];
  openPOs: { po_no: string; po_date: string; del_location: string; po_amount: number }[];
  arBalance: number;
  outstanding: { total: number; cnt: number };
  lastGpiOrder: { id: number; date: string; total_m: number; status: string } | null;
  recentLedger: { id: number; date: string; event_type: string; reference: string; item_code: string; display_name: string; qty_signed: number }[];
  flags: string[];
};

function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div className="text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={`Live view for ${data.customer} — updates the instant any action posts.`} />

      {data.flags.length > 0 && (
        <Card className="border-red-200 bg-red-50 p-4">
          <div className="text-red-700 font-semibold text-sm mb-2">Needs attention</div>
          <ul className="text-red-700 text-sm space-y-1">
            {data.flags.map((f, i) => (
              <li key={i}>• {f}</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="AR Ledger Balance" value={inr(data.arBalance)} tone="emerald" />
        <StatCard label="Outstanding AR" value={inr(data.outstanding.total)} sub={`${data.outstanding.cnt} invoices`} />
        <StatCard label="Open POs" value={String(data.openPOs.length)} />
        <StatCard
          label="Last GPI Order"
          value={data.lastGpiOrder ? `${data.lastGpiOrder.total_m}M` : "—"}
          sub={data.lastGpiOrder ? data.lastGpiOrder.date : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Open POs</h2>
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className={thClass}>PO No</th>
                  <th className={thClass}>Location</th>
                  <th className={`${thClass} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.openPOs.length === 0 && (
                  <tr>
                    <td colSpan={3}>
                      <EmptyState>No open POs</EmptyState>
                    </td>
                  </tr>
                )}
                {data.openPOs.map((po) => (
                  <tr key={po.po_no} className={trClass}>
                    <td className={`${tdClass} font-medium text-slate-900`}>{po.po_no}</td>
                    <td className={tdClass}>{po.del_location}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{inr(po.po_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent ledger activity</h2>
          <Card className="overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Event</th>
                  <th className={thClass}>Item</th>
                  <th className={`${thClass} text-right`}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {data.recentLedger.map((l) => (
                  <tr key={l.id} className={trClass}>
                    <td className={`${tdClass} text-slate-500 text-xs`}>{l.date}</td>
                    <td className={`${tdClass} text-slate-500 text-xs`}>{l.event_type}</td>
                    <td className={`${tdClass} font-medium`}>{l.display_name}</td>
                    <td className={`${tdClass} text-right tabular-nums font-medium ${l.qty_signed < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {l.qty_signed > 0 ? "+" : ""}
                      {l.qty_signed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Stock on hand</h2>
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className={thClass}>Item</th>
                <th className={`${thClass} text-right`}>Packs</th>
                <th className={`${thClass} text-right`}>M</th>
              </tr>
            </thead>
            <tbody>
              {data.stock.map((s) => (
                <tr key={s.item_code} className={trClass}>
                  <td className={`${tdClass} font-medium text-slate-900`}>{s.display_name}</td>
                  <td className={`${tdClass} text-right tabular-nums ${s.qty_packs < 0 ? "text-red-600 font-semibold" : ""}`}>
                    {s.qty_packs.toLocaleString("en-IN")}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums text-slate-500`}>{s.qty_m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
