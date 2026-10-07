import Link from "next/link";
import type { AutomationBundle, DiagnosticFinding } from "@/lib/domain/automation";

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>;
}

function ScoreGrid({ scores }: { scores: Record<string, number> }) {
  const entries=Object.entries(scores);
  if(!entries.length)return <Empty>Sem scorecard estruturado.</Empty>;
  return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{entries.map(([key,value])=>
    <div key={key} className="rounded-lg border border-default bg-[var(--panel-2)] p-3">
      <div className="flex items-center justify-between gap-3"><span className="text-xs capitalize text-muted">{key.replaceAll("_"," ")}</span><span className="font-mono text-sm font-semibold">{value}</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{width:String(Math.max(0,Math.min(100,value)))+"%"}}/></div>
    </div>)}</div>;
}

function Findings({ title, items }: { title:string; items:DiagnosticFinding[] }) {
  return <div><h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
    <div className="space-y-2">{items.length?items.map((item,index)=>
      <div key={index} className="rounded-lg border border-default p-3">
        <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{item.title}</span><span className="rounded border border-default px-1.5 py-0.5 text-[10px] text-muted">{item.severity}</span>{item.confidence!=null?<span className="text-[10px] text-muted">{item.confidence}% confiança</span>:null}</div>
        <p className="mt-1 text-xs leading-5 text-muted">{item.explanation}</p>
      </div>):<Empty>Nenhum item registrado.</Empty>}</div>
  </div>;
}

export function LeadAutomationPanel({ leadId, data }: { leadId:string; data:AutomationBundle }) {
  const diagnostic=data.diagnostics[0]??null;
  const proposal=data.proposals[0]??null;
  const contract=data.contracts[0]??null;
  const pendingApprovals=data.approvals.filter((item)=>item.status==="PENDING");
  return <div className="space-y-5">
    <section className="surface-flat rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-sm font-semibold">Inteligência comercial</h2><p className="mt-1 text-xs text-muted">Perfil pesquisado, diagnóstico e scoring versionados pelo AgencyOS.</p></div>
        <div className="flex gap-2"><Link href={"/approvals?leadId="+leadId} className="rounded-lg border border-default px-3 py-2 text-xs hover:bg-[var(--panel-2)]">Aprovações{pendingApprovals.length?" · "+pendingApprovals.length:""}</Link></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-default p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Business Profile</h3>
          {data.businessProfile?<><div className="mt-3 grid gap-2 text-xs">
            <div><span className="text-muted">Snapshot:</span> v{data.businessProfile.version}</div>
            <div><span className="text-muted">Fatos:</span> {data.businessProfile.facts.length}</div>
            <div><span className="text-muted">Concorrentes/referências:</span> {data.businessProfile.competition.length}</div>
          </div><div className="mt-3 max-h-44 space-y-2 overflow-y-auto">{data.businessProfile.facts.slice(0,12).map((fact,index)=><div key={index} className="rounded-md bg-[var(--panel-2)] p-2 text-xs"><div className="flex justify-between gap-2"><strong>{fact.key}</strong><span className="text-[10px] text-muted">{fact.classification}{fact.confidence!=null?" · "+fact.confidence+"%":""}</span></div><p className="mt-1 text-muted">{fact.value}</p>{fact.sourceUrl?<a href={fact.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[10px] underline">fonte</a>:null}</div>)}</div></>:<Empty>Nenhum mapeamento estruturado ainda.</Empty>}
        </div>
        <div className="rounded-lg border border-default p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Diagnóstico mais recente</h3>
          {diagnostic?<><div className="mt-2 flex items-center gap-2"><span className="rounded border border-default px-2 py-1 text-[10px]">{diagnostic.status}</span><span className="text-[10px] text-muted">v{diagnostic.version}</span></div><p className="mt-3 text-sm leading-6">{diagnostic.executiveSummary||"Sem resumo executivo."}</p><div className="mt-4"><ScoreGrid scores={diagnostic.scores}/></div></>:<Empty>Nenhum diagnóstico gerado.</Empty>}
        </div>
      </div>
      {diagnostic?<div className="mt-5 grid gap-5 lg:grid-cols-2"><Findings title="Pontos fortes" items={diagnostic.strengths}/><Findings title="Lacunas" items={diagnostic.gaps}/></div>:null}
    </section>

    <section className="surface-flat rounded-lg p-5">
      <div className="mb-4"><h2 className="text-sm font-semibold">Conversas & qualificação</h2><p className="mt-1 text-xs text-muted">WhatsApp sincronizado é somente leitura para análise; envio depende de ApprovalRequest humano.</p></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">WhatsApp</h3>{data.conversations.length?<div className="space-y-2">{data.conversations.slice(0,5).map((conversation)=><div key={conversation.id} className="rounded-lg border border-default p-3"><div className="flex justify-between gap-2 text-xs"><strong>{conversation.contactDisplayName??conversation.contactAddress}</strong><span className={conversation.optOutDetected?"text-red-600":"text-muted"}>{conversation.optOutDetected?"OPT-OUT":conversation.messages.length+" msgs"}</span></div><p className="mt-2 line-clamp-2 text-xs text-muted">{conversation.messages.at(-1)?.text??"Sem texto na última mensagem."}</p></div>)}</div>:<Empty>Nenhuma conversa vinculada.</Empty>}</div>
        <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Qualification</h3>{data.qualification?<div className="rounded-lg border border-default p-3 text-xs"><div><span className="text-muted">Problemas:</span> {data.qualification.problemStatements.join(" · ")||"—"}</div><div className="mt-2"><span className="text-muted">Objetivo:</span> {data.qualification.desiredOutcome??"—"}</div><div className="mt-2"><span className="text-muted">Decisores:</span> {data.qualification.decisionMakers.join(", ")||"—"}</div><div className="mt-2"><span className="text-muted">Questões abertas:</span> {data.qualification.unansweredQuestions.length}</div></div>:<Empty>Discovery/qualificação ainda não estruturados.</Empty>}</div>
      </div>
    </section>

    <section className="surface-flat rounded-lg p-5">
      <h2 className="text-sm font-semibold">Propostas, contratos & execução</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-default p-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Proposta</h3>{proposal?<><div className="mt-2 text-sm font-medium">v{proposal.version} · {proposal.status}</div><div className="mt-2 text-xs text-muted">{proposal.services.join(", ")}</div><div className="mt-2 text-xs">{proposal.agencyFeeCents==null?"Preço: HUMAN_REQUIRED":"Preço: "+new Intl.NumberFormat("pt-BR",{style:"currency",currency:proposal.currency}).format(proposal.agencyFeeCents/100)}</div></>:<Empty>Nenhuma proposta.</Empty>}</div>
        <div className="rounded-lg border border-default p-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Contrato</h3>{contract?<><div className="mt-2 text-sm font-medium">v{contract.version} · {contract.status}</div><div className="mt-2 text-xs text-muted">Template {contract.templateId} · {contract.templateVersion}</div><div className="mt-2 text-xs">{contract.signedAt?"Assinado em "+new Date(contract.signedAt).toLocaleDateString("pt-BR"):"Ainda não assinado"}</div></>:<Empty>Nenhum contrato.</Empty>}</div>
        <div className="rounded-lg border border-default p-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Projetos/obrigações</h3>{data.projects.length?<div className="mt-2 space-y-2">{data.projects.map((project)=><div key={project.id}><div className="text-sm font-medium">{project.name}</div><div className="text-xs text-muted">{project.status} · {project.obligations.filter((x)=>x.status!=="DONE"&&x.status!=="CANCELED").length} abertas</div></div>)}</div>:<Empty>Nenhum projeto criado de contrato assinado.</Empty>}</div>
      </div>
    </section>

    <section className="surface-flat rounded-lg p-5">
      <h2 className="text-sm font-semibold">AI Runs</h2>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-default text-muted"><th className="py-2">Skill</th><th>Status</th><th>Início</th><th>Fim</th></tr></thead><tbody>{data.aiRuns.slice(0,12).map((run)=><tr key={run.id} className="border-b border-default/60"><td className="py-2 font-medium">{run.skill}@{run.skillVersion}</td><td>{run.status}</td><td>{run.startedAt?new Date(run.startedAt).toLocaleString("pt-BR"):"—"}</td><td>{run.completedAt?new Date(run.completedAt).toLocaleString("pt-BR"):"—"}</td></tr>)}</tbody></table>{!data.aiRuns.length?<div className="py-4"><Empty>Nenhuma execução de skill registrada.</Empty></div>:null}</div>
    </section>
  </div>;
}
