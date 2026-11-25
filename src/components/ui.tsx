export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="text-slate-500 text-sm mt-1 max-w-2xl">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}>{children}</div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-slate-700 mb-3">{children}</h2>;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "emerald" | "amber" | "red" | "blue";
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "neutral",
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "emerald" | "red";
}) {
  const valueColor = tone === "emerald" ? "text-emerald-600" : tone === "red" ? "text-red-600" : "text-slate-900";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${valueColor}`}>{value}</div>
      {sub && <div className="text-slate-400 text-xs mt-1">{sub}</div>}
    </Card>
  );
}

export const inputClass =
  "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition";

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex justify-between items-baseline text-sm font-medium text-slate-700 mb-1.5">
      <span>{children}</span>
      {hint && <span className="text-xs font-normal text-slate-400">{hint}</span>}
    </label>
  );
}

export const thClass = "px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide";
export const tdClass = "px-4 py-3 text-sm text-slate-700";
export const trClass = "border-t border-slate-100 hover:bg-slate-50/80 transition-colors";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg font-medium text-sm text-white shadow-sm transition-colors";
export const btnSecondary =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-50 rounded-lg text-sm font-medium text-slate-700 transition-colors";
export const btnDanger =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 rounded-lg font-medium text-sm text-white shadow-sm transition-colors";
export const btnGhost = "text-sm text-slate-500 hover:text-slate-800 transition-colors";

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="text-center py-12 text-slate-400 text-sm">{children}</div>;
}

export function Callout({ tone = "amber", children }: { tone?: "amber" | "emerald" | "red"; children: React.ReactNode }) {
  const tones = {
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    red: "bg-red-50 border-red-200 text-red-800",
  };
  return <div className={`border rounded-lg px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}
