"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { LEAD_STATUSES, SERVICE_OPPORTUNITIES, type Lead, type LeadStatus, type UserSummary } from "@/lib/domain/types";
import { STATUS_LABELS } from "@/lib/domain/status";
import { ModalShell } from "./modal-shell";
import { buttonPrimaryClass, buttonSecondaryClass, controlClass, textareaClass } from "./ui-kit";

type Mode = null | "edit" | "note" | "next" | "contact" | "stage" | "outcome";

async function requestJson(url: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await response.json();
  if (!response.ok) throw new Error(json?.error?.message ?? "Falha na operação");
  return json;
}

export function LeadActions({ lead, users, currentUserId }: { lead: Lead; users: UserSummary[]; currentUserId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => { if (!busy) { setMode(null); setError(null); } }, [busy]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); setMode(null); setError(null); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Erro inesperado"); }
    finally { setBusy(false); }
  }

  return <>
    <div className="flex flex-wrap gap-2">
      {lead.owner?.id !== currentUserId ? <button onClick={() => void run(() => requestJson(`/api/leads/${lead.id}`, "PATCH", { ownerId: currentUserId, expectedVersion: lead.version }))} className={buttonSecondaryClass}>Atribuir a mim</button> : null}
      <button onClick={() => setMode("edit")} className={buttonSecondaryClass}>Editar</button>
      <button onClick={() => setMode("note")} className={buttonSecondaryClass}>Adicionar nota</button>
      <button onClick={() => setMode("contact")} disabled={lead.doNotContact} className={buttonSecondaryClass}>Registrar contato</button>
      <button onClick={() => setMode("next")} className={buttonSecondaryClass}>Próxima ação</button>
      <button onClick={() => setMode("stage")} className={buttonPrimaryClass}>Mover estágio</button>
      <button onClick={() => setMode("outcome")} className={buttonSecondaryClass}>Resultado</button>
    </div>

    <ModalShell open={Boolean(mode)} onClose={close} title={mode ? title(mode) : "Lead"} description={mode === "edit" ? "Atualize os dados sem perder o histórico do lead." : undefined} sizeClass={mode === "edit" ? "sm:max-w-2xl" : "sm:max-w-xl"}>
      <div className="p-4 sm:p-5">
        {mode === "edit" ? <form onSubmit={(e) => {
          e.preventDefault(); const data = new FormData(e.currentTarget); const score = String(data.get("score") ?? "");
          const body = { name: data.get("name"), segment: data.get("segment") || null, city: data.get("city") || null, state: data.get("state") || null, website: data.get("website") || null, phone: data.get("phone") || null, whatsapp: data.get("whatsapp") || null, email: data.get("email") || null, contactName: data.get("contactName") || null, contactRole: data.get("contactRole") || null, score: score === "" ? null : Number(score), primaryOpportunity: data.get("opportunity") || null, opportunityNotes: data.get("opportunityNotes") || null, ownerId: data.get("ownerId") || null, expectedVersion: lead.version };
          void run(() => requestJson(`/api/leads/${lead.id}`, "PATCH", body));
        }}><div className="grid gap-4 sm:grid-cols-2">
          <Field name="name" label="Empresa" defaultValue={lead.name} required autoFocus/><Field name="segment" label="Segmento" defaultValue={lead.segment ?? ""}/><Field name="city" label="Cidade" defaultValue={lead.city ?? ""}/><Field name="state" label="UF" defaultValue={lead.state ?? ""}/><Field name="website" label="Website" type="url" defaultValue={lead.website ?? ""}/><Field name="phone" label="Telefone" defaultValue={lead.phone ?? ""}/><Field name="whatsapp" label="WhatsApp" defaultValue={lead.whatsapp ?? ""}/><Field name="email" label="Email" type="email" defaultValue={lead.email ?? ""}/><Field name="contactName" label="Contato" defaultValue={lead.contactName ?? ""}/><Field name="contactRole" label="Cargo" defaultValue={lead.contactRole ?? ""}/><Field name="score" label="Score" type="number" defaultValue={lead.score?.toString() ?? ""}/>
          <label className="text-xs font-medium">Oportunidade<select name="opportunity" defaultValue={lead.primaryOpportunity ?? ""} className={`mt-1.5 ${controlClass}`}><option value="">Não definida</option>{SERVICE_OPPORTUNITIES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
          <label className="text-xs font-medium">Responsável<select name="ownerId" defaultValue={lead.owner?.id ?? ""} className={`mt-1.5 ${controlClass}`}><option value="">Sem responsável</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
          <label className="text-xs font-medium sm:col-span-2">Notas da oportunidade<textarea name="opportunityNotes" defaultValue={lead.opportunityNotes ?? ""} rows={4} className={`mt-1.5 ${textareaClass}`}/></label>
        </div><Submit busy={busy}/></form> : null}

        {mode === "note" ? <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); void run(() => requestJson(`/api/leads/${lead.id}/notes`, "POST", { body: data.get("body") })); }}><label className="text-xs font-medium">Nota<textarea name="body" required autoFocus rows={6} className={`mt-1.5 ${textareaClass}`} placeholder="Contexto, objeções, próximos passos…"/></label><Submit busy={busy}/></form> : null}

        {mode === "next" ? <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); const due = data.get("dueAt") ? new Date(String(data.get("dueAt"))).toISOString() : null; void run(() => requestJson(`/api/leads/${lead.id}/next-action`, "POST", { action: data.get("action"), dueAt: due, ownerId: data.get("ownerId") || null, expectedVersion: lead.version })); }}><label className="block text-xs font-medium">Ação<input name="action" required autoFocus defaultValue={lead.nextAction ?? ""} className={`mt-1.5 ${controlClass}`} placeholder="Ex.: ligar para o decisor"/></label><label className="block text-xs font-medium">Prazo<input name="dueAt" type="datetime-local" className={`mt-1.5 ${controlClass}`}/></label><label className="block text-xs font-medium">Responsável<select name="ownerId" defaultValue={lead.nextActionOwner?.id ?? lead.owner?.id ?? ""} className={`mt-1.5 ${controlClass}`}><option value="">Sem responsável</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><Submit busy={busy}/></form> : null}

        {mode === "stage" ? <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); void run(() => requestJson(`/api/leads/${lead.id}/stage`, "POST", { targetStatus: data.get("status") as LeadStatus, reason: data.get("reason"), expectedVersion: lead.version })); }}><label className="block text-xs font-medium">Novo estágio<select name="status" defaultValue={lead.status} className={`mt-1.5 ${controlClass}`}>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label><label className="block text-xs font-medium">Motivo<input name="reason" className={`mt-1.5 ${controlClass}`} placeholder="Opcional"/></label><Submit busy={busy}/></form> : null}

        {mode === "contact" ? <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); const due = data.get("nextActionAt") ? new Date(String(data.get("nextActionAt"))).toISOString() : null; void run(() => requestJson(`/api/leads/${lead.id}/contact`, "POST", { channel: data.get("channel"), outcome: data.get("outcome"), summary: data.get("summary"), nextAction: data.get("nextAction") || null, nextActionAt: due, expectedVersion: lead.version })); }} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium">Canal<select name="channel" className={`mt-1.5 ${controlClass}`}><option value="PHONE">Telefone</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option><option value="MEETING">Reunião</option><option value="OTHER">Outro</option></select></label><label className="text-xs font-medium">Resultado<select name="outcome" className={`mt-1.5 ${controlClass}`}><option value="REACHED_DECISION_MAKER">Falou com decisor</option><option value="REACHED_STAFF">Falou com equipe</option><option value="NO_ANSWER">Sem resposta</option><option value="FOLLOW_UP_REQUESTED">Pediu follow-up</option><option value="INTERESTED">Interessado</option><option value="NOT_INTERESTED">Não interessado</option><option value="WRONG_CONTACT">Contato errado</option><option value="OTHER">Outro</option></select></label></div><label className="block text-xs font-medium">Resumo<textarea name="summary" required rows={4} className={`mt-1.5 ${textareaClass}`} placeholder="Resumo do contato"/></label><label className="block text-xs font-medium">Próxima ação<input name="nextAction" className={`mt-1.5 ${controlClass}`} placeholder="Recomendado"/></label><label className="block text-xs font-medium">Data da próxima ação<input name="nextActionAt" type="datetime-local" className={`mt-1.5 ${controlClass}`}/></label><Submit busy={busy}/></form> : null}

        {mode === "outcome" ? <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); void run(() => requestJson(`/api/leads/${lead.id}/outcome`, "POST", { outcome: data.get("outcome"), reason: data.get("reason"), notes: data.get("notes") || undefined, expectedVersion: lead.version })); }}><label className="block text-xs font-medium">Resultado<select name="outcome" className={`mt-1.5 ${controlClass}`}><option value="WON">Ganho</option><option value="LOST">Perdido</option><option value="NURTURE">Nutrição</option><option value="DO_NOT_CONTACT">Não contatar</option><option value="INVALID">Inválido</option></select></label><label className="block text-xs font-medium">Motivo<input name="reason" required className={`mt-1.5 ${controlClass}`} placeholder="Obrigatório"/></label><label className="block text-xs font-medium">Notas<textarea name="notes" rows={4} className={`mt-1.5 ${textareaClass}`} placeholder="Notas adicionais"/></label><Submit busy={busy}/></form> : null}

        {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p> : null}
      </div>
    </ModalShell>
  </>;
}

function title(mode: Exclude<Mode, null>) { return ({ edit: "Editar lead", note: "Adicionar nota", next: "Definir próxima ação", contact: "Registrar contato", stage: "Mover estágio", outcome: "Definir resultado" })[mode]; }
function Submit({ busy }: { busy: boolean }) { return <div className="mt-5 flex justify-end border-t border-default pt-4"><button disabled={busy} className={buttonPrimaryClass}>{busy ? "Salvando…" : "Salvar"}</button></div>; }
function Field({ name, label, type = "text", defaultValue, required = false, autoFocus = false }: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean; autoFocus?: boolean }) { return <label className="text-xs font-medium">{label}<input name={name} type={type} required={required} autoFocus={autoFocus} defaultValue={defaultValue} min={type === "number" ? 0 : undefined} max={type === "number" ? 100 : undefined} className={`mt-1.5 ${controlClass}`}/></label>; }
