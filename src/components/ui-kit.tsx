import type { ReactNode } from "react";

export const controlClass = "focus-ring h-11 w-full rounded-lg border border-default bg-[var(--panel)] px-3 text-sm outline-none transition-colors placeholder:text-[color:var(--muted)]/80 hover:border-[var(--border-strong)]";
export const textareaClass = "focus-ring w-full rounded-lg border border-default bg-[var(--panel)] px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[color:var(--muted)]/80 hover:border-[var(--border-strong)]";
export const buttonPrimaryClass = "focus-ring touch-manipulation inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 text-sm font-medium text-[var(--accent-contrast)] transition hover:brightness-95 disabled:pointer-events-none disabled:opacity-50";
export const buttonSecondaryClass = "focus-ring touch-manipulation inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-default bg-[var(--panel)] px-3.5 text-sm font-medium transition hover:border-[var(--border-strong)] hover:bg-[var(--panel-2)] disabled:pointer-events-none disabled:opacity-50";
export const buttonGhostClass = "focus-ring touch-manipulation inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm text-muted transition hover:bg-[var(--panel-2)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-50";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="grid min-h-36 place-items-center px-5 py-8 text-center"><div className="max-w-sm"><p className="text-sm font-medium">{title}</p>{description ? <p className="mt-1 text-xs leading-5 text-muted">{description}</p> : null}{action ? <div className="mt-4 flex justify-center">{action}</div> : null}</div></div>;
}
