"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, Bot, CalendarDays, CheckSquare2, KanbanSquare, LayoutDashboard, ListTodo, LogOut, Menu, MessageCircle, PanelLeftClose, PanelLeftOpen, Search, Settings, ShieldCheck, UserRound, Users, X } from "lucide-react";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";
import { useI18n } from "./i18n-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const nav: Array<{ href: string; label: MessageKey; icon: typeof LayoutDashboard }> = [
  { href: "/", label: "nav.overview", icon: LayoutDashboard },
  { href: "/leads", label: "nav.leads", icon: Users },
  { href: "/pipeline", label: "nav.pipeline", icon: KanbanSquare },
  { href: "/tasks", label: "nav.tasks", icon: CheckSquare2 },
  { href: "/calendar", label: "nav.calendar", icon: CalendarDays },
  { href: "/actions", label: "nav.actions", icon: ListTodo },
  { href: "/prospecting", label: "nav.prospecting", icon: Search },
  { href: "/conversations", label: "nav.conversations", icon: MessageCircle },
  { href: "/approvals", label: "nav.approvals", icon: ShieldCheck },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ href, label, icon: Icon, pathname, collapsed, onNavigate }: { href: string; label: string; icon: typeof LayoutDashboard; pathname: string; collapsed?: boolean; onNavigate?: () => void }) {
  const active = isActive(pathname, href);
  return <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined} className={`focus-ring flex min-h-11 touch-manipulation items-center rounded-lg text-sm font-medium transition-colors ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]"}`}><Icon size={17} className="shrink-0"/>{collapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}</Link>;
}

export function AppShell({ children, user }: { children: ReactNode; user: AuthenticatedUser }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const initials = user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("agencyos.sidebar.collapsed");
    const next = stored === null ? window.matchMedia("(max-width: 1199px)").matches : stored === "true";
    const frame = window.requestAnimationFrame(() => setCollapsed(next));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const drawer = drawerRef.current;
    const selector = 'a[href],button:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const focusables = () => Array.from(drawer?.querySelectorAll<HTMLElement>(selector) ?? []);
    window.setTimeout(() => focusables()[0]?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMobileOpen(false); return; }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [mobileOpen]);

  function toggleSidebar() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("agencyos.sidebar.collapsed", String(next));
      return next;
    });
  }

  const primary = nav.map((item) => ({ ...item, text: t(item.label) }));
  const settings = [
    { href: "/settings/profile", text: t("nav.profile"), icon: UserRound },
    { href: "/settings/mcp", text: t("nav.chatgpt"), icon: Bot },
    ...(user.role === "ADMIN" ? [
      { href: "/settings/team", text: t("nav.team"), icon: Users },
      { href: "/settings", text: t("nav.settings"), icon: Settings },
    ] : []),
  ];

  return <div className="min-h-dvh lg:flex">
    <aside data-testid="desktop-sidebar" className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-default bg-[var(--panel)] transition-[width] duration-200 lg:flex ${collapsed ? "w-[72px]" : "w-[248px]"}`}>
      <div className={`flex h-16 items-center border-b border-default ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
        <Link href="/" className={`focus-ring flex min-w-0 items-center rounded-lg ${collapsed ? "justify-center" : "gap-2.5"}`} title={collapsed ? "AgencyOS" : undefined}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--text)] text-[var(--panel)]"><Activity size={16}/></span>
          {!collapsed ? <span className="min-w-0"><span className="block truncate text-sm font-semibold tracking-tight">AgencyOS</span><span className="block text-[10px] uppercase tracking-[0.14em] text-muted">CRM</span></span> : null}
        </Link>
        {!collapsed ? <button onClick={toggleSidebar} className="focus-ring grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]" aria-label={t("nav.collapseSidebar")} title={t("nav.collapseSidebar")}><PanelLeftClose size={17}/></button> : null}
      </div>
      {collapsed ? <div className="px-2 pt-2"><button onClick={toggleSidebar} className="focus-ring grid h-11 w-full place-items-center rounded-lg text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]" aria-label={t("nav.expandSidebar")} title={t("nav.expandSidebar")}><PanelLeftOpen size={17}/></button></div> : null}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">{primary.map((item) => <NavItem key={item.href} href={item.href} label={item.text} icon={item.icon} pathname={pathname} collapsed={collapsed}/>)}</nav>
      <div className="space-y-1 border-t border-default p-2">{settings.map((item) => <NavItem key={item.href} href={item.href} label={item.text} icon={item.icon} pathname={pathname} collapsed={collapsed}/>)}</div>
      <div className="border-t border-default p-2">
        <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "gap-2 px-1 py-1"}`}>
          <Link href="/settings/profile" title={collapsed ? `${user.name} · ${user.role}` : undefined} className={`focus-ring flex min-w-0 items-center rounded-lg ${collapsed ? "justify-center" : "flex-1 gap-2"}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--panel-2)] text-[11px] font-semibold">{initials}</span>
            {!collapsed ? <span className="min-w-0"><span className="block truncate text-xs font-medium">{user.name}</span><span className="block text-[11px] text-muted">{user.role}</span></span> : null}
          </Link>
          {!collapsed ? <LanguageToggle compact/> : null}
          <ThemeToggle/>
        </div>
        <form method="post" action="/api/auth/logout" className="mt-2"><button title={collapsed ? t("nav.logout") : undefined} className={`focus-ring flex min-h-11 w-full items-center rounded-lg text-xs text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)] ${collapsed ? "justify-center px-2" : "gap-2 px-3"}`}><LogOut size={14}/>{collapsed ? <span className="sr-only">{t("nav.logout")}</span> : t("nav.logout")}</button></form>
      </div>
    </aside>

    <div className="min-w-0 flex-1">
      <header data-testid="mobile-header" className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-default bg-[color:var(--bg)]/92 px-2.5 backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-1.5"><button onClick={() => setMobileOpen(true)} className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-lg hover:bg-[var(--panel-2)]" aria-label={t("nav.openMenu")}><Menu size={20}/></button><Link href="/" className="flex min-w-0 items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--text)] text-[var(--panel)]"><Activity size={14}/></span><span className="truncate text-sm font-semibold">AgencyOS</span></Link></div>
        <div className="flex items-center gap-1"><LanguageToggle compact/><ThemeToggle/></div>
      </header>
      <main className="mx-auto w-full max-w-[1680px] p-3 sm:p-4 lg:p-6 xl:p-8">{children}</main>
    </div>

    {mobileOpen ? <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      <button className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-label={t("nav.closeMenu")}/>
      <aside ref={drawerRef} data-testid="mobile-drawer" role="dialog" aria-modal="true" aria-label="AgencyOS" className="relative flex h-full w-[min(92vw,360px)] flex-col border-r border-default bg-[var(--panel)] shadow-2xl">
        <div className="flex h-14 items-center justify-between border-b border-default px-3"><Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--text)] text-[var(--panel)]"><Activity size={16}/></span><span><span className="block text-sm font-semibold">AgencyOS</span><span className="block text-[10px] uppercase tracking-[0.14em] text-muted">CRM</span></span></Link><button onClick={() => setMobileOpen(false)} className="focus-ring grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-[var(--panel-2)]" aria-label={t("nav.closeMenu")}><X size={18}/></button></div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">{primary.map((item) => <NavItem key={item.href} href={item.href} label={item.text} icon={item.icon} pathname={pathname} onNavigate={() => setMobileOpen(false)}/>)}</nav>
        <div className="space-y-1 border-t border-default p-3">{settings.map((item) => <NavItem key={item.href} href={item.href} label={item.text} icon={item.icon} pathname={pathname} onNavigate={() => setMobileOpen(false)}/>)}</div>
        <div className="border-t border-default p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"><div className="mb-2 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--panel-2)] text-xs font-semibold">{initials}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{user.name}</div><div className="text-[11px] text-muted">{user.role}</div></div></div><form method="post" action="/api/auth/logout"><button className="focus-ring flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]"><LogOut size={15}/>{t("nav.logout")}</button></form></div>
      </aside>
    </div> : null}
  </div>;
}
