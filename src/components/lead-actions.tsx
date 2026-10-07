"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Ellipsis } from "lucide-react";
import { LEAD_STATUSES, SERVICE_OPPORTUNITIES, type Lead, type LeadStatus, type UserSummary } from "@/lib/domain/types";
import { serviceMessageKey, statusMessageKey } from "@/lib/i18n/domain";
import { ModalShell } from "./modal-shell";
import { useI18n } from "./i18n-provider";
import { buttonPrimaryClass, buttonSecondaryClass, controlClass, textareaClass } from "./ui-kit";

type Mode = null | "edit" | "note" | "next" | "contact" | "stage" | "outcome";

async function requestJson(url: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await response.json();
  if (!response.ok) throw new Error(json?.error?.message ?? "Request failed");
  return json;
}

export function LeadActions({ lead, users, currentUserId }: { lead: Lead; users: UserSummary[]; currentUserId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => { if (!busy) { setMode(null); setError(null); } }, [busy]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); setMode(null); setMoreOpen(false); setError(null); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : t("common.errorUnexpected")); }
    finally { setBusy(false); }
  }

  const assign = lead.owner?.id !== currentUserId ? <button onClick={() => void run(() => requestJson(`/api/leads/${lead.id}`, "PATCH", { ownerId: currentUserId, expectedVersion: lead.version }))} className={buttonSecondaryClass}>{t("leadActions.assignMe")}</button> : null;

  const secondaryActions = <>
    {assign}
    <button onClick={() => { setMode("edit"); setMoreOpen(false); }} className={buttonSecondaryClass}>{t("leadActions.edit")}</button>
    <button onClick={() => { setMode("note"); setMoreOpen(false); }} className={buttonSecondaryClass}>{t("leadActions.addNote")}</button>
    <button onClick={() => { setMode("next"); setMoreOpen(false); }} className={buttonSecondaryClass}>{t("leadActions.nextAction")}</button>
    <button onClick={() => { setMode("outcome"); setMoreOpen(false); }} className={buttonSecondaryClass}>{t("leadActions.outcome")}</button>
  </>;

  return <>
    <div className="relative lg:hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2">
        <button onClick={() => setMode("contact")} disabled={lead.doNotContact} className={buttonSecondaryClass}>{t("leadActions.contact")}</button>
        <button onClick={() => setMode("stage")} className={buttonPrimaryClass}>{t("leadActions.moveStage")}</button>
        <button onClick={() => setMoreOpen((value) => !value)} className={buttonSecondaryClass} aria-expanded={moreOpen} aria-label={t("leadActions.moreActions")}><Ellipsis size={18}/></button>
      </div>
      {moreOpen ? <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 grid min-w-[220px] gap-1 rounded-xl border border-default bg-[var(--panel)] p-2 shadow-xl">{secondaryActions}</div> : null}
    </div>

    <div className="hidden flex-wrap gap-2 lg:flex">
      {assign}
      <button onClick={() => setMode("edit")} className={buttonSecondaryClass}>{t("leadActions.edit")}</button>
      <button onClick={() => setMode("note")} className={buttonSecondaryClass}>{t("leadActions.addNote")}</button>
      <button onClick={() => setMode("contact")} disabled={lead.doNotContact} className={buttonSecondaryClass}>{t("leadActions.contact")}</button>
      <button onClick={() => setMode("next")} className={buttonSecondaryClass}>{t("leadActions.nextAction")}</button>
      <button onClick={() => setMode("stage")} className={buttonPrimaryClass}>{t("leadActions.moveStage")}</button>
      <button onClick={() => setMode("outcome")} className={buttonSecondaryClass}>{t("leadActions.outcome")}</button>
    </div>

    <ModalShell open={Boolean(mode)} onClose={close} title={mode ? title(mode, t) : "Lead"} description={mode === "edit" ? t("leadActions.editDescription") : undefined} sizeClass={mode === "edit" ? "sm:max-w-2xl" : "sm:max-w-xl"}>
      <div className="p-4 sm:p-5">
        {mode === "edit" ? <form onSubmit={(e) => {
          e.preventDefault(); const data = new FormData(e.currentTarget); const score = String(data.get("score") ?? "");
          const body = { name: data.get("name"), segment: data.get("segment") || null, city: data.get("city") || null, state: data.get("state") || null, website: data.get("website") || null, phone: data.get("phone") || null, whatsapp: data.get("whatsapp") || null, email: data.get("email") || null, contactName: data.get("contactName") || null, contactRole: data.get("contactRole") || null, score: score === "" ? null : Number(score), primaryOpportunity: data.get("opportunity") || null, opportunityNotes: data.get("opportunityNotes") || null, ownerId: data.get("ownerId") || null, expectedVersion: lead.version };
          void run(() => requestJson(`/api/leads/${lead.id}`, "PATCH", body));
        }}><div className="grid gap-4 sm:grid-cols-2">
          <Field name="name" label={t("leads.company")} defaultValue={lead.name} required autoFocus/><Field name="segment" label={t("leads.segment")} defaultValue={lead.segment ?? ""}/><Field name="city" label={t("leads.city")} defaultValue={lead.city ?? ""}/><Field name="state" label={t("leads.state")} defaultValue={lead.state ?? ""}/><Field name="website" label={t("leads.website")} type="url" defaultValue={lead.website ?? ""}/><Field name="phone" label={t("leads.phone")} defaultValue={lead.phone ?? ""}/><Field name="whatsapp" label="WhatsApp" defaultValue={lead.whatsapp ?? ""}/><Field name="email" label={t("leads.email")} type="email" defaultValue={lead.email ?? ""}/><Field name="contactName" label={t("leadActions.contactName")} defaultValue={lead.contactName ?? ""}/><Field name="contactRole" label={t("leadActions.role")} defaultValue={lead.contactRole ?? ""}/><Field name="score" label={t("leadActions.score")} type="number" defaultValue={lead.score?.toString() ?? ""}/>
          <label className="text-xs font-medium">{t("leads.opportunity")}<select name="opportunity" defaultValue={lead.primaryOpportunity ?? ""} className={`mt-1.5 ${controlClass}`}><option value="">{t("leads.notDefined")}</option>{SERVICE_OPPORTUNITIES.map((item) => <option key={item} value={item}>{t(serviceMessageKey(item))}</option>)}</select></label>
          <label className="text-xs font-medium">{t("leads.owner")}<select name="ownerId" defaultValue={lead.owner?.id ?? ""} className={`mt-1.5 ${controlClass}`}><option value="">{t("common.noOwner")}</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
          <label className="text-xs font-medium sm:col-span-2">{t("leadActions.opportunityNotes")}<textarea name="opportunityNotes" defaultValue={lead.opportunityNotes ?? ""} rows={4} className={`mt-1.5 ${textareaClass}`}/></label>
        </div><Submit busy={busy} t={t}/></form> : null}

        {mode === "note" ? <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); void run(() => requestJson(`/api/leads/${lead.id}/notes`, "POST", { body: data.get("body") })); }}><label className="text-xs font-medium">{t("leadActions.note")}<textarea name="body" required autoFocus rows={6} className={`mt-1.5 ${textareaClass}`} placeholder={t("leadActions.notePlaceholder")}/></label><Submit busy={busy} t={t}/></form> : null}

        {mode === "next" ? <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); const due = data.get("dueAt") ? new Date(String(data.get("dueAt"))).toISOString() : null; void run(() => requestJson(`/api/leads/${lead.id}/next-action`, "POST", { action: data.get("action"), dueAt: due, ownerId: data.get("ownerId") || null, expectedVersion: lead.version })); }}><label className="block text-xs font-medium">{t("leadActions.action")}<input name="action" required autoFocus defaultValue={lead.nextAction ?? ""} className={`mt-1.5 ${controlClass}`} placeholder={t("leadActions.actionPlaceholder")}/></label><label className="block text-xs font-medium">{t("leads.deadline")}<input name="dueAt" type="datetime-local" className={`mt-1.5 ${controlClass}`}/></label><label className="block text-xs font-medium">{t("leads.owner")}<select name="ownerId" defaultValue={lead.nextActionOwner?.id ?? lead.owner?.id ?? ""} className={`mt-1.5 ${controlClass}`}><option value="">{t("common.noOwner")}</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><Submit busy={busy} t={t}/></form> : null}

        {mode === "stage" ? <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); void run(() => requestJson(`/api/leads/${lead.id}/stage`, "POST", { targetStatus: data.get("status") as LeadStatus, reason: data.get("reason"), expectedVersion: lead.version })); }}><label className="block text-xs font-medium">{t("leadActions.stageTitle")}<select name="status" defaultValue={lead.status} className={`mt-1.5 ${controlClass}`}>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{t(statusMessageKey(status))}</option>)}</select></label><label className="block text-xs font-medium">{t("leadActions.reason")}<input name="reason" className={`mt-1.5 ${controlClass}`} placeholder={t("common.optional")}/></label><Submit busy={busy} t={t}/></form> : null}

        {mode === "contact" ? <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); const due = data.get("nextActionAt") ? new Date(String(data.get("nextActionAt"))).toISOString() : null; void run(() => requestJson(`/api/leads/${lead.id}/contact`, "POST", { channel: data.get("channel"), outcome: data.get("outcome"), summary: data.get("summary"), nextAction: data.get("nextAction") || null, nextActionAt: due, expectedVersion: lead.version })); }} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium">{t("leadActions.channel")}<select name="channel" className={`mt-1.5 ${controlClass}`}><option value="PHONE">{t("leadActions.phone")}</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option><option value="MEETING">{t("leadActions.meeting")}</option><option value="OTHER">{t("leadActions.other")}</option></select></label><label className="text-xs font-medium">{t("leadActions.outcome")}<select name="outcome" className={`mt-1.5 ${controlClass}`}><option value="REACHED_DECISION_MAKER">{t("leadActions.reachedDecisionMaker")}</option><option value="REACHED_STAFF">{t("leadActions.reachedStaff")}</option><option value="NO_ANSWER">{t("leadActions.noAnswer")}</option><option value="FOLLOW_UP_REQUESTED">{t("leadActions.followUpRequested")}</option><option value="INTERESTED">{t("leadActions.interested")}</option><option value="NOT_INTERESTED">{t("leadActions.notInterested")}</option><option value="WRONG_CONTACT">{t("leadActions.wrongContact")}</option><option value="OTHER">{t("leadActions.other")}</option></select></label></div><label className="block text-xs font-medium">{t("leadActions.summary")}<textarea name="summary" required rows={4} className={`mt-1.5 ${textareaClass}`} placeholder={t("leadActions.summaryPlaceholder")}/></label><label className="block text-xs font-medium">{t("leads.nextAction")}<input name="nextAction" className={`mt-1.5 ${controlClass}`} placeholder={t("leadActions.recommended")}/></label><label className="block text-xs font-medium">{t("leadActions.nextActionDate")}<input name="nextActionAt" type="datetime-local" className={`mt-1.5 ${controlClass}`}/></label><Submit busy={busy} t={t}/></form> : null}

        {mode === "outcome" ? <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); void run(() => requestJson(`/api/leads/${lead.id}/outcome`, "POST", { outcome: data.get("outcome"), reason: data.get("reason"), notes: data.get("notes") || undefined, expectedVersion: lead.version })); }}><label className="block text-xs font-medium">{t("leadActions.outcome")}<select name="outcome" className={`mt-1.5 ${controlClass}`}><option value="WON">{t("leadActions.outcomeWon")}</option><option value="LOST">{t("leadActions.outcomeLost")}</option><option value="NURTURE">{t("leadActions.outcomeNurture")}</option><option value="DO_NOT_CONTACT">{t("leadActions.outcomeDnc")}</option><option value="INVALID">{t("leadActions.outcomeInvalid")}</option></select></label><label className="block text-xs font-medium">{t("leadActions.reason")}<input name="reason" required className={`mt-1.5 ${controlClass}`} placeholder={t("leadActions.required")}/></label><label className="block text-xs font-medium">{t("leadActions.notes")}<textarea name="notes" rows={4} className={`mt-1.5 ${textareaClass}`} placeholder={t("leadActions.notesPlaceholder")}/></label><Submit busy={busy} t={t}/></form> : null}

        {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p> : null}
      </div>
    </ModalShell>
  </>;
}

function title(mode: Exclude<Mode, null>, t: ReturnType<typeof useI18n>["t"]) {
  return ({ edit: t("leadActions.editTitle"), note: t("leadActions.noteTitle"), next: t("leadActions.nextTitle"), contact: t("leadActions.contactTitle"), stage: t("leadActions.stageTitle"), outcome: t("leadActions.outcomeTitle") })[mode];
}
function Submit({ busy, t }: { busy: boolean; t: ReturnType<typeof useI18n>["t"] }) { return <div className="sticky bottom-0 mt-5 flex justify-end border-t border-default bg-[var(--panel)] pt-3 pb-[env(safe-area-inset-bottom)]"><button disabled={busy} className={buttonPrimaryClass}>{busy ? t("common.saving") : t("common.save")}</button></div>; }
function Field({ name, label, type = "text", defaultValue, required = false, autoFocus = false }: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean; autoFocus?: boolean }) { return <label className="text-xs font-medium">{label}<input name={name} type={type} required={required} autoFocus={autoFocus} defaultValue={defaultValue} min={type === "number" ? 0 : undefined} max={type === "number" ? 100 : undefined} className={`mt-1.5 ${controlClass}`}/></label>; }
