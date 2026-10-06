"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("agencyos-theme");
    const enabled = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", enabled); setDark(enabled);
  }, []);
  function toggle() {
    const next = !dark; setDark(next); document.documentElement.classList.toggle("dark", next); localStorage.setItem("agencyos-theme", next ? "dark" : "light");
  }
  return <button onClick={toggle} className="focus-ring rounded-md p-2 text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]" aria-label="Alternar tema">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>;
}
