import { AppShell } from "@/components/app-shell";
import { requireAppActor } from "@/lib/auth/app-auth";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) { const actor = await requireAppActor(); return <AppShell actorName={actor.name}>{children}</AppShell>; }
