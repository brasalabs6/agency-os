import Link from "next/link";
import { Activity, KanbanSquare, LayoutDashboard, ListTodo, Settings, Users } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/actions", label: "Needs Action", icon: ListTodo },
];

export function AppShell({ children, actorName }: { children: React.ReactNode; actorName: string }) {
  return <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
    <aside className="hidden border-r border-default bg-[var(--panel)] md:flex md:h-screen md:sticky md:top-0 md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-default px-4"><div className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--text)] text-[var(--panel)]"><Activity size={15}/></div><span className="font-semibold tracking-tight">AgencyOS</span><span className="text-xs text-muted">Leads</span></div>
      <nav className="flex-1 space-y-1 p-2">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="focus-ring flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]"><Icon size={16}/>{label}</Link>)}</nav>
      <div className="border-t border-default p-2"><Link href="/settings" className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]"><Settings size={16}/>Settings</Link></div>
      <div className="flex items-center justify-between border-t border-default px-3 py-3"><div className="min-w-0"><div className="truncate text-xs font-medium">{actorName}</div><div className="text-[10px] text-muted">Internal workspace</div></div><ThemeToggle/></div>
    </aside>
    <div className="min-w-0">
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-default bg-[color:var(--bg)]/90 px-4 backdrop-blur md:hidden"><Link href="/" className="font-semibold">AgencyOS</Link><div className="flex gap-4 text-xs"><Link href="/leads">Leads</Link><Link href="/pipeline">Pipeline</Link></div><ThemeToggle/></header>
      <main className="mx-auto w-full max-w-[1600px] p-4 md:p-7">{children}</main>
    </div>
  </div>;
}
