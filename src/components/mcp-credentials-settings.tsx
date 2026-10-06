"use client";

import { useState } from "react";
import { Bot, Check, Copy, KeyRound, Plus, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import type { PublicMcpCredential } from "@/lib/auth/mcp-types";

type CreatedConnection = {
  secret: string;
  serverUrl: string;
  credential: PublicMcpCredential;
};

function formatDate(value?: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

async function api(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message ?? "Falha na operação");
  return payload;
}

export function McpCredentialsSettings({ initialCredentials }: { initialCredentials: PublicMcpCredential[] }) {
  const [credentials, setCredentials] = useState(initialCredentials);
  const [name, setName] = useState("ChatGPT Personal");
  const [created, setCreated] = useState<CreatedConnection | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError(cause instanceof Error ? cause.message : "Erro inesperado");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(credential: PublicMcpCredential) {
    if (!window.confirm(`Revogar "${credential.name}"? O ChatGPT que usa essa URL perderá acesso imediatamente.`)) return;
    setBusy(credential.id);
    setError(null);
    try {
      const updated = await api(`/api/mcp-credentials/${credential.id}/revoke`, "POST");
      upsert(updated);
      if (created?.credential.id === credential.id) setCreated(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro inesperado");
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
    <section className="surface-flat rounded-lg p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--panel-2)]"><Bot size={19}/></div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">Create ChatGPT connection</h2>
          <p className="mt-1 text-xs text-muted">Cada conexão recebe um segredo independente. No ChatGPT, configure a Server URL e selecione <strong>No authentication</strong>.</p>
          <div className="mt-4 flex max-w-xl flex-col gap-2 sm:flex-row">
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className="h-10 flex-1 rounded-md border border-default bg-[var(--panel)] px-3 text-sm" placeholder="ChatGPT Personal"/>
            <button onClick={() => void createConnection()} disabled={busy === "create" || !name.trim()} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-[var(--text)] px-4 text-xs font-medium text-[var(--panel)] disabled:opacity-50"><Plus size={14}/>Create</button>
          </div>
        </div>
      </div>
    </section>

    {created ? <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950">
      <div className="flex items-start gap-3"><ShieldCheck size={19} className="mt-0.5 text-emerald-700 dark:text-emerald-300"/><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Connection ready — copy this URL now</h2><p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">O segredo completo é exibido apenas agora. Fechando esta caixa, o AgencyOS não consegue mostrá-lo novamente.</p>
        <div className="mt-3 break-all rounded-md border border-emerald-200 bg-white/70 p-3 font-mono text-xs text-emerald-950 dark:border-emerald-900 dark:bg-black/20 dark:text-emerald-100">{created.serverUrl}</div>
        <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void copyUrl()} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-800 px-3 py-2 text-xs font-medium text-white">{copied ? <Check size={13}/> : <Copy size={13}/>} {copied ? "Copied" : "Copy Server URL"}</button><button onClick={() => setCreated(null)} className="rounded-md border border-emerald-300 px-3 py-2 text-xs dark:border-emerald-800">I saved it</button></div>
        <div className="mt-3 text-[11px] text-emerald-800 dark:text-emerald-300">ChatGPT → Add custom MCP server → Server URL = URL acima → Authentication = No authentication → Scan Tools.</div>
      </div></div>
    </section> : null}

    {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div> : null}

    <section className="surface-flat overflow-hidden rounded-lg">
      <div className="border-b border-default px-5 py-4"><h2 className="text-sm font-semibold">My connections</h2><p className="mt-1 text-xs text-muted">Crie uma nova antes de revogar a antiga para rotacionar sem downtime.</p></div>
      <div className="divide-y divide-[var(--border)]">
        {credentials.map((credential) => <div key={credential.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_180px_180px_auto] lg:items-center">
          <div className="min-w-0"><div className="flex items-center gap-2"><KeyRound size={14} className="text-muted"/><span className="truncate text-sm font-medium">{credential.name}</span><span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${credential.active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-[var(--panel-2)] text-muted"}`}>{credential.active ? "ACTIVE" : "REVOKED"}</span></div><div className="mt-1 font-mono text-[11px] text-muted">{credential.tokenPrefix}••••••••</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Created</div><div className="mt-1 text-xs">{formatDate(credential.createdAt)}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Last used</div><div className="mt-1 text-xs">{formatDate(credential.lastUsedAt)}</div></div>
          <div className="flex justify-end">{credential.active ? <button disabled={busy === credential.id} onClick={() => void revoke(credential)} className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-xs text-red-700 disabled:opacity-50 dark:border-red-900 dark:text-red-300"><Trash2 size={13}/>Revoke</button> : <span className="inline-flex items-center gap-1 text-xs text-muted"><RotateCcw size={12}/>Create a new connection to rotate</span>}</div>
        </div>)}
        {credentials.length === 0 ? <div className="p-8 text-center text-xs text-muted">Nenhuma conexão criada ainda.</div> : null}
      </div>
    </section>
  </div>;
}
