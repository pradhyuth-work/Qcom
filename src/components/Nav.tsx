"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, InboxIcon, PackageIcon, CartIcon, ReceiptIcon, CardIcon, ChartIcon } from "@/components/icons";

const links = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/po-intake", label: "PO Intake", icon: InboxIcon },
  { href: "/inwarding", label: "Inwarding", icon: PackageIcon },
  { href: "/orders", label: "GPI Order", icon: CartIcon },
  { href: "/billing", label: "Billing", icon: ReceiptIcon },
  { href: "/payments", label: "Payments", icon: CardIcon },
  { href: "/reports", label: "Reports", icon: ChartIcon },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="w-64 shrink-0 bg-white border-r border-slate-200 p-4 flex flex-col gap-0.5">
      <div className="mb-6 px-2 pt-2 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          Q
        </div>
        <div className="min-w-0">
          <div className="text-slate-900 font-semibold text-sm leading-tight">qcom</div>
          <div className="text-slate-400 text-xs truncate">Varasidhi Enterprises</div>
        </div>
      </div>
      {links.map((l) => {
        const active = pathname === l.href;
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-emerald-600" : "text-slate-400"}`} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
