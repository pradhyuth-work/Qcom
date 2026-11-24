export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="text-emerald-500 font-mono text-[11px] tracking-[0.2em] mb-1">{children}</div>;
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "emerald" | "amber" | "red";
}) {
  const tones = {
    neutral: "border-zinc-700 text-zinc-400 bg-zinc-900",
    emerald: "border-emerald-700/60 text-emerald-400 bg-emerald-950/40",
    amber: "border-amber-700/60 text-amber-400 bg-amber-950/40",
    red: "border-red-700/60 text-red-400 bg-red-950/40",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatBlock({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: "neutral" | "emerald" }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
      <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-2xl font-bold font-mono tabular-nums ${tone === "emerald" ? "text-emerald-400" : "text-zinc-100"}`}>
        {value}
      </div>
      {sub && <div className="text-zinc-600 text-xs mt-1">{sub}</div>}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-zinc-950 border border-zinc-800 rounded-lg ${className}`}>{children}</div>;
}

export const thClass = "p-2 pl-3 text-left text-[10px] font-mono uppercase tracking-wider text-zinc-500";
export const tdNum = "p-2 text-right font-mono tabular-nums";
export const btnPrimary =
  "px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-md font-semibold text-sm text-black transition-colors";
export const btnSecondary =
  "px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-40 rounded-md text-sm font-medium text-zinc-200 transition-colors";
