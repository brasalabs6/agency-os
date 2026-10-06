export function LeadScore({ score }: { score?: number | null }) {
  if (score == null) return <span className="text-muted text-sm">—</span>;
  const label = score >= 80 ? "Alta" : score >= 60 ? "Média" : "Baixa";
  return <span className="inline-flex items-baseline gap-1 font-mono text-sm font-semibold"><span>{score}</span><span className="text-[10px] font-normal text-muted">{label}</span></span>;
}
