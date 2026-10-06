"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LEAD_STATUSES, SERVICE_OPPORTUNITIES, type Lead, type LeadStatus, type UserSummary } from "@/lib/domain/types";
import { STATUS_LABELS } from "@/lib/domain/status";

type Mode = null | "edit" | "note" | "next" | "contact" | "stage" | "outcome";

async function requestJson(url: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await response.json();
  if (!response.ok) throw new Error(json?.error?.message ?? "Falha na operação");
  return json;
}

const fieldClass = "h-10 w-full rounded-md border border-default bg-[var(--panel)] px-3 text-sm";

export function LeadActions({ lead, users }: { lead: Lead; users: UserSummary[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => { setMode(null); setError(null); };
  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); close(); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(false); }
  }

  return <>
    <div className="flex flex-wrap gap-2">
      <button onClick={() => setMode("edit")} className="rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-xs font-medium hover:bg-[var(--panel-2)]">Editar</button>
      <button onClick={() => setMode("note")} className="rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-xs font-medium hover:bg-[var(--panel-2)]">Adicionar nota</button>
      <button onClick={() => setMode("contact")} disabled={lead.doNotContact} className="rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-xs font-medium hover:bg-[var(--panel-2)] disabled:cursor-not-allowed disabled:opacity-40">Registrar contato</button>
      <button onClick={() => setMode("next")} className="rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-xs font-medium hover:bg-[var(--panel-2)]">Próxima ação</button>
      <button onClick={() => setMode("stage")} className="rounded-md bg-[var(--text)] px-3 py-2 text-xs font-medium text-[var(--panel)]">Mover estágio</button>
      <button onClick={() => setMode("outcome")} className="rounded-md border border-default px-3 py-2 text-xs font-medium text-muted hover:bg-[var(--panel)]">Outcome</button>
    </div>

    {mode ? <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4" onMouseDown={(e) => { if (e.currentTarget === e.target) close(); }}>
      <div className="surface my-6 w-full max-w-xl rounded-xl p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{title(mode)}</h2><button onClick={close} className="text-sm text-muted">Fechar</button></div>

        {mode === "edit" ? <form onSubmit={(e) => {
          e.preventDefault(); const data = new FormData(e.currentTarget);
          const score = String(data.get("score") ?? "");
          const body = {
            name: data.get("name"), segment: data.get("segment") || null, city: data.get("city") || null, state: data.get("state") || null,
            website: data.get("website") || null, phone: data.get("phone") || null, whatsapp: data.get("whatsapp") || null, email: data.get("email") || null,
            contactName: data.get("contactName") || null, contactRole: data.get("contactRole") || null,
            score: score === "" ? null : Number(score), primaryOpportunity: data.get("opportunity") || null, opportunityNotes: data.get("opportunityNotes") || null,
            ownerId: data.get("ownerId") || null, expectedVersion: lead.version,
          };
          void run(() => requestJson(`/api/leads/${lead.id}`, "PATCH", body));
        }}><div className="grid gap-3 sm:grid-cols-2">
          <Field name="name" label="Empresa" defaultValue={lead.name} required/><Field name="segment" label="Segmento" defaultValue={lead.segment ?? ""}/><Field name="city" label="Cidade" defaultValue={lead.city ?? ""}/><Field name="state" label="UF" defaultValue={lead.state ?? ""}/><Field name="website" label="Website" type="url" defaultValue={lead.website ?? ""}/><Field name="phone" label="Telefone" defaultValue={lead.phone ?? ""}/><Field name="whatsapp" label="WhatsApp" defaultValue={lead.whatsapp ?? ""}/><Field name="email" label="Email" type="email" defaultValue={lead.email ?? ""}/><Field name="contactName" label="Contato" defaultValue={lead.contactName ?? ""}/><Field name="contactRole" label="Cargo" defaultValue={lead.contactRole ?? ""}/><Field name="score" label="Score" type="number" defaultValue={lead.score?.toString() ?? ""}/>
          <label className="text-xs font-medium">Oportunidade<select name="opportunity" defaultValue={lead.primaryOpportunity ?? ""} className={`mt-1 ${fieldClass}`}><option value="">—</option>{SERVICE_OPPORTUNITIES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
          <label className="text-xs font-medium">Responsável<select name="ownerId" defaultValue={lead.owner?.id ?? ""} className={`mt-1 ${fieldClass}`}><option value="">Sem responsável</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
          <label className="text-xs font-medium sm:col-span-2">Notas da oportunidade<textarea name="opportunityNotes" defaultValue={lead.opportunityNotes ?? ""} rows={4} className="mt-1 w-full rounded-md border border-default bg-[var(--panel)] p-3 text-sm"/></label>
        </div><Submit busy={busy}/></form> : null}

        {mode === "note" ? <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); void run(() => requestJson(`/api/leads/${lead.id}/notes`, "POST", { body: data.get("body") })); }}><textarea name="body" required autoFocus rows={5} className="w-full rounded-md border border-default bg-[var(--panel)] p-3 text-sm" placeholder="Contexto, objeções, próximos passos…"/><Submit busy={busy}/></form> : null}

        {mode === "next" ? <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); const due = data.get("dueAt") ? new Date(String(data.get("dueAt"))).toISOString() : null; void run(() => requestJson(`/api/leads/${lead.id}/next-action`, "POST", { action: data.get("action"), dueAt: due, ownerId: data.get("ownerId") || null, expectedVersion: lead.version })); }}><input name="action" required autoFocus defaultValue={lead.nextAction ?? ""} className={`mb-3 ${fieldClass}`} placeholder="Ex.: ligar para o decisor"/><input name="dueAt" type="datetime-local" className={`mb-3 ${fieldClass}`}/><select name="ownerId" defaultValue={lead.nextActionOwner?.id ?? lead.owner?.id ?? ""} className={fieldClass}><option value="">Sem responsável</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select><Submit busy={busy}/></form> : null}

        {mode === "stage" ? <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); void run(() => requestJson(`/api/leads/${lead.id}/stage`, "POST", { targetStatus: data.get("status") as LeadStatus, reason: data.get("reason"), expectedVersion: lead.version })); }}><select name="status" defaultValue={lead.status} className={`mb-3 ${fieldClass}`}>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select><input name="reason" className={fieldClass} placeholder="Motivo opcional"/><Submit busy={busy}/></form> : null}

        {mode === "contact" ? <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); const due = data.get("nextActionAt") ? new Date(String(data.get("nextActionAt"))).toISOString() : null; void run(() => requestJson(`/api/leads/${lead.id}/contact`, "POST", { channel: data.get("channel"), outcome: data.get("outcome"), summary: data.get("summary"), nextAction: data.get("nextAction") || null, nextActionAt: due, expectedVersion: lead.version })); }} className="space-y-3"><div className="grid grid-cols-2 gap-3"><select name="channel" className={fieldClass}><option value="PHONE">Telefone</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option><option value="MEETING">Reunião</option><option value="OTHER">Outro</option></select><select name="outcome" className={fieldClass}><option value="REACHED_DECISION_MAKER">Falou com decisor</option><option value="REACHED_STAFF">Falou com equipe</option><option value="NO_ANSWER">Sem resposta</option><option value="FOLLOW_UP_REQUESTED">Pediu follow-up</option><option value="INTERESTED">Interessado</option><option value="NOT_INTERESTED">Não interessado</option><option value="WRONG_CONTACT">Contato errado</option><option value="OTHER">Outro</option></select></div><textarea name="summary" required rows={4} className="w-full rounded-md border border-default bg-[var(--panel)] p-3 text-sm" placeholder="Resumo do contato"/><input name="nextAction" className={fieldClass} placeholder="Próxima ação (recomendado)"/><input name="nextActionAt" type="datetime-local" className={fieldClass}/><Submit busy={busy}/></form> : null}

        {mode === "outcome" ? <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); void run(() => requestJson(`/api/leads/${lead.id}/outcome`, "POST", { outcome: data.get("outcome"), reason: data.get("reason"), notes: data.get("notes") || undefined, expectedVersion: lead.version })); }} className="space-y-3"><select name="outcome" className={fieldClass}><option value="WON">Ganho</option><option value="LOST">Perdido</option><option value="NURTURE">Nurture</option><option value="DO_NOT_CONTACT">Não contatar</option><option value="INVALID">Inválido</option></select><input name="reason" required className={fieldClass} placeholder="Motivo obrigatório"/><textarea name="notes" rows={4} className="w-full rounded-md border border-default bg-[var(--panel)] p-3 text-sm" placeholder="Notas adicionais"/><Submit busy={busy}/></form> : null}

        {error ? <p className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p> : null}
      </div>
    </div> : null}
  </>;
}

function title(mode: Exclude<Mode, null>) { return ({ edit: "Editar lead", note: "Adicionar nota", next: "Definir próxima ação", contact: "Registrar contato", stage: "Mover estágio", outcome: "Definir outcome" })[mode]; }
function Submit({ busy }: { busy: boolean }) { return <div className="mt-4 flex justify-end"><button disabled={busy} className="rounded-md bg-[var(--text)] px-4 py-2 text-sm font-medium text-[var(--panel)] disabled:opacity-50">{busy ? "Salvando…" : "Salvar"}</button></div>; }
function Field({ name, label, type = "text", defaultValue, required = false }: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean }) { return <label className="text-xs font-medium">{label}<input name={name} type={type} required={required} defaultValue={defaultValue} min={type === "number" ? 0 : undefined} max={type === "number" ? 100 : undefined} className={`mt-1 ${fieldClass}`}/></label>; }
