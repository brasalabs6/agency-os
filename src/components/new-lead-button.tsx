"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SERVICE_OPPORTUNITIES } from "@/lib/domain/types";
import { serviceMessageKey } from "@/lib/i18n/domain";
import { ModalShell } from "./modal-shell";
import { useI18n } from "./i18n-provider";
import { buttonGhostClass, buttonPrimaryClass, controlClass } from "./ui-kit";

export function NewLeadButton() {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close() { if (!busy) { setOpen(false); setError(null); } }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(null);
    const data = new FormData(event.currentTarget);
    const body = { name: data.get("name"), segment: data.get("segment") || null, city: data.get("city") || null, state: data.get("state") || null, website: data.get("website") || null, phone: data.get("phone") || null, email: data.get("email") || null, primaryOpportunity: data.get("opportunity") || null, tags: ["manual"] };
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error?.message ?? t("common.errorUnexpected"));
      setOpen(false);
      router.push(`/leads/${json.id}`);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : t("common.errorUnexpected")); }
    finally { setBusy(false); }
  }

  return <><button onClick={() => setOpen(true)} className={buttonPrimaryClass}><Plus size={15}/>{t("leads.new")}</button><ModalShell open={open} onClose={close} title={t("leads.new")} description={t("leads.newDescription")} sizeClass="sm:max-w-2xl">
    <form onSubmit={submit}>
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"><Field name="name" label={t("leads.company")} required autoFocus/><Field name="segment" label={t("leads.segment")}/><Field name="city" label={t("leads.city")}/><Field name="state" label={t("leads.state")}/><Field name="website" label={t("leads.website")} type="url"/><Field name="phone" label={t("leads.phone")}/><Field name="email" label={t("leads.email")} type="email"/><label className="text-xs font-medium">{t("leads.opportunity")}<select name="opportunity" className={`mt-1.5 ${controlClass}`}><option value="">{t("leads.notDefined")}</option>{SERVICE_OPPORTUNITIES.map((item) => <option key={item} value={item}>{t(serviceMessageKey(item))}</option>)}</select></label></div>
      {error ? <p className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300 sm:mx-5">{error}</p> : null}
      <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-default bg-[var(--panel)] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:flex-row sm:justify-end sm:px-5 sm:pb-4"><button type="button" onClick={close} className={buttonGhostClass}>{t("common.cancel")}</button><button disabled={busy} className={buttonPrimaryClass}>{busy ? t("leads.creating") : t("leads.create")}</button></div>
    </form>
  </ModalShell></>;
}

function Field({ name, label, type = "text", required = false, autoFocus = false }: { name: string; label: string; type?: string; required?: boolean; autoFocus?: boolean }) {
  return <label className="text-xs font-medium">{label}<input name={name} type={type} required={required} autoFocus={autoFocus} className={`mt-1.5 ${controlClass}`}/></label>;
}
