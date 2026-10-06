export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex flex-col justify-between gap-4 sm:mb-6 sm:flex-row sm:items-start"><div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{description ? <p className="mt-1.5 max-w-3xl text-sm leading-5 text-muted">{description}</p> : null}</div>{action ? <div className="shrink-0">{action}</div> : null}</div>;
}
