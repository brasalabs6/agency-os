import Link from "next/link";
import type { AutomationBundle, DiagnosticFinding } from "@/lib/domain/automation";
import { automationFactMessageKey, automationSeverityMessageKey, automationStatusMessageKey } from "@/lib/i18n/domain";
import { intlLocale } from "@/lib/i18n/messages";
import { getI18n } from "@/lib/i18n/server";

type T = Awaited<ReturnType<typeof getI18n>>["t"];

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-muted">{text}</p>;
}

function ScoreGrid({ scores, t }: { scores: Record<string, number>; t: T }) {
  const entries = Object.entries(scores);
  if (!entries.length) return <Empty text={t("automation.noScorecard")}/>;
  return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{entries.map(([key, value]) =>
    <div key={key} className="min-w-0 rounded-lg border border-default bg-[var(--panel-2)] p-3">
      <div className="flex min-w-0 items-center justify-between gap-3"><span className="min-w-0 break-words text-xs capitalize text-muted">{key.replaceAll("_", " ")}</span><span className="shrink-0 font-mono text-sm font-semibold">{value}</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }}/></div>
    </div>)}</div>;
}

function Findings({ title, items, t }: { title: string; items: DiagnosticFinding[]; t: T }) {
  return <div className="min-w-0"><h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
    <div className="space-y-2">{items.length ? items.map((item, index) =>
      <div key={index} className="min-w-0 rounded-lg border border-default p-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2"><span className="min-w-0 break-words text-sm font-medium">{item.title}</span><span className="rounded border border-default px-1.5 py-0.5 text-[10px] text-muted">{t(automationSeverityMessageKey(item.severity))}</span>{item.confidence != null ? <span className="text-[10px] text-muted">{t("automation.confidence", { value: item.confidence })}</span> : null}</div>
        <p className="mt-1 break-words text-xs leading-5 text-muted">{item.explanation}</p>
      </div>) : <Empty text={t("automation.noItems")}/>}</div>
  </div>;
}

export async function LeadAutomationPanel({ leadId, data }: { leadId: string; data: AutomationBundle }) {
  const { locale, t } = await getI18n();
  const diagnostic = data.diagnostics[0] ?? null;
  const proposal = data.proposals[0] ?? null;
  const contract = data.contracts[0] ?? null;
  const pendingApprovals = data.approvals.filter((item) => item.status === "PENDING");
  const formatDate = (value: string) => new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(value));
  const formatDateTime = (value: string) => new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));

  return <div className="min-w-0 space-y-5">
    <section className="surface-flat min-w-0 rounded-xl p-4 sm:p-5">
      <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="text-sm font-semibold">{t("automation.intelligence")}</h2><p className="mt-1 text-xs leading-5 text-muted">{t("automation.intelligenceDescription")}</p></div>
        <Link href={`/approvals?leadId=${leadId}`} className="focus-ring inline-flex min-h-11 shrink-0 items-center rounded-lg border border-default px-3 text-xs font-medium hover:bg-[var(--panel-2)]">{t("automation.approvals")}{pendingApprovals.length ? ` · ${pendingApprovals.length}` : ""}</Link>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-default p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t("automation.businessProfile")}</h3>
          {data.businessProfile ? <>
            <div className="mt-3 grid gap-2 text-xs">
              <div><span className="text-muted">{t("automation.snapshot")}:</span> v{data.businessProfile.version}</div>
              <div><span className="text-muted">{t("automation.facts")}:</span> {data.businessProfile.facts.length}</div>
              <div><span className="text-muted">{t("automation.competition")}:</span> {data.businessProfile.competition.length}</div>
            </div>
            <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
              {data.businessProfile.facts.slice(0, 12).map((fact, index) => <div key={index} className="min-w-0 rounded-lg bg-[var(--panel-2)] p-3 text-xs">
                <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><strong className="min-w-0 break-words">{fact.key}</strong><span className="shrink-0 text-[10px] text-muted">{t(automationFactMessageKey(fact.classification))}{fact.confidence != null ? ` · ${fact.confidence}%` : ""}</span></div>
                <p className="mt-1 break-words text-muted [overflow-wrap:anywhere]">{fact.value}</p>
                {fact.sourceUrl ? <a href={fact.sourceUrl} target="_blank" rel="noreferrer" className="focus-ring mt-2 inline-flex min-h-9 max-w-full items-center rounded-md text-[10px] underline"><span className="max-w-full truncate">{t("automation.source")}: {fact.sourceUrl}</span></a> : null}
              </div>)}
            </div>
          </> : <div className="mt-3"><Empty text={t("automation.noProfile")}/></div>}
        </div>

        <div className="min-w-0 rounded-xl border border-default p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t("automation.latestDiagnostic")}</h3>
          {diagnostic ? <>
            <div className="mt-2 flex items-center gap-2"><span className="rounded-full border border-default px-2 py-1 text-[10px]">{t(automationStatusMessageKey(diagnostic.status))}</span><span className="text-[10px] text-muted">v{diagnostic.version}</span></div>
            <p className="mt-3 break-words text-sm leading-6">{diagnostic.executiveSummary || t("automation.noExecutiveSummary")}</p>
            <div className="mt-4"><ScoreGrid scores={diagnostic.scores} t={t}/></div>
          </> : <div className="mt-3"><Empty text={t("automation.noDiagnostic")}/></div>}
        </div>
      </div>

      {diagnostic ? <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-2"><Findings title={t("automation.strengths")} items={diagnostic.strengths} t={t}/><Findings title={t("automation.gaps")} items={diagnostic.gaps} t={t}/></div> : null}
    </section>

    <section className="surface-flat min-w-0 rounded-xl p-4 sm:p-5">
      <div className="mb-4"><h2 className="text-sm font-semibold">{t("automation.conversationsQualification")}</h2><p className="mt-1 text-xs leading-5 text-muted">{t("automation.conversationsQualificationDescription")}</p></div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("automation.whatsapp")}</h3>
          {data.conversations.length ? <div className="space-y-2">{data.conversations.slice(0, 5).map((conversation) => <div key={conversation.id} className="min-w-0 rounded-xl border border-default p-3">
            <div className="flex min-w-0 flex-wrap justify-between gap-2 text-xs"><strong className="min-w-0 break-all">{conversation.contactDisplayName ?? conversation.contactAddress}</strong><span className={conversation.optOutDetected ? "text-red-600" : "text-muted"}>{conversation.optOutDetected ? t("automation.optOut") : t("automation.messages", { count: conversation.messages.length })}</span></div>
            <p className="mt-2 line-clamp-2 break-words text-xs text-muted">{conversation.messages.at(-1)?.text ?? t("conversations.noMessages")}</p>
          </div>)}</div> : <Empty text={t("automation.noConversation")}/>}
        </div>

        <div className="min-w-0">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("automation.qualification")}</h3>
          {data.qualification ? <div className="min-w-0 rounded-xl border border-default p-3 text-xs">
            <div className="break-words"><span className="text-muted">{t("automation.problems")}:</span> {data.qualification.problemStatements.join(" · ") || "—"}</div>
            <div className="mt-2 break-words"><span className="text-muted">{t("automation.goal")}:</span> {data.qualification.desiredOutcome ?? "—"}</div>
            <div className="mt-2 break-words"><span className="text-muted">{t("automation.decisionMakers")}:</span> {data.qualification.decisionMakers.join(", ") || "—"}</div>
            <div className="mt-2"><span className="text-muted">{t("automation.openQuestions")}:</span> {data.qualification.unansweredQuestions.length}</div>
          </div> : <Empty text={t("automation.noQualification")}/>}
        </div>
      </div>
    </section>

    <section className="surface-flat min-w-0 rounded-xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold">{t("automation.proposalsContractsExecution")}</h2>
      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-3">
        <div className="min-w-0 rounded-xl border border-default p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t("automation.proposal")}</h3>
          {proposal ? <><div className="mt-2 break-words text-sm font-medium">v{proposal.version} · {t(automationStatusMessageKey(proposal.status))}</div><div className="mt-2 break-words text-xs text-muted">{proposal.services.join(", ")}</div><div className="mt-2 break-words text-xs">{proposal.agencyFeeCents == null ? t("automation.priceHumanRequired") : t("automation.price", { value: new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: proposal.currency }).format(proposal.agencyFeeCents / 100) })}</div></> : <Empty text={t("automation.noItems")}/>}
        </div>
        <div className="min-w-0 rounded-xl border border-default p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t("automation.contract")}</h3>
          {contract ? <><div className="mt-2 break-words text-sm font-medium">v{contract.version} · {t(automationStatusMessageKey(contract.status))}</div><div className="mt-2 break-words text-xs text-muted">{t("automation.template", { id: contract.templateId, version: contract.templateVersion })}</div><div className="mt-2 text-xs">{contract.signedAt ? t("automation.signedAt", { date: formatDate(contract.signedAt) }) : t("automation.notSigned")}</div></> : <Empty text={t("automation.noItems")}/>}
        </div>
        <div className="min-w-0 rounded-xl border border-default p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{t("automation.projects")}</h3>
          {data.projects.length ? <div className="mt-2 space-y-2">{data.projects.map((project) => {
            const open = project.obligations.filter((item) => item.status !== "DONE" && item.status !== "CANCELED").length;
            return <div key={project.id} className="min-w-0"><div className="break-words text-sm font-medium">{project.name}</div><div className="text-xs text-muted">{t("automation.openObligations", { status: t(automationStatusMessageKey(project.status)), count: open })}</div></div>;
          })}</div> : <Empty text={t("automation.noProjects")}/>}
        </div>
      </div>
    </section>

    <section className="surface-flat min-w-0 rounded-xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold">{t("automation.aiRuns")}</h2>
      {data.aiRuns.length ? <>
        <div className="mt-3 space-y-2 sm:hidden">{data.aiRuns.slice(0, 12).map((run) => <div key={run.id} className="rounded-xl border border-default p-3 text-xs">
          <div className="break-all font-medium">{run.skill}@{run.skillVersion}</div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted"><span>{t(automationStatusMessageKey(run.status))}</span><span>{run.startedAt ? formatDateTime(run.startedAt) : "—"}</span><span>{run.completedAt ? formatDateTime(run.completedAt) : "—"}</span></div>
        </div>)}</div>
        <div className="mt-3 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b border-default text-muted"><th className="py-2">{t("automation.skill")}</th><th>{t("automation.status")}</th><th>{t("automation.start")}</th><th>{t("automation.end")}</th></tr></thead><tbody>{data.aiRuns.slice(0, 12).map((run) => <tr key={run.id} className="border-b border-default/60"><td className="py-2 font-medium">{run.skill}@{run.skillVersion}</td><td>{t(automationStatusMessageKey(run.status))}</td><td>{run.startedAt ? formatDateTime(run.startedAt) : "—"}</td><td>{run.completedAt ? formatDateTime(run.completedAt) : "—"}</td></tr>)}</tbody></table>
        </div>
      </> : <div className="mt-3"><Empty text={t("automation.noRuns")}/></div>}
    </section>
  </div>;
}
