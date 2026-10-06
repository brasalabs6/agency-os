"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";

export function ThemeToggle() {
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

  return <button onClick={toggle} className="focus-ring rounded-md p-2 text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]" aria-label="Alternar tema">
    <Moon size={16} className="dark:hidden"/>
    <Sun size={16} className="hidden dark:block"/>
  </button>;
}
