"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/messages";
import { useI18n } from "./i18n-provider";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { locale, t } = useI18n();

  function change(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = next;
    router.refresh();
  }

  return <label className={`focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--bg)] flex min-h-11 items-center rounded-lg border border-default bg-[var(--panel)] text-muted ${compact ? "px-1.5" : "gap-2 px-2.5"}`}>
    <Languages size={15} className="shrink-0"/>
    <span className="sr-only">{t("common.language")}</span>
    <select aria-label={t("common.language")} value={locale} onChange={(event) => change(event.target.value as Locale)} className={`min-h-9 bg-transparent text-xs font-medium outline-none ${compact ? "w-12" : "pr-1"}`}>
      <option value="pt-BR">{compact ? "PT" : t("common.portuguese")}</option>
      <option value="en">{compact ? "EN" : t("common.english")}</option>
    </select>
  </label>;
}
