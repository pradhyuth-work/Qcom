"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/po-intake", label: "PO Intake" },
  { href: "/orders", label: "GPI Order" },
  { href: "/inwarding", label: "Inwarding" },
  { href: "/billing", label: "Billing" },
  { href: "/payments", label: "Payments" },
  { href: "/reports", label: "Reports" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="w-56 shrink-0 bg-neutral-900 border-r border-neutral-800 p-5 flex flex-col gap-1">
      <div className="mb-6">
        <div className="text-emerald-400 font-mono text-xs tracking-widest">QCOM</div>
        <div className="text-neutral-500 text-xs mt-1">Varasidhi Enterprises</div>
      </div>
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-2 rounded-md text-sm transition-colors ${
              active
                ? "bg-emerald-600/20 text-emerald-300 font-medium"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
