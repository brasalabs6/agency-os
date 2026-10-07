"use client";

import { useState } from "react";
import { Bot, Check, Copy, KeyRound, Plus, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import type { PublicMcpCredential } from "@/lib/auth/mcp-types";
import { intlLocale } from "@/lib/i18n/messages";
import { useI18n } from "./i18n-provider";
import { buttonPrimaryClass, buttonSecondaryClass, controlClass } from "./ui-kit";

type CreatedConnection = {
  secret: string;
  serverUrl: string;
  credential: PublicMcpCredential;
};

async function api(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message ?? "Request failed");
  return payload;
}

export function McpCredentialsSettings({ initialCredentials }: { initialCredentials: PublicMcpCredential[] }) {
  const { locale, t } = useI18n();
  const [credentials, setCredentials] = useState(initialCredentials);
  const [name, setName] = useState(t("mcp.defaultName"));
  const [created, setCreated] = useState<CreatedConnection | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (value?: string | null) => {
    if (!value) return t("common.never");
    return new Intl.DateTimeFormat(intlLocale(locale), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(value));
  };

  function upsert(credential: PublicMcpCredential) {
    setCredentials((current) => current.some((item) => item.id === credential.id)
      ? current.map((item) => item.id === credential.id ? credential : item)
      : [credential, ...current]);
  }

  async function createConnection() {
    setBusy("create");
    setError(null);
    setCreated(null);
    try {
      const result = await api("/api/mcp-credentials", "POST", { name });
      upsert(result.credential);
      setCreated(result);
      setCopied(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("common.errorUnexpected"));
    } finally {
      setBusy(null);
    }
  }

  async function revoke(credential: PublicMcpCredential) {
    if (!window.confirm(t("mcp.revokeConfirm",{name:credential.name}))) return;
    setBusy(credential.id);
    setError(null);
    try {
      const updated = await api(`/api/mcp-credentials/${credential.id}/revoke`, "POST");
      upsert(updated);
      if (created?.credential.id === credential.id) setCreated(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("common.errorUnexpected"));
    } finally {
      setBusy(null);
    }
  }

  async function copyUrl() {
    if (!created) return;
    await navigator.clipboard.writeText(created.serverUrl);
    setCopied(true);
  }

  return <div className="space-y-5">
    <section className="surface-flat rounded-xl p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[var(--panel-2)]"><Bot size={19}/></div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{t("mcp.createTitle")}</h2>
          <p className="mt-1 text-xs leading-5 text-muted">{t("mcp.createDescription")}</p>
          <div className="mt-4 grid gap-2 sm:max-w-xl sm:grid-cols-[minmax(0,1fr)_auto]">
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className={controlClass} placeholder={t("mcp.defaultName")}/>
            <button onClick={() => void createConnection()} disabled={busy === "create" || !name.trim()} className={buttonPrimaryClass}><Plus size={14}/>{t("mcp.create")}</button>
          </div>
        </div>
      </div>
    </section>

    {created ? <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5 dark:border-emerald-900 dark:bg-emerald-950">
      <div className="flex items-start gap-3"><ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-300"/><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{t("mcp.ready")}</h2><p className="mt-1 text-xs leading-5 text-emerald-800 dark:text-emerald-300">{t("mcp.secretOnce")}</p>
        <div className="mt-3 break-all rounded-lg border border-emerald-200 bg-white/70 p-3 font-mono text-xs leading-5 text-emerald-950 dark:border-emerald-900 dark:bg-black/20 dark:text-emerald-100">{created.serverUrl}</div>
        <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap"><button onClick={() => void copyUrl()} className={buttonPrimaryClass}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? t("mcp.copied") : t("mcp.copyUrl")}</button><button onClick={() => setCreated(null)} className={buttonSecondaryClass}>{t("mcp.saved")}</button></div>
        <div className="mt-3 text-xs leading-5 text-emerald-800 dark:text-emerald-300">{t("mcp.instructions")}</div>
      </div></div>
    </section> : null}

    {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div> : null}

    <section className="surface-flat overflow-hidden rounded-xl">
      <div className="border-b border-default px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold">{t("mcp.myConnections")}</h2><p className="mt-1 text-xs text-muted">{t("mcp.rotateDescription")}</p></div>
      <div className="divide-y divide-[var(--border)]">
        {credentials.map((credential) => <div key={credential.id} className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto] lg:items-center">
          <div className="min-w-0"><div className="flex items-center gap-2"><KeyRound size={15} className="shrink-0 text-muted"/><span className="truncate text-sm font-medium">{credential.name}</span><span className={`rounded px-1.5 py-0.5 text-xs font-medium ${credential.active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-[var(--panel-2)] text-muted"}`}>{credential.active ? t("mcp.active") : t("mcp.revoked")}</span></div><div className="mt-1 font-mono text-xs text-muted">{credential.tokenPrefix}••••••••</div></div>
          <div><div className="text-xs uppercase tracking-wide text-muted">{t("mcp.created")}</div><div className="mt-1 text-xs">{formatDate(credential.createdAt)}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-muted">{t("mcp.lastUsed")}</div><div className="mt-1 text-xs">{formatDate(credential.lastUsedAt)}</div></div>
          <div className="flex lg:justify-end">{credential.active ? <button disabled={busy === credential.id} onClick={() => void revoke(credential)} className="focus-ring inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-700 disabled:opacity-50 dark:border-red-900 dark:text-red-300"><Trash2 size={14}/>{t("mcp.revoke")}</button> : <span className="inline-flex items-center gap-1 text-xs text-muted"><RotateCcw size={13}/>{t("mcp.rotate")}</span>}</div>
        </div>)}
        {credentials.length === 0 ? <div className="p-8 text-center text-xs text-muted">{t("mcp.empty")}</div> : null}
      </div>
    </section>
  </div>;
}
