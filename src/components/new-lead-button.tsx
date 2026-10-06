"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SERVICE_OPPORTUNITIES } from "@/lib/domain/types";
import { ModalShell } from "./modal-shell";
import { buttonGhostClass, buttonPrimaryClass, controlClass } from "./ui-kit";

export function NewLeadButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close() { if (!busy) { setOpen(false); setError(null); } }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(null);
    const data = new FormData(event.currentTarget);
    const body = { name: data.get("name"), segment: data.get("segment") || null, city: data.get("city") || null, state: data.get("state") || null, website: data.get("website") || null, phone: data.get("phone") || null, email: data.get("email") || null, primaryOpportunity: data.get("opportunity") || null, tags: ["manual"] };
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error?.message ?? "Falha ao criar lead");
      setOpen(false);
      router.push(`/leads/${json.id}`);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro inesperado"); }
    finally { setBusy(false); }
  }

  return <><button onClick={() => setOpen(true)} className={buttonPrimaryClass}><Plus size={15}/>Novo lead</button><ModalShell open={open} onClose={close} title="Novo lead" description="Cadastre os dados essenciais agora. O restante pode ser enriquecido depois." sizeClass="sm:max-w-2xl">
    <form onSubmit={submit} className="p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2"><Field name="name" label="Empresa" required autoFocus/><Field name="segment" label="Segmento"/><Field name="city" label="Cidade"/><Field name="state" label="UF"/><Field name="website" label="Website" type="url"/><Field name="phone" label="Telefone"/><Field name="email" label="Email" type="email"/><label className="text-xs font-medium">Oportunidade<select name="opportunity" className={`mt-1.5 ${controlClass}`}><option value="">Não definida</option>{SERVICE_OPPORTUNITIES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label></div>
      {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p> : null}
      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-default pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={close} className={buttonGhostClass}>Cancelar</button><button disabled={busy} className={buttonPrimaryClass}>{busy ? "Criando…" : "Criar lead"}</button></div>
    </form>
  </ModalShell></>;
}

function Field({ name, label, type = "text", required = false, autoFocus = false }: { name: string; label: string; type?: string; required?: boolean; autoFocus?: boolean }) {
  return <label className="text-xs font-medium">{label}<input name={name} type={type} required={required} autoFocus={autoFocus} className={`mt-1.5 ${controlClass}`}/></label>;
}
