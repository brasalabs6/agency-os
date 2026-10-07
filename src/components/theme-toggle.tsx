"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { useI18n } from "./i18n-provider";

export function ThemeToggle() {
  const { t } = useI18n();
  useEffect(() => {
    const saved = localStorage.getItem("agencyos-theme");
    const enabled = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("agencyos-theme", next ? "dark" : "light");
  }

  return <button onClick={toggle} className="focus-ring grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]" aria-label={t("common.toggleTheme")}>
    <Moon size={17} className="dark:hidden"/>
    <Sun size={17} className="hidden dark:block"/>
  </button>;
}
