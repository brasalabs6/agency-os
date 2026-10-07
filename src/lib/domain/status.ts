import type { LeadStatus } from "./types";

export const ACTIVE_STATUSES: LeadStatus[] = [
  "DISCOVERED",
  "ENRICHED",
  "SCORED",
  "READY_TO_CONTACT",
  "CONTACTED",
  "QUALIFIED",
  "PERMISSIONED_FOLLOWUP",
  "DIAGNOSIS_SENT",
  "PROPOSAL_SENT",
  "NEGOTIATION",
];

export const TERMINAL_STATUSES: LeadStatus[] = ["WON", "ONBOARDING", "NURTURE", "LOST", "DO_NOT_CONTACT", "INVALID"];

export const PIPELINE_GROUPS = [
  { id: "inbox", label: "Inbox", statuses: ["DISCOVERED", "ENRICHED", "SCORED", "READY_TO_CONTACT"] as LeadStatus[] },
  { id: "contact", label: "Contato", statuses: ["CONTACTED"] as LeadStatus[] },
  { id: "qualified", label: "Qualificado", statuses: ["QUALIFIED", "PERMISSIONED_FOLLOWUP"] as LeadStatus[] },
  { id: "diagnosis", label: "Diagnóstico", statuses: ["DIAGNOSIS_SENT"] as LeadStatus[] },
  { id: "proposal", label: "Proposta", statuses: ["PROPOSAL_SENT"] as LeadStatus[] },
  { id: "negotiation", label: "Negociação", statuses: ["NEGOTIATION"] as LeadStatus[] },
  { id: "won", label: "Ganho", statuses: ["WON"] as LeadStatus[] },
] as const;

export const STATUS_LABELS: Record<LeadStatus, string> = {
  DISCOVERED: "Descoberto",
  ENRICHED: "Enriquecido",
  SCORED: "Pontuado",
  READY_TO_CONTACT: "Pronto para contato",
  CONTACTED: "Contactado",
  QUALIFIED: "Qualificado",
  PERMISSIONED_FOLLOWUP: "Follow-up autorizado",
  DIAGNOSIS_SENT: "Diagnóstico enviado",
  PROPOSAL_SENT: "Proposta enviada",
  NEGOTIATION: "Negociação",
  WON: "Ganho",
  ONBOARDING: "Onboarding",
  NURTURE: "Nurture",
  LOST: "Perdido",
  DO_NOT_CONTACT: "Não contatar",
  INVALID: "Inválido",
};

export function pipelineGroupForStatus(status: LeadStatus): string {
  return PIPELINE_GROUPS.find((group) => group.statuses.includes(status))?.id ?? "other";
}

export function statusForPipelineGroup(groupId: string): LeadStatus | null {
  const group = PIPELINE_GROUPS.find((item) => item.id === groupId);
  if (!group) return null;
  if (group.id === "inbox") return "READY_TO_CONTACT";
  return group.statuses[0] ?? null;
}

export function isActiveStatus(status: LeadStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function canContact(status: LeadStatus, doNotContact: boolean): boolean {
  return !doNotContact && status !== "DO_NOT_CONTACT" && status !== "INVALID";
}

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true;
  if (from === "DO_NOT_CONTACT" || from === "INVALID") return false;
  if (["DO_NOT_CONTACT", "INVALID", "LOST", "NURTURE", "WON"].includes(to)) return true;
  if (from === "WON" && to === "ONBOARDING") return true;
  if (from === "WON" || from === "ONBOARDING" || from === "LOST") return false;
  return true;
}
