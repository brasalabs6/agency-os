export function MetricCard({ label, value, detail }: { label: string; value: number | string; detail?: string }) {
  return <div className="surface-flat rounded-lg px-4 py-3"><div className="text-xs font-medium text-muted">{label}</div><div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>{detail ? <div className="mt-1 text-[11px] text-muted">{detail}</div> : null}</div>;
}
