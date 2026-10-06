import type { UserRole } from "@/lib/domain/types";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  passwordHash?: string | null;
  role: UserRole;
  active: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastLoginAt?: string | null;
}

export interface AuthenticatedUser extends PublicUser {
  sessionId?: string | null;
}

export interface UserSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string | null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  passwordHash?: string | null;
  role?: UserRole;
  active?: boolean;
  lastLoginAt?: string | null;
}
