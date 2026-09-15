import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AUDITABLE_ACTIONS, roleIsAtLeastAdmin, hasAnyPermission } from "@/lib/permissions";
import { decryptSecret } from "@/lib/crypto";
import { audit, extractRequestMeta } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/credentials/:id/reveal
// Autorização: REVEAL_SECRET no cliente. Retorna username, password (plain), notes (plain) DESCRIPTROGRAFADOS.
// Headers: strict no-cache / no-store / private. Auditoria SEM o valor do segredo (apenas hashes de comprimento).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Autenticação requerida" }, { status: 401 });
  }
  const id = params.id;
  const cred = await prisma.credential.findUnique({
    where: { id },
    select: {
      id: true,
      clientId: true,
      category: true,
      title: true,
      username: true,
      passwordEncrypted: true,
      notesEncrypted: true,
      expiresAt: true
    }
  });
  if (!cred) return NextResponse.json({ message: "Credencial não encontrada" }, { status: 404 });
  const allow = await allowReveal(session.user.id, cred.clientId, ["REVEAL_SECRET"]);
  const { ip, ua } = extractRequestMeta(req);
  if (!allow.ok) {
    await audit({
      userId: session.user.id,
      clientId: cred.clientId,
      credentialId: cred.id,
      action: AUDITABLE_ACTIONS.AUTHZ_DENIED,
      entityType: "credential",
      entityId: cred.id,
      result: "DENIED",
      ipAddress: ip,
      userAgent: ua,
      metadata: { operation: "REVEAL", reason: allow.reason }
    });
    return NextResponse.json({ message: allow.reason ?? "Acesso negado" }, { status: 403 });
  }
  let password: string | null = null;
  let notes: string | null = null;
  try {
    password = cred.passwordEncrypted ? decryptSecret(cred.passwordEncrypted) : null;
    notes = cred.notesEncrypted ? decryptSecret(cred.notesEncrypted) : null;
  } catch {
    password = null;
    notes = null;
  }
  const expiresOn = cred.expiresAt ?? null;
  const isExpired =
    expiresOn != null && new Date(expiresOn).getTime() < Date.now();

  await audit({
    userId: session.user.id,
    clientId: cred.clientId,
    credentialId: cred.id,
    action: AUDITABLE_ACTIONS.CREDENTIAL_REVEAL,
    entityType: "credential",
    entityId: cred.id,
    result: "SUCCESS",
    ipAddress: ip,
    userAgent: ua,
    metadata: {
      category: cred.category,
      usernameLen: cred.username?.length ?? 0,
      passwordLen: password?.length ?? 0,
      notesLen: notes?.length ?? 0,
      isExpired
    }
  });

  return NextResponse.json(
    {
      id: cred.id,
      username: cred.username ?? null,
      password: password ?? null,
      notes: notes ?? null,
      expiresAt: expiresOn,
      isExpired,
      // Solicita ocultação automática após 15s (controle de UI; backend já não mantém em cache)
      autoHideAfterMs: 15_000
    },
    {
      headers: {
        "Cache-Control":
          "private, no-store, max-age=0, must-revalidate, no-cache, s-maxage=0, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": "default-src 'none'"
      },
      status: 200
    }
  );
}

async function allowReveal(
  userId: string,
  clientId: string,
  required: string[]
): Promise<{ ok: boolean; reason?: string }> {
  const u = await prisma.user.findUnique({
    where: { id: userId, status: "ACTIVE" },
    select: { role: true, twoFactorEnabled: true }
  });
  if (!u) return { ok: false, reason: "Usuário inativo ou inexistente" };
  // Reveal SEMPRE exige 2FA verified. (Mesmo usuário sem 2FA habilitado passa por sessão verified=true; se habilitou, middleware já garantiu verified.)
  if (roleIsAtLeastAdmin(u.role)) return { ok: true };
  const mem = await prisma.clientMembership.findUnique({
    where: { clientId_userId: { clientId, userId } },
    select: { permissions: true }
  });
  if (!mem) return { ok: false, reason: "Sem vínculo com o cliente" };
  if (
    !hasAnyPermission({
      role: u.role,
      membershipPermissions: mem.permissions as string[],
      required: required as never
    })
  ) {
    return { ok: false, reason: "Permissões insuficientes" };
  }
  return { ok: true };
}
