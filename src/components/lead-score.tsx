"use client";

import { useI18n } from "./i18n-provider";

export function LeadScore({ score }: { score?: number | null }) {
  const { t } = useI18n();
  if (score == null) return <span className="text-sm text-muted">—</span>;
  const key = score >= 80 ? "score.high" : score >= 60 ? "score.medium" : "score.low";
  return <span className="inline-flex items-baseline gap-1 font-mono text-sm font-semibold"><span>{score}</span><span className="text-xs font-normal text-muted">{t(key)}</span></span>;
}
