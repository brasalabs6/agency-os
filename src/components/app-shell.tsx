"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, Bot, CalendarDays, CheckSquare2, KanbanSquare, LayoutDashboard, ListTodo, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, UserRound, Users, X } from "lucide-react";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { ThemeToggle } from "./theme-toggle";

const nav = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare2 },
  { href: "/calendar", label: "Calendário", icon: CalendarDays },
  { href: "/actions", label: "Ações pendentes", icon: ListTodo },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ href, label, icon: Icon, pathname, collapsed, onNavigate }: { href: string; label: string; icon: typeof LayoutDashboard; pathname: string; collapsed?: boolean; onNavigate?: () => void }) {
  const active = isActive(pathname, href);
  return <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined} className={`focus-ring flex min-h-10 items-center rounded-lg text-sm font-medium transition-colors ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]"}`}><Icon size={17} className="shrink-0"/>{collapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}</Link>;
}

export function AppShell({ children, user }: { children: ReactNode; user: AuthenticatedUser }) {
  const pathname = usePathname();
  const initials = user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("agencyos.sidebar.collapsed");
    setCollapsed(stored === null ? window.matchMedia("(max-width: 1199px)").matches : stored === "true");
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onKeyDown); };
  }, [mobileOpen]);

  function toggleSidebar() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("agencyos.sidebar.collapsed", String(next));
      return next;
    });
  }

  return <div className="min-h-dvh md:flex">
    <aside className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-default bg-[var(--panel)] transition-[width] duration-200 md:flex ${collapsed ? "w-[72px]" : "w-[248px]"}`}>
      <div className={`flex h-16 items-center border-b border-default ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
        <Link href="/" className={`focus-ring flex min-w-0 items-center rounded-lg ${collapsed ? "justify-center" : "gap-2.5"}`} title={collapsed ? "AgencyOS" : undefined}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--text)] text-[var(--panel)]"><Activity size={16}/></span>
          {!collapsed ? <span className="min-w-0"><span className="block truncate text-sm font-semibold tracking-tight">AgencyOS</span><span className="block text-[10px] uppercase tracking-[0.14em] text-muted">CRM</span></span> : null}
        </Link>
        {!collapsed ? <button onClick={toggleSidebar} className="focus-ring grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]" aria-label="Recolher barra lateral" title="Recolher barra lateral"><PanelLeftClose size={17}/></button> : null}
      </div>
      {collapsed ? <div className="px-2 pt-2"><button onClick={toggleSidebar} className="focus-ring grid h-10 w-full place-items-center rounded-lg text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]" aria-label="Expandir barra lateral" title="Expandir barra lateral"><PanelLeftOpen size={17}/></button></div> : null}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">{nav.map((item) => <NavItem key={item.href} {...item} pathname={pathname} collapsed={collapsed}/>)}</nav>
      <div className="space-y-1 border-t border-default p-2">
        <NavItem href="/settings/profile" label="Perfil" icon={UserRound} pathname={pathname} collapsed={collapsed}/><NavItem href="/settings/mcp" label="ChatGPT" icon={Bot} pathname={pathname} collapsed={collapsed}/>
        {user.role === "ADMIN" ? <><NavItem href="/settings/team" label="Equipe" icon={Users} pathname={pathname} collapsed={collapsed}/><NavItem href="/settings" label="Configurações" icon={Settings} pathname={pathname} collapsed={collapsed}/></> : null}
      </div>
      <div className="border-t border-default p-2">
        <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "gap-2 px-1 py-1"}`}>
          <Link href="/settings/profile" title={collapsed ? `${user.name} · ${user.role}` : undefined} className={`focus-ring flex min-w-0 items-center rounded-lg ${collapsed ? "justify-center" : "flex-1 gap-2"}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--panel-2)] text-[10px] font-semibold">{initials}</span>
            {!collapsed ? <span className="min-w-0"><span className="block truncate text-xs font-medium">{user.name}</span><span className="block text-[10px] text-muted">{user.role}</span></span> : null}
          </Link>
          <ThemeToggle/>
        </div>
        <form method="post" action="/api/auth/logout" className="mt-2"><button title={collapsed ? "Sair" : undefined} className={`focus-ring flex min-h-9 w-full items-center rounded-lg text-xs text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)] ${collapsed ? "justify-center px-2" : "gap-2 px-3"}`}><LogOut size={14}/>{collapsed ? <span className="sr-only">Sair</span> : "Sair"}</button></form>
      </div>
    </aside>

    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-default bg-[color:var(--bg)]/92 px-3 backdrop-blur md:hidden">
        <div className="flex min-w-0 items-center gap-2"><button onClick={() => setMobileOpen(true)} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-[var(--panel-2)]" aria-label="Abrir menu"><Menu size={19}/></button><Link href="/" className="flex min-w-0 items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--text)] text-[var(--panel)]"><Activity size={14}/></span><span className="truncate text-sm font-semibold">AgencyOS</span></Link></div>
        <div className="flex items-center gap-1"><Link href="/settings/profile" className="focus-ring grid h-9 min-w-9 place-items-center rounded-full bg-[var(--panel-2)] px-2 text-[10px] font-semibold" aria-label="Abrir perfil">{initials}</Link><ThemeToggle/></div>
      </header>
      <main className="mx-auto w-full max-w-[1680px] p-4 sm:p-5 lg:p-6 xl:p-8">{children}</main>
    </div>

    {mobileOpen ? <div className="fixed inset-0 z-50 md:hidden" role="presentation"><button className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"/><aside className="relative flex h-full w-[min(86vw,320px)] flex-col border-r border-default bg-[var(--panel)] shadow-2xl">
      <div className="flex h-14 items-center justify-between border-b border-default px-3"><Link href="/" className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--text)] text-[var(--panel)]"><Activity size={16}/></span><span><span className="block text-sm font-semibold">AgencyOS</span><span className="block text-[10px] uppercase tracking-[0.14em] text-muted">CRM</span></span></Link><button onClick={() => setMobileOpen(false)} className="focus-ring grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-[var(--panel-2)]" aria-label="Fechar menu"><X size={18}/></button></div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">{nav.map((item) => <NavItem key={item.href} {...item} pathname={pathname} onNavigate={() => setMobileOpen(false)}/>)}</nav>
      <div className="space-y-1 border-t border-default p-3"><NavItem href="/settings/profile" label="Perfil" icon={UserRound} pathname={pathname} onNavigate={() => setMobileOpen(false)}/><NavItem href="/settings/mcp" label="ChatGPT" icon={Bot} pathname={pathname} onNavigate={() => setMobileOpen(false)}/>{user.role === "ADMIN" ? <><NavItem href="/settings/team" label="Equipe" icon={Users} pathname={pathname} onNavigate={() => setMobileOpen(false)}/><NavItem href="/settings" label="Configurações" icon={Settings} pathname={pathname} onNavigate={() => setMobileOpen(false)}/></> : null}</div>
      <div className="border-t border-default p-3"><div className="mb-2 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--panel-2)] text-xs font-semibold">{initials}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{user.name}</div><div className="text-[10px] text-muted">{user.role}</div></div><ThemeToggle/></div><form method="post" action="/api/auth/logout"><button className="focus-ring flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]"><LogOut size={15}/>Sair</button></form></div>
    </aside></div> : null}
  </div>;
}
