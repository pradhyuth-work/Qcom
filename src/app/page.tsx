"use client";
import { useEffect, useState } from "react";
import { Panel, Pill, StatBlock, thClass } from "@/components/ui";

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

  if (!data) return <div className="text-zinc-600 font-mono text-sm">Loading…</div>;

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Pill tone="emerald">Live</Pill>
          <span className="text-zinc-600 text-xs font-mono">{data.customer}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          One ledger. <span className="text-emerald-400">Zero mismatches.</span>
        </h1>
        <p className="text-zinc-500 text-sm max-w-2xl">
          Stock, AR, and open POs for <span className="text-zinc-300">{data.customer}</span> — updates the instant any
          action posts.
        </p>
      </div>

      {data.flags.length > 0 && (
        <Panel className="border-red-900 bg-red-950/30 p-4">
          <div className="text-red-300 font-semibold text-sm mb-2 font-mono uppercase tracking-wider text-xs">Flagged</div>
          <ul className="text-red-200 text-sm space-y-1">
            {data.flags.map((f, i) => (
              <li key={i}>• {f}</li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatBlock label="AR Ledger Balance" value={inr(data.arBalance)} tone="emerald" />
        <StatBlock label="Outstanding AR" value={inr(data.outstanding.total)} sub={`${data.outstanding.cnt} invoices`} />
        <StatBlock label="Open POs" value={String(data.openPOs.length)} />
        <StatBlock
          label="Last GPI Order"
          value={data.lastGpiOrder ? `${data.lastGpiOrder.total_m}M` : "—"}
          sub={data.lastGpiOrder ? data.lastGpiOrder.date : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <section>
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-3">Open POs</h2>
          <Panel className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 border-b border-zinc-800">
                <tr>
                  <th className={thClass}>PO No</th>
                  <th className={thClass}>Location</th>
                  <th className={`${thClass} text-right pr-3`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.openPOs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-zinc-600">
                      No open POs
                    </td>
                  </tr>
                )}
                {data.openPOs.map((po) => (
                  <tr key={po.po_no} className="border-t border-zinc-900 hover:bg-zinc-900/50">
                    <td className="p-2 pl-3 font-mono text-zinc-300">{po.po_no}</td>
                    <td className="p-2 text-zinc-400">{po.del_location}</td>
                    <td className="p-2 text-right pr-3 font-mono tabular-nums">{inr(po.po_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </section>

        <section>
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-3">Recent ledger activity</h2>
          <Panel className="overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 border-b border-zinc-800 sticky top-0">
                <tr>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Event</th>
                  <th className={thClass}>Item</th>
                  <th className={`${thClass} text-right pr-3`}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {data.recentLedger.map((l) => (
                  <tr key={l.id} className="border-t border-zinc-900 hover:bg-zinc-900/50">
                    <td className="p-2 pl-3 font-mono text-zinc-500 text-xs">{l.date}</td>
                    <td className="p-2 text-zinc-400 text-xs">{l.event_type}</td>
                    <td className="p-2 font-mono">{l.item_code}</td>
                    <td
                      className={`p-2 text-right pr-3 font-mono tabular-nums ${
                        l.qty_signed < 0 ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {l.qty_signed > 0 ? "+" : ""}
                      {l.qty_signed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </section>
      </div>

      <section>
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-3">Stock on hand</h2>
        <Panel className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className={thClass}>Item</th>
                <th className={`${thClass} text-right`}>Packs</th>
                <th className={`${thClass} text-right pr-3`}>M</th>
              </tr>
            </thead>
            <tbody>
              {data.stock.map((s) => (
                <tr key={s.item_code} className="border-t border-zinc-900 hover:bg-zinc-900/50">
                  <td className="p-2 pl-3">{s.tally_name}</td>
                  <td
                    className={`p-2 text-right font-mono tabular-nums ${
                      s.qty_packs < 0 ? "text-red-400 font-semibold" : "text-zinc-200"
                    }`}
                  >
                    {s.qty_packs.toLocaleString("en-IN")}
                  </td>
                  <td className="p-2 text-right pr-3 font-mono tabular-nums text-zinc-500">{s.qty_m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </section>
    </div>
  );
}
