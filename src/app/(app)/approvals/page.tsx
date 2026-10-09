import { ApprovalInbox } from "@/components/approval-inbox";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import { listApprovals } from "@/lib/services/communications";

export default async function ApprovalsPage({searchParams}:{searchParams:Promise<{leadId?:string;status?:string}>}){
  const user=await requireCurrentUser();
  if (process.env.AI_COMMERCIAL_AUTOMATION_ENABLED !== "true") return <p className="text-sm text-muted">Aprovações comerciais indisponíveis até aplicar a migration 0008 e habilitar a funcionalidade.</p>;
  const params=await searchParams;
  const items=await listApprovals({leadId:params.leadId,status:params.status,limit:200});
  return <><header className="mb-6"><h1 className="text-2xl font-semibold tracking-tight">Aprovações</h1><p className="mt-1 text-sm text-muted">Mensagens, propostas e contratos preparados por agentes só saem daqui depois de aprovação humana.</p></header>
  <div className="mb-4 flex gap-2 text-xs"><a href="/approvals" className="rounded border border-default px-3 py-2">Todas</a><a href="/approvals?status=PENDING" className="rounded border border-default px-3 py-2">Pendentes</a><a href="/approvals?status=APPROVED" className="rounded border border-default px-3 py-2">Aprovadas</a></div>
  <ApprovalInbox items={items} canApprove={user.role==="ADMIN"}/></>;
}
