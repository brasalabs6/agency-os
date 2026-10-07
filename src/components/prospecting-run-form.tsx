"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "./i18n-provider";
import { buttonPrimaryClass, controlClass, textareaClass } from "./ui-kit";

export function ProspectingRunForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [objective, setObjective] = useState("");
  const [region, setRegion] = useState("");
  const [segments, setSegments] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/prospecting", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          objective,
          region: region || null,
          segments: segments.split(",").map((item) => item.trim()).filter(Boolean),
          sources: ["public-web", "maps", "business-directories"],
          maxCandidates: 50,
          icp: {},
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? t("prospecting.createError"));
      setObjective("");
      setRegion("");
      setSegments("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("common.errorUnexpected"));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="surface-flat min-w-0 rounded-xl p-4 sm:p-5">
    <h2 className="text-sm font-semibold">{t("prospecting.new")}</h2>
    <p className="mt-1 text-xs leading-5 text-muted">{t("prospecting.newDescription")}</p>
    <label className="mt-4 block text-xs font-medium">{t("prospecting.objective")}
      <textarea required value={objective} onChange={(event) => setObjective(event.target.value)} rows={4} placeholder={t("prospecting.objectivePlaceholder")} className={`mt-1.5 ${textareaClass}`}/>
    </label>
    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
      <label className="text-xs font-medium">{t("prospecting.region")}<input value={region} onChange={(event) => setRegion(event.target.value)} placeholder={t("prospecting.regionPlaceholder")} className={`mt-1.5 ${controlClass}`}/></label>
      <label className="text-xs font-medium">{t("prospecting.segments")}<input value={segments} onChange={(event) => setSegments(event.target.value)} placeholder={t("prospecting.segmentsPlaceholder")} className={`mt-1.5 ${controlClass}`}/></label>
    </div>
    {error ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p> : null}
    <button disabled={busy} className={`${buttonPrimaryClass} mt-4 w-full sm:w-auto`}>{busy ? t("prospecting.creating") : t("prospecting.create")}</button>
  </form>;
}
