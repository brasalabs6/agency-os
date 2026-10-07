import Link from "next/link";
import { ApprovalInbox } from "@/components/approval-inbox";
import { PageHeader } from "@/components/page-header";
import { buttonSecondaryClass } from "@/components/ui-kit";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import { getI18n } from "@/lib/i18n/server";
import { listApprovals } from "@/lib/services/communications";

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ leadId?: string; status?: string }> }) {
  const params = await searchParams;
  const [user, items, i18n] = await Promise.all([
    requireCurrentUser(),
    listApprovals({ leadId: params.leadId, status: params.status, limit: 200 }),
    getI18n(),
  ]);
  const { t } = i18n;
  const query = params.leadId ? `&leadId=${encodeURIComponent(params.leadId)}` : "";
  const allHref = params.leadId ? `/approvals?leadId=${encodeURIComponent(params.leadId)}` : "/approvals";

  return <>
    <PageHeader title={t("approvals.title")} description={t("approvals.description")}/>
    <div className="mb-4 flex flex-wrap gap-2">
      <Link href={allHref} className={buttonSecondaryClass}>{t("approvals.all")}</Link>
      <Link href={`/approvals?status=PENDING${query}`} className={buttonSecondaryClass}>{t("approvals.pending")}</Link>
      <Link href={`/approvals?status=APPROVED${query}`} className={buttonSecondaryClass}>{t("approvals.approved")}</Link>
    </div>
    <ApprovalInbox items={items} canApprove={user.role === "ADMIN"}/>
  </>;
}
