"use client";
import { useEffect, useState } from "react";

type StockRow = {
  item_code: string;
  tally_name: string;
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
  recentLedger: { id: number; date: string; event_type: string; reference: string; item_code: string; qty_signed: number }[];
  flags: string[];
};

function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div className="text-neutral-500">Loading…</div>;

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Live view for <span className="text-neutral-300">{data.customer}</span> — updates the instant any action posts.
        </p>
      </div>

      {data.flags.length > 0 && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg p-4">
          <div className="text-red-300 font-semibold text-sm mb-2">Flagged</div>
          <ul className="text-red-200 text-sm space-y-1">
            {data.flags.map((f, i) => (
              <li key={i}>• {f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Stat label="AR Ledger Balance" value={inr(data.arBalance)} />
        <Stat label="Outstanding AR" value={inr(data.outstanding.total)} sub={`${data.outstanding.cnt} invoices`} />
        <Stat label="Open POs" value={String(data.openPOs.length)} />
        <Stat
          label="Last GPI Order"
          value={data.lastGpiOrder ? `${data.lastGpiOrder.total_m}M` : "—"}
          sub={data.lastGpiOrder ? data.lastGpiOrder.date : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">Open POs</h2>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-800 text-neutral-400 text-left">
                <tr>
                  <th className="p-2 pl-3">PO No</th>
                  <th className="p-2">Location</th>
                  <th className="p-2 text-right pr-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.openPOs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-neutral-500">
                      No open POs
                    </td>
                  </tr>
                )}
                {data.openPOs.map((po) => (
                  <tr key={po.po_no} className="border-t border-neutral-800">
                    <td className="p-2 pl-3 font-mono">{po.po_no}</td>
                    <td className="p-2">{po.del_location}</td>
                    <td className="p-2 text-right pr-3">{inr(po.po_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Recent ledger activity</h2>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-800 text-neutral-400 text-left sticky top-0">
                <tr>
                  <th className="p-2 pl-3">Date</th>
                  <th className="p-2">Event</th>
                  <th className="p-2">Item</th>
                  <th className="p-2 text-right pr-3">Qty</th>
                </tr>
              </thead>
              <tbody>
                {data.recentLedger.map((l) => (
                  <tr key={l.id} className="border-t border-neutral-800">
                    <td className="p-2 pl-3">{l.date}</td>
                    <td className="p-2 text-neutral-400">{l.event_type}</td>
                    <td className="p-2">{l.item_code}</td>
                    <td className={`p-2 text-right pr-3 ${l.qty_signed < 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {l.qty_signed > 0 ? "+" : ""}
                      {l.qty_signed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Stock on hand</h2>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800 text-neutral-400 text-left">
              <tr>
                <th className="p-2 pl-3">Item</th>
                <th className="p-2 text-right">Packs</th>
                <th className="p-2 text-right pr-3">M</th>
              </tr>
            </thead>
            <tbody>
              {data.stock.map((s) => (
                <tr key={s.item_code} className="border-t border-neutral-800">
                  <td className="p-2 pl-3">{s.tally_name}</td>
                  <td className={`p-2 text-right ${s.qty_packs < 0 ? "text-red-400 font-semibold" : ""}`}>
                    {s.qty_packs.toLocaleString("en-IN")}
                  </td>
                  <td className="p-2 text-right pr-3 text-neutral-400">{s.qty_m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="text-neutral-500 text-xs mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
      {sub && <div className="text-neutral-500 text-xs mt-1">{sub}</div>}
    </div>
  );
}
