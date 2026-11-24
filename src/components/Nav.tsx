"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", code: null },
  { href: "/po-intake", label: "PO Intake", code: "00" },
  { href: "/inwarding", label: "Inwarding", code: "01" },
  { href: "/orders", label: "GPI Order", code: "02" },
  { href: "/billing", label: "Billing", code: "03" },
  { href: "/payments", label: "Payments", code: "04" },
  { href: "/reports", label: "Reports", code: "05" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="w-60 shrink-0 bg-black border-r border-zinc-800 p-5 flex flex-col gap-1">
      <div className="mb-7 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md border border-emerald-600/50 bg-emerald-950/40 flex items-center justify-center text-emerald-400 shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="currentColor" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-100 font-mono text-sm font-bold tracking-wide">QCOM</span>
            <span className="px-1.5 py-px rounded-full border border-zinc-700 text-zinc-500 text-[9px] font-mono uppercase">v1</span>
          </div>
          <div className="text-zinc-600 text-[11px] truncate">Varasidhi Enterprises</div>
        </div>
      </div>
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
              active
                ? "bg-emerald-500/10 text-emerald-300 font-medium border border-emerald-700/40"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent"
            }`}
          >
            {l.code && <span className="font-mono text-[10px] text-zinc-600 tracking-wider">{l.code}</span>}
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
