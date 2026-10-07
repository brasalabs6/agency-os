import { PageHeader } from "@/components/page-header";
import { ProspectingRunForm } from "@/components/prospecting-run-form";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import { automationStatusMessageKey, prospectingSkillMessageKey } from "@/lib/i18n/domain";
import { getI18n } from "@/lib/i18n/server";
import { listProspectingRuns, SKILL_CATALOG } from "@/lib/services/intelligence";

export default async function ProspectingPage() {
  await requireCurrentUser();
  const [runs, i18n] = await Promise.all([listProspectingRuns(100), getI18n()]);
  const { t } = i18n;

  return <>
    <PageHeader title={t("prospecting.title")} description={t("prospecting.description")}/>
    <div className="grid min-w-0 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <ProspectingRunForm/>
      <section className="surface-flat min-w-0 rounded-xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold">{t("prospecting.runs")}</h2>
        <div className="mt-4 space-y-3">
          {runs.length ? runs.map((run) => <article key={run.id} className="rounded-xl border border-default p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1"><div className="break-words text-sm font-medium">{run.objective}</div><div className="mt-1 break-words text-xs text-muted">{run.region || t("prospecting.noRegion")} · {run.segments.join(", ") || t("prospecting.openSegment")}</div></div>
              <span className="shrink-0 rounded-full border border-default px-2 py-1 text-[11px]">{t(automationStatusMessageKey(run.status))}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                [run.counters.found, t("prospecting.found")],
                [run.counters.imported, t("prospecting.imported")],
                [run.counters.duplicates, t("prospecting.duplicates")],
                [run.counters.rejected, t("prospecting.rejected")],
              ].map(([value, label]) => <div key={String(label)} className="rounded-lg bg-[var(--panel-2)] px-2 py-3 text-center"><strong className="font-mono text-sm">{value}</strong><div className="mt-0.5 text-[11px] text-muted">{label}</div></div>)}
            </div>
          </article>) : <p className="py-8 text-center text-sm text-muted">{t("prospecting.noRuns")}</p>}
        </div>
      </section>
    </div>
    <section className="surface-flat mt-5 rounded-xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold">{t("prospecting.skills")}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SKILL_CATALOG.map((skill) => <div key={skill.id} className="min-w-0 rounded-xl border border-default p-3">
          <div className="flex min-w-0 items-start justify-between gap-2"><code className="min-w-0 break-all text-xs font-semibold">{skill.id}@{skill.version}</code><span className="shrink-0 text-[10px] text-muted">{skill.autonomy}</span></div>
          <p className="mt-2 text-xs leading-5 text-muted">{t(prospectingSkillMessageKey(skill.id))}</p>
        </div>)}
      </div>
    </section>
  </>;
}
