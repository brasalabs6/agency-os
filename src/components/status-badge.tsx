import { STATUS_LABELS } from "@/lib/domain/status";
import type { LeadStatus } from "@/lib/domain/types";

const tones: Record<LeadStatus, string> = {
  DISCOVERED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  ENRICHED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  SCORED: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  READY_TO_CONTACT: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  CONTACTED: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  QUALIFIED: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  PERMISSIONED_FOLLOWUP: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  DIAGNOSIS_SENT: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  PROPOSAL_SENT: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  NEGOTIATION: "bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  WON: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  ONBOARDING: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  NURTURE: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  LOST: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  DO_NOT_CONTACT: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  INVALID: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium ${tones[status]}`}><span className="status-dot" />{STATUS_LABELS[status]}</span>;
}
