export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-xl font-semibold tracking-tight">{title}</h1>{description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}</div>{action}</div>;
}
