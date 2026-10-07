import Link from "next/link";
import { ChannelConnectionForm } from "@/components/channel-connection-form";
import { PageHeader } from "@/components/page-header";
import { buttonSecondaryClass } from "@/components/ui-kit";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import { automationStatusMessageKey } from "@/lib/i18n/domain";
import { intlLocale } from "@/lib/i18n/messages";
import { getI18n } from "@/lib/i18n/server";
import { listChannelConnections, listConversations } from "@/lib/services/communications";

export default async function ConversationsPage() {
  await requireCurrentUser();
  const [connections, conversations, i18n] = await Promise.all([listChannelConnections(), listConversations({ limit: 200 }), getI18n()]);
  const { locale, t } = i18n;
  const formatDate = (value: string) => new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));

  return <>
    <PageHeader title={t("conversations.title")} description={t("conversations.description")}/>
    <div className="grid min-w-0 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <ChannelConnectionForm/>
        <section className="surface-flat rounded-xl p-4 sm:p-5">
          <h2 className="text-sm font-semibold">{t("conversations.connections")}</h2>
          <div className="mt-3 space-y-2">
            {connections.length ? connections.map((connection) => <div key={connection.id} className="min-w-0 rounded-xl border border-default p-3">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 text-xs"><strong className="min-w-0 break-words">{connection.accountLabel}</strong><span className="shrink-0 rounded-full bg-[var(--panel-2)] px-2 py-1">{t(automationStatusMessageKey(connection.status))}</span></div>
              <div className="mt-1 break-words text-[11px] text-muted">{connection.provider} · {connection.capabilities.join(", ")}</div>
              <code className="mt-2 block overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-muted">{connection.id}</code>
            </div>) : <p className="py-5 text-center text-xs text-muted">{t("conversations.noConnections")}</p>}
          </div>
        </section>
      </div>

      <section className="surface-flat min-w-0 rounded-xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold">{t("conversations.synced")}</h2>
        <div className="mt-4 space-y-2">
          {conversations.length ? conversations.map((conversation) => <article key={conversation.id} className="min-w-0 rounded-xl border border-default p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0"><div className="break-words text-sm font-medium">{conversation.contactDisplayName ?? conversation.contactAddress}</div><div className="mt-0.5 break-all text-xs text-muted">{conversation.contactAddress}</div></div>
              <div className="flex flex-wrap items-center gap-2">
                {conversation.optOutDetected ? <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">OPT-OUT</span> : null}
                {conversation.leadId ? <Link className={buttonSecondaryClass} href={"/leads/" + conversation.leadId}>{t("conversations.openLead")}</Link> : <span className="inline-flex min-h-11 items-center rounded-lg border border-default px-3 text-xs text-muted">{t("conversations.unlinked")}</span>}
              </div>
            </div>
            <div className="mt-3 text-xs text-muted">{conversation.lastMessageAt ? formatDate(conversation.lastMessageAt) : t("conversations.noMessages")}</div>
          </article>) : <p className="py-8 text-center text-sm text-muted">{t("conversations.noneSynced")}</p>}
        </div>
      </section>
    </div>
  </>;
}
