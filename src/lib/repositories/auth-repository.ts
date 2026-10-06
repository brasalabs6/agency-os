import type { AppUser, CreateUserInput, UpdateUserInput, UserSession } from "@/lib/auth/types";

export interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  expiresAt: string;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AppUser | null>;
  getUserById(id: string): Promise<AppUser | null>;
  listUsers(includeInactive?: boolean): Promise<AppUser[]>;
  createUser(input: CreateUserInput): Promise<AppUser>;
  updateUser(id: string, input: UpdateUserInput): Promise<AppUser | null>;
  countActiveAdmins(): Promise<number>;

  createSession(input: CreateSessionInput): Promise<UserSession>;
  getSessionByTokenHash(tokenHash: string): Promise<{ session: UserSession; user: AppUser } | null>;
  touchSession(id: string): Promise<void>;
  revokeSession(id: string): Promise<void>;
  revokeSessionsForUser(userId: string, exceptSessionId?: string): Promise<void>;
}
