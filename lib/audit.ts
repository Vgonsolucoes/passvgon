import { prisma } from "./prisma";
import type { AuditResult } from "@prisma/client";
import type { AuditableAction } from "./permissions";

export type AuditParams = {
  userId?: string | null;
  clientId?: string | null;
  credentialId?: string | null;
  action: AuditableAction | string;
  entityType: string;
  entityId?: string | null;
  result?: AuditResult;
  ipAddress?: string | null;
  userAgent?: string | null;
  // Metadata NÃO PODE CONTER SEGREDOS.
  metadata?: Record<string, unknown> & {
    secret?: never;
    password?: never;
    passwordEncrypted?: never;
    token?: never;
  };
};

export async function audit(params: AuditParams) {
  try {
    const safeMeta = stripSecretKeys(params.metadata);
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? undefined,
        clientId: params.clientId ?? undefined,
        credentialId: params.credentialId ?? undefined,
        action: String(params.action),
        entityType: String(params.entityType),
        entityId: params.entityId ?? undefined,
        result: params.result ?? "SUCCESS",
        ipAddress: params.ipAddress ?? undefined,
        userAgent: params.userAgent ?? undefined,
        metadata: (safeMeta ?? undefined) as unknown as never
      }
    });
  } catch (err) {
    // Nunca deixar auditoria quebrar o request
    // eslint-disable-next-line no-console
    console.error("[PassVGON][AUDIT] Falha ao gravar log:", err instanceof Error ? err.message : String(err));
  }
}

function stripSecretKeys(meta: unknown): Record<string, unknown> | null {
  if (meta == null) return null;
  if (typeof meta !== "object") return null;
  const obj = meta as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const blacklist = new Set([
    "secret",
    "password",
    "passwordEncrypted",
    "token",
    "accessToken",
    "refreshToken",
    "authToken",
    "plaintext",
    "notesEncrypted",
    "twoFactorSecretEnc",
    "twoFactorBackupCodes",
    "notes"
  ]);
  for (const key of Object.keys(obj)) {
    const lk = key.toLowerCase();
    if (blacklist.has(key) || lk.includes("secret") || lk.includes("password") || lk.includes("token")) {
      const v = obj[key];
      const len =
        typeof v === "string"
          ? v.length
          : typeof v === "object" && v != null
          ? "[object]"
          : String(v).length;
      out[`${key}_redacted_len`] = len;
      continue;
    }
    const v = obj[key];
    if (v != null && typeof v === "object") {
      out[key] = stripSecretKeys(v) ?? (Array.isArray(v) ? [] : {});
    } else {
      out[key] = v;
    }
  }
  return out;
}

export function extractRequestMeta(r: { headers?: HeadersLike } | Request | Response): {
  ip: string | null;
  ua: string | null;
} {
  try {
    const headers = (r as Request)?.headers as unknown as HeadersLike | undefined;
    if (!headers) return { ip: null, ua: null };
    const ua = typeof headers.get === "function" ? headers.get("user-agent") : null;
    const ip =
      (typeof headers.get === "function" ? headers.get("x-forwarded-for") ?? headers.get("x-real-ip") : null) ?? null;
    return { ua, ip };
  } catch {
    return { ip: null, ua: null };
  }
}

type HeadersLike = {
  get(name: string): string | null;
};
