export function MetricCard({ label, value, detail }: { label: string; value: number | string; detail?: string }) {
  return <div className="surface-flat rounded-xl px-3 py-3.5 sm:px-4 sm:py-4"><div className="text-xs font-medium leading-4 text-muted">{label}</div><div className="mt-1.5 text-xl font-semibold tracking-tight sm:mt-2 sm:text-2xl">{value}</div>{detail ? <div className="mt-1 text-xs text-muted">{detail}</div> : null}</div>;
}
