"use client";

import Link from "next/link";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { LEAD_STATUSES, SERVICE_OPPORTUNITIES, type LeadStatus, type UserSummary } from "@/lib/domain/types";
import { statusMessageKey } from "@/lib/i18n/domain";
import { ModalShell } from "./modal-shell";
import { useI18n } from "./i18n-provider";
import { buttonGhostClass, buttonPrimaryClass, buttonSecondaryClass, controlClass } from "./ui-kit";

export function LeadFilters({ values, users, currentUserId }: { values: Record<string, string | undefined>; users: UserSummary[]; currentUserId: string }) {
  const { t } = useI18n();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const filtersActive = Boolean(values.status || values.owner || values.opportunity || values.segment || values.city || values.scoreMin || values.quick);
  const activeCount = [values.status, values.owner, values.opportunity, values.segment, values.city, values.scoreMin, values.quick].filter(Boolean).length;
  const ownerLabel = values.owner === "me" ? t("leads.me") : values.owner === "unassigned" ? t("leads.unassigned") : users.find((user) => user.id === values.owner)?.name;
  const quickLabels: Record<string, string> = {
    "high-score": t("leads.highScore"),
    today: t("leads.contactToday"),
    overdue: t("leads.overdue"),
    "no-action": t("leads.noAction"),
    proposal: t("leads.proposals"),
    negotiation: t("leads.negotiation"),
    won: t("leads.won"),
  };
  const chips = [
    values.status ? [t("leads.stage"), t(statusMessageKey(values.status as LeadStatus))] : null,
    values.owner ? [t("leads.owner"), ownerLabel ?? values.owner] : null,
    values.opportunity ? [t("leads.opportunity"), values.opportunity.replaceAll("_", " ")] : null,
    values.segment ? [t("leads.segment"), values.segment] : null,
    values.city ? [t("leads.city"), values.city] : null,
    values.scoreMin ? [t("leads.scoreMin"), values.scoreMin] : null,
    values.quick ? [t("leads.quickView"), quickLabels[values.quick] ?? values.quick] : null,
  ].filter(Boolean) as string[][];

  const advancedFields = <>
    <label><span className="mb-1.5 block text-xs font-medium text-muted">{t("leads.opportunity")}</span><select name="opportunity" defaultValue={values.opportunity ?? ""} className={controlClass}><option value="">{t("leads.allOpportunities")}</option>{SERVICE_OPPORTUNITIES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
    <label><span className="mb-1.5 block text-xs font-medium text-muted">{t("leads.segment")}</span><input name="segment" defaultValue={values.segment} placeholder={t("leads.segmentPlaceholder")} className={controlClass}/></label>
    <label><span className="mb-1.5 block text-xs font-medium text-muted">{t("leads.city")}</span><input name="city" defaultValue={values.city} placeholder={t("leads.cityPlaceholder")} className={controlClass}/></label>
    <label><span className="mb-1.5 block text-xs font-medium text-muted">{t("leads.scoreMin")}</span><input name="scoreMin" type="number" min="0" max="100" defaultValue={values.scoreMin} placeholder="0–100" className={controlClass}/></label>
    <label><span className="mb-1.5 block text-xs font-medium text-muted">{t("leads.quickView")}</span><select name="quick" defaultValue={values.quick ?? ""} className={controlClass}><option value="">{t("leads.none")}</option><option value="high-score">{t("leads.highScore")}</option><option value="today">{t("leads.contactToday")}</option><option value="overdue">{t("leads.overdue")}</option><option value="no-action">{t("leads.noAction")}</option><option value="proposal">{t("leads.proposals")}</option><option value="negotiation">{t("leads.negotiation")}</option><option value="won">{t("leads.won")}</option></select></label>
  </>;

  const mobileFields = <div className="grid gap-4">
    <label><span className="mb-1.5 block text-xs font-medium text-muted">{t("leads.stage")}</span><select name="status" defaultValue={values.status ?? ""} className={controlClass}><option value="">{t("leads.allStages")}</option>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{t(statusMessageKey(status))}</option>)}</select></label>
    <label><span className="mb-1.5 block text-xs font-medium text-muted">{t("leads.owner")}</span><select name="owner" defaultValue={values.owner ?? ""} className={controlClass}><option value="">{t("leads.allOwners")}</option><option value="me">{t("leads.me")}</option><option value="unassigned">{t("leads.unassigned")}</option>{users.map((user) => <option key={user.id} value={user.id}>{user.id === currentUserId ? `${user.name} (${t("leads.me").toLowerCase()})` : user.name}</option>)}</select></label>
    {advancedFields}
  </div>;

  const chipsUi = chips.length ? <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium uppercase tracking-wide text-muted">{t("leads.activeFilters")}</span>{chips.map(([label, value]) => <span key={`${label}-${value}`} className="inline-flex items-center gap-1.5 rounded-full border border-default bg-[var(--panel)] px-2.5 py-1.5 text-xs"><span className="text-muted">{label}:</span>{value}</span>)}<Link href="/leads" className={`${buttonSecondaryClass} min-h-9 px-2.5 text-xs`}><X size={13}/>{t("common.clearAll")}</Link></div> : null;

  return <div className="mb-5 space-y-3">
    <form method="get" className="space-y-3 lg:hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <label className="relative"><span className="sr-only">{t("common.search")}</span><Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-muted"/><input name="q" defaultValue={values.q} placeholder={t("leads.searchPlaceholder")} className={`${controlClass} pl-9`}/></label>
        <button type="button" onClick={() => setMobileFiltersOpen(true)} className={buttonSecondaryClass}><SlidersHorizontal size={16}/><span>{t("common.filters")}</span>{activeCount ? <span className="rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-xs font-semibold text-[var(--accent)]">{activeCount}</span> : null}</button>
      </div>
      <button type="submit" className="sr-only">{t("common.search")}</button>
      <ModalShell open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} title={t("common.filters")} description={filtersActive ? t("leads.activeFilters") : undefined}>
        <div className="p-4">{mobileFields}</div>
        <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-default bg-[var(--panel)] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <Link href="/leads" onClick={() => setMobileFiltersOpen(false)} className={buttonGhostClass}>{t("common.clear")}</Link>
          <button type="submit" className={buttonPrimaryClass}>{t("common.apply")}</button>
        </div>
      </ModalShell>
    </form>

    <form method="get" className="hidden space-y-3 lg:block">
      <div className="grid gap-2 xl:grid-cols-[minmax(280px,1fr)_180px_190px_auto_auto]">
        <label className="relative"><span className="sr-only">{t("common.search")}</span><Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-muted"/><input name="q" defaultValue={values.q} placeholder={t("leads.searchPlaceholder")} className={`${controlClass} pl-9`}/></label>
        <select aria-label={t("leads.stage")} name="status" defaultValue={values.status ?? ""} className={controlClass}><option value="">{t("leads.allStages")}</option>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{t(statusMessageKey(status))}</option>)}</select>
        <select aria-label={t("leads.owner")} name="owner" defaultValue={values.owner ?? ""} className={controlClass}><option value="">{t("leads.allOwners")}</option><option value="me">{t("leads.me")}</option><option value="unassigned">{t("leads.unassigned")}</option>{users.map((user) => <option key={user.id} value={user.id}>{user.id === currentUserId ? `${user.name} (${t("leads.me").toLowerCase()})` : user.name}</option>)}</select>
        <button className={buttonPrimaryClass}>{t("common.apply")}</button>
        <Link href="/leads" className={buttonGhostClass}>{t("common.clear")}</Link>
      </div>
      <details open={Boolean(values.opportunity || values.segment || values.city || values.scoreMin || values.quick)} className="group rounded-xl border border-default bg-[var(--panel)]">
        <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3.5 text-sm font-medium hover:bg-[var(--panel-2)]"><span className="flex items-center gap-2"><SlidersHorizontal size={15}/>{t("leads.moreFilters")}</span><ChevronDown size={15} className="text-muted transition-transform group-open:rotate-180"/></summary>
        <div className="grid gap-3 border-t border-default p-3 md:grid-cols-2 xl:grid-cols-5">{advancedFields}</div>
      </details>
    </form>
    {chipsUi}
  </div>;
}
