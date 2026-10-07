"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useI18n } from "./i18n-provider";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function ModalShell({ open, onClose, title, description, children, sizeClass = "sm:max-w-xl" }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; sizeClass?: string }) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusables = (): HTMLElement[] => {
      const nodes = dialog ? dialog.querySelectorAll<HTMLElement>(focusableSelector) : [];
      return Array.from(nodes as ArrayLike<HTMLElement>).filter((element) => !element.hasAttribute("aria-hidden"));
    };
    window.setTimeout(() => focusables()[0]?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); previouslyFocused?.focus(); };
  }, [open, onClose]);

  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-black/50 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={`surface flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl ${sizeClass}`}>
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-default px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="min-w-0"><h2 id={titleId} className="text-base font-semibold tracking-tight">{title}</h2>{description ? <p id={descriptionId} className="mt-1 text-xs leading-5 text-muted">{description}</p> : null}</div>
        <button type="button" onClick={onClose} className="focus-ring -mr-1 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]" aria-label={t("common.close")}><X size={18}/></button>
      </div>
      <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto pb-[env(safe-area-inset-bottom)]">{children}</div>
    </div>
  </div>;
}
