"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "./i18n-provider";
import { buttonPrimaryClass, controlClass } from "./ui-kit";

export function ChannelConnectionForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [label, setLabel] = useState("");
  const [externalId, setExternalId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/channels/whatsapp/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountLabel: label, externalAccountId: externalId || null, capabilities: ["READ"] }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? t("conversations.connectionError"));
      setLabel("");
      setExternalId("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("common.errorUnexpected"));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="surface-flat min-w-0 rounded-xl p-4 sm:p-5">
    <h2 className="text-sm font-semibold">{t("conversations.connectionTitle")}</h2>
    <p className="mt-1 text-xs leading-5 text-muted">{t("conversations.connectionDescription")}</p>
    <label className="mt-4 block text-xs font-medium">{t("conversations.accountName")}<input required value={label} onChange={(event) => setLabel(event.target.value)} placeholder={t("conversations.accountPlaceholder")} className={`mt-1.5 ${controlClass}`}/></label>
    <label className="mt-3 block text-xs font-medium">{t("conversations.externalId")}<input value={externalId} onChange={(event) => setExternalId(event.target.value)} placeholder={t("conversations.externalIdPlaceholder")} className={`mt-1.5 ${controlClass}`}/></label>
    {error ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p> : null}
    <button disabled={busy} className={`${buttonPrimaryClass} mt-4 w-full sm:w-auto`}>{busy ? t("conversations.saving") : t("conversations.addConnection")}</button>
  </form>;
}
