import Link from "next/link";
import { Bot, Copy, Database, KeyRound, Server, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireAdminUser } from "@/lib/auth/app-auth";

export default async function SettingsPage(){
  await requireAdminUser();
  const mode=process.env.DATA_DRIVER??"mock";
  const auth=process.env.MCP_AUTH_MODE??"token";
  return <>
    <PageHeader title="Configurações" description="Configuração administrativa do AgencyOS."/>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card icon={<Bot size={17}/>} title="ChatGPT"><p className="text-sm">Cada usuário possui suas próprias credenciais MCP.</p><Link href="/settings/mcp" className="mt-3 inline-block rounded-md text-xs font-medium text-[var(--accent)] hover:underline">Gerenciar minha conexão</Link></Card>
      <Card icon={<Users size={17}/>} title="Equipe"><p className="text-sm">Logins individuais com funções de administrador e membro.</p><Link href="/settings/team" className="mt-3 inline-block rounded-md text-xs font-medium text-[var(--accent)] hover:underline">Gerenciar equipe</Link></Card>
      <Card icon={<Database size={17}/>} title="Persistência"><p className="text-sm">Modo atual: <strong>{mode}</strong></p><p className="mt-1 text-xs text-muted">Use PostgreSQL em produção. Mock é destinado ao desenvolvimento.</p></Card>
      <Card icon={<Server size={17}/>} title="MCP remoto"><p className="text-sm">Endpoint: <code>/mcp</code></p><p className="mt-1 text-xs text-muted">O MCP usa autenticação própria e converge no mesmo domínio.</p></Card>
      <Card icon={<KeyRound size={17}/>} title="Autenticação MCP"><p className="text-sm">Modo atual: <strong>{auth}</strong></p><p className="mt-1 text-xs text-muted">Segredos e configuração MCP são administrativos.</p></Card>
      <Card icon={<Copy size={17}/>} title="Permissões"><div className="flex flex-wrap gap-2"><code className="rounded-md bg-[var(--panel-2)] px-2 py-1 text-xs">leads.read</code><code className="rounded-md bg-[var(--panel-2)] px-2 py-1 text-xs">leads.write</code></div></Card>
    </div>
  </>;
}

function Card({icon,title,children}:{icon:React.ReactNode;title:string;children:React.ReactNode}){
  return <section className="surface-flat rounded-xl p-4 sm:p-5"><div className="mb-3 flex items-center gap-2 text-muted">{icon}<h2 className="text-xs font-semibold uppercase tracking-wide">{title}</h2></div>{children}</section>;
}
