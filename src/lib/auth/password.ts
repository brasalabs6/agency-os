import { randomBytes, scrypt as nodeScrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { DomainError } from "@/lib/domain/errors";

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

export function validatePassword(password: string) {
  if (password.length < 10) throw new DomainError("Password must have at least 10 characters", "PASSWORD_TOO_SHORT", 422);
  if (password.length > 128) throw new DomainError("Password is too long", "PASSWORD_TOO_LONG", 422);
}

function encode(salt: Buffer, digest: Buffer) {
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}

function derive(password: string, salt: Buffer, keylen: number, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, keylen, { N: n, r, p, maxmem: MAXMEM }, (error, derived) => error ? reject(error) : resolve(derived));
  });
}

export async function hashPassword(password: string) {
  validatePassword(password);
  const salt = randomBytes(16);
  return encode(salt, await derive(password, salt, KEYLEN, N, R, P));
}

export function hashPasswordSync(password: string, salt = randomBytes(16)) {
  validatePassword(password);
  const digest = scryptSync(password, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return encode(salt, digest);
}

export async function verifyPassword(password: string, encoded?: string | null) {
  if (!encoded) return false;
  const [kind, n, r, p, saltRaw, hashRaw] = encoded.split("$");
  if (kind !== "scrypt" || !n || !r || !p || !saltRaw || !hashRaw) return false;
  const salt = Buffer.from(saltRaw, "base64url");
  const expected = Buffer.from(hashRaw, "base64url");
  const digest = await derive(password, salt, expected.length, Number(n), Number(r), Number(p));
  return digest.length === expected.length && timingSafeEqual(digest, expected);
}
