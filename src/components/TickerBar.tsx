"use client";
import { useEffect, useState } from "react";

type DashboardData = {
  customer: string;
  arBalance: number;
  outstanding: { total: number; cnt: number };
  openPOs: { po_no: string }[];
  stock: { qty_packs: number }[];
};

function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function TickerBar() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [now, setNow] = useState("");

  useEffect(() => {
    const load = () => fetch("/api/dashboard").then((r) => r.json()).then(setData);
    load();
    setNow(new Date().toLocaleTimeString("en-IN"));
    const t = setInterval(() => setNow(new Date().toLocaleTimeString("en-IN")), 1000);
    return () => clearInterval(t);
  }, []);

  const negativeStock = data?.stock.some((s) => s.qty_packs < 0) ?? false;

  return (
    <div className="flex items-center gap-5 px-4 h-8 border-b border-zinc-800 bg-black text-[11px] font-mono text-zinc-500 overflow-x-auto whitespace-nowrap">
      <span className="flex items-center gap-1.5 text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        LIVE
      </span>
      <span>CUSTOMER: <span className="text-zinc-300">{data?.customer ?? "—"}</span></span>
      <span>OPEN POs: <span className="text-zinc-300">{data?.openPOs.length ?? "—"}</span></span>
      <span>AR BALANCE: <span className="text-zinc-300">{data ? inr(data.arBalance) : "—"}</span></span>
      <span>
        OUTSTANDING: <span className="text-zinc-300">{data ? inr(data.outstanding.total) : "—"}</span>{" "}
        ({data?.outstanding.cnt ?? "—"} inv)
      </span>
      <span className="ml-auto flex items-center gap-4 shrink-0">
        <span
          className={`px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider ${
            negativeStock
              ? "border-red-700/60 text-red-400 bg-red-950/40"
              : "border-emerald-700/60 text-emerald-400 bg-emerald-950/40"
          }`}
        >
          {negativeStock ? "Stock Mismatch" : "Ledger Reconciled"}
        </span>
        <span>{now}</span>
      </span>
    </div>
  );
}
