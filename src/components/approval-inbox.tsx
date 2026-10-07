"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalRequest } from "@/lib/domain/automation";
import { automationActionMessageKey, automationStatusMessageKey } from "@/lib/i18n/domain";
import { useI18n } from "./i18n-provider";
import { buttonPrimaryClass, buttonSecondaryClass, textareaClass } from "./ui-kit";

function ApprovalCard({ item, canApprove }: { item: ApprovalRequest; canApprove: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [preview, setPreview] = useState(item.preview);
  const [payload, setPayload] = useState(JSON.stringify(item.payload, null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsed = useMemo(() => {
    try { return JSON.parse(payload) as Record<string, unknown>; }
    catch { return null; }
  }, [payload]);
  const specialized = item.actionType === "PROPOSAL_SEND" || item.actionType === "CONTRACT_SEND";
  const pending = item.status === "PENDING";
  const payloadEditable = canApprove && pending;
  const previewEditable = canApprove && pending && !specialized;

  async function act(kind: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/approvals/${item.id}/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(kind === "approve" ? { expectedVersion: item.version, payload: parsed, preview } : { expectedVersion: item.version }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? t("approvals.updateError"));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("common.errorUnexpected"));
    } finally {
      setBusy(false);
    }
  }

  async function execute() {
    setBusy(true);
    setError(null);
    try {
      const suffix = item.actionType === "WHATSAPP_SEND" ? "execute-whatsapp" : item.actionType === "PROPOSAL_SEND" ? "execute-proposal" : item.actionType === "CONTRACT_SEND" ? "execute-contract" : null;
      if (!suffix) throw new Error(t("approvals.noExecutor"));
      const response = await fetch(`/api/approvals/${item.id}/${suffix}`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? t("approvals.executeError"));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("common.errorUnexpected"));
    } finally {
      setBusy(false);
    }
  }

  const changed = preview !== item.preview || payload !== JSON.stringify(item.payload, null, 2);

  return <article className="surface-flat min-w-0 rounded-xl p-4 sm:p-5">
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><div className="text-[10px] uppercase tracking-wide text-muted">{t(automationActionMessageKey(item.actionType))}</div><h2 className="mt-1 break-words text-sm font-semibold">{item.leadId ? `Lead ${item.leadId.slice(0, 8)}` : t("approvals.noLead")}</h2></div>
      <span className="shrink-0 rounded-full border border-default px-2 py-1 text-[10px]">{t(automationStatusMessageKey(item.status))} · v{item.version}</span>
    </div>
    {item.rationale ? <p className="mt-3 break-words text-xs leading-5 text-muted">{item.rationale}</p> : null}
    {specialized && pending ? <p className="mt-3 rounded-lg border border-default bg-[var(--panel-2)] p-3 text-xs leading-5 text-muted">{t("approvals.versionedDocument")}</p> : null}
    <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wide text-muted">{t("approvals.approvedPreview")}
      <textarea value={preview} onChange={(event) => setPreview(event.target.value)} disabled={!previewEditable} rows={5} className={`mt-1.5 ${textareaClass} text-xs disabled:opacity-70`}/>
    </label>
    <details className="mt-3">
      <summary className="min-h-11 cursor-pointer content-center text-xs text-muted">{t("approvals.structuredPayload")}</summary>
      <textarea value={payload} onChange={(event) => setPayload(event.target.value)} disabled={!payloadEditable} rows={9} className={`mt-2 ${textareaClass} font-mono text-[11px] disabled:opacity-70`}/>
      {payloadEditable && !parsed ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{t("approvals.invalidPayload")}</p> : null}
    </details>
    <div className="mt-4 space-y-1">{item.policyChecks.map((check) => <div key={check.id} className={`break-words text-xs ${check.passed ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>{check.passed ? "✓" : "✕"} {check.message}</div>)}</div>
    {!canApprove && pending ? <p className="mt-3 rounded-lg bg-[var(--panel-2)] p-3 text-xs leading-5 text-muted">{t("approvals.readOnlyRole")}</p> : null}
    {item.status === "EXECUTING" ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">{t("approvals.executingWarning")}</p> : null}
    {error ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p> : null}
    <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
      {pending && canApprove ? <>
        <button disabled={busy || !parsed} onClick={() => void act("approve")} className={buttonPrimaryClass}>{changed ? t("approvals.approveChanges") : t("approvals.approve")}</button>
        <button disabled={busy} onClick={() => void act("reject")} className={buttonSecondaryClass}>{t("approvals.reject")}</button>
      </> : null}
      {item.status === "APPROVED" ? <button disabled={busy} onClick={() => void execute()} className={buttonPrimaryClass}>{t("approvals.execute")}</button> : null}
    </div>
  </article>;
}

export function ApprovalInbox({ items, canApprove }: { items: ApprovalRequest[]; canApprove: boolean }) {
  const { t } = useI18n();
  if (!items.length) return <div className="surface-flat rounded-xl p-8 text-center text-sm text-muted">{t("approvals.none")}</div>;
  return <div className="grid min-w-0 gap-4 xl:grid-cols-2">{items.map((item) => <ApprovalCard key={item.id} item={item} canApprove={canApprove}/>)}</div>;
}
