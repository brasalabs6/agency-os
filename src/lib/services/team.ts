import { DomainError } from "@/lib/domain/errors";
import { hashPassword } from "@/lib/auth/password";
import { normalizeEmail, publicUser } from "./auth";
import type { AuthenticatedUser } from "@/lib/auth/types";
import type { ActorContext, UserRole } from "@/lib/domain/types";
import { getAuthRepository, getLeadRepository } from "@/lib/repositories";
import { revokeAllMcpCredentialsForUser } from "./mcp-credentials";

function adminActor(admin: AuthenticatedUser): ActorContext { return { type: "USER", id: admin.id, name: admin.name }; }
export function assertAdmin(user: AuthenticatedUser) { if (user.role !== "ADMIN") throw new DomainError("Administrator access required", "ADMIN_REQUIRED", 403); }

async function audit(admin: AuthenticatedUser, action: string, input: Record<string, unknown>, result: Record<string, unknown> = {}) {
  await getLeadRepository().addAudit({ actor: adminActor(admin), action, input, result });
}
async function mustUser(id: string) {
  const user = await getAuthRepository().getUserById(id);
  if (!user) throw new DomainError("User not found", "USER_NOT_FOUND", 404);
  return user;
}
async function protectLastAdmin(targetId: string, nextRole?: UserRole, nextActive?: boolean) {
  const target = await mustUser(targetId);
  const removesAdmin = target.role === "ADMIN" && target.active && (nextRole === "MEMBER" || nextActive === false);
  if (removesAdmin && await getAuthRepository().countActiveAdmins() <= 1) throw new DomainError("At least one active administrator is required", "LAST_ADMIN_REQUIRED", 422);
}

export async function listTeam(admin: AuthenticatedUser) { assertAdmin(admin); return (await getAuthRepository().listUsers(true)).map(publicUser); }

export async function createTeamMember(admin: AuthenticatedUser, input: { name: string; email: string; password: string; role?: UserRole }) {
  assertAdmin(admin); const email = normalizeEmail(input.email);
  if (await getAuthRepository().findUserByEmail(email)) throw new DomainError("Email already exists", "EMAIL_ALREADY_EXISTS", 409);
  const user = await getAuthRepository().createUser({ name: input.name.trim(), email, passwordHash: await hashPassword(input.password), role: input.role ?? "MEMBER", active: true });
  await audit(admin, "USER_CREATED", { email, role: user.role }, { userId: user.id });
  return publicUser(user);
}

export async function updateTeamMember(admin: AuthenticatedUser, id: string, input: { name?: string; email?: string; role?: UserRole }) {
  assertAdmin(admin); await protectLastAdmin(id, input.role);
  const email = input.email ? normalizeEmail(input.email) : undefined;
  if (email) { const duplicate = await getAuthRepository().findUserByEmail(email); if (duplicate && duplicate.id !== id) throw new DomainError("Email already exists", "EMAIL_ALREADY_EXISTS", 409); }
  const user = await getAuthRepository().updateUser(id, { name: input.name?.trim(), email, role: input.role });
  if (!user) throw new DomainError("User not found", "USER_NOT_FOUND", 404);
  await audit(admin, "USER_UPDATED", { targetUserId: id, name: input.name, email, role: input.role });
  return publicUser(user);
}

export async function deactivateTeamMember(admin: AuthenticatedUser, id: string) {
  assertAdmin(admin);
  if (admin.id === id) throw new DomainError("You cannot deactivate your own account", "SELF_DEACTIVATION_BLOCKED", 422);
  await protectLastAdmin(id, undefined, false);
  const user = await getAuthRepository().updateUser(id, { active: false });
  if (!user) throw new DomainError("User not found", "USER_NOT_FOUND", 404);
  await getAuthRepository().revokeSessionsForUser(id);
  await revokeAllMcpCredentialsForUser(id);
  await audit(admin, "USER_DEACTIVATED", { targetUserId: id });
  return publicUser(user);
}

export async function activateTeamMember(admin: AuthenticatedUser, id: string) {
  assertAdmin(admin); await mustUser(id);
  const user = await getAuthRepository().updateUser(id, { active: true });
  if (!user) throw new DomainError("User not found", "USER_NOT_FOUND", 404);
  await audit(admin, "USER_ACTIVATED", { targetUserId: id });
  return publicUser(user);
}

export async function resetMemberPassword(admin: AuthenticatedUser, id: string, password: string) {
  assertAdmin(admin); const target = await mustUser(id);
  await getAuthRepository().updateUser(id, { passwordHash: await hashPassword(password) });
  await getAuthRepository().revokeSessionsForUser(id);
  await audit(admin, "AUTH_PASSWORD_RESET", { targetUserId: id });
  return publicUser(target);
}
