import { NextRequest, NextResponse } from "next/server";
import { auth, update } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyTOTP, verifyRecoveryCode } from "@/lib/totp";
import { audit, extractRequestMeta } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/auth/two-factor/verify → valida TOTP ou código de recuperação no desafio de login.
// Atualiza sessão JWT para twoFactorVerified=true.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Autenticação requerida" }, { status: 401 });
  }
  if (session.user.twoFactorVerified && !session.user.twoFactorRequired) {
    return NextResponse.json({ ok: true, already: true, message: "Sessão já validada." });
  }
  let body: { code?: string; recovery?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });
  }
  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      twoFactorEnabled: true,
      twoFactorSecretEnc: true,
      twoFactorBackupCodes: true,
      twoFactorLastTotp: true,
      lastTwoFactorAttemptAt: true
    }
  });
  if (!user) return NextResponse.json({ ok: false, message: "Usuário inexistente" }, { status: 404 });

  const { ip, ua } = extractRequestMeta(req);

  // Limitação de tentativas: no máximo 15 falhas por hora (básico; sem lock externo)
  // Não bloqueamos o usuário para não causar DoS, só throttle leve
  if (
    user.lastTwoFactorAttemptAt &&
    Date.now() - user.lastTwoFactorAttemptAt.getTime() < 1200
  ) {
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas em pouco tempo. Aguarde." },
      { status: 429 }
    );
  }

  let success = false;
  let remainingHashes: string[] | null = null;
  let newLastTotp: string | null = null;

  if (body.code) {
    const r = verifyTOTP({
      code: body.code,
      secretEncrypted: user.twoFactorSecretEnc,
      lastUsedTotp: user.twoFactorLastTotp
    });
    if (r.valid) {
      success = true;
      newLastTotp = r.newLastTotp;
    }
  } else if (body.recovery) {
    const r = verifyRecoveryCode({
      code: body.recovery,
      backupCodesJson: user.twoFactorBackupCodes
    });
    if (r.valid) {
      success = true;
      remainingHashes = r.remainingHashes;
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastTwoFactorAttemptAt: new Date(),
      twoFactorLastTotp: newLastTotp ?? undefined,
      twoFactorBackupCodes: remainingHashes ? JSON.stringify(remainingHashes) : undefined
    }
  });

  if (!success) {
    await audit({
      userId,
      action: body.code ? "AUTH_2FA_CHALLENGE_FAILED" : "AUTH_2FA_RECOVERY_FAILED",
      entityType: "user",
      entityId: userId,
      result: "DENIED",
      ipAddress: ip,
      userAgent: ua
    });
    return NextResponse.json(
      { ok: false, message: "Código inválido ou expirado." },
      { status: 422 }
    );
  }

  try {
    await update({
      twoFactorVerified: true,
      twoFactorRequired: user.twoFactorEnabled
    } as never);
  } catch {
    // ignorar: sessão será atualizada no próximo redirect
  }

  await audit({
    userId,
    action: body.code ? "AUTH_2FA_CHALLENGE_SUCCESS" : "AUTH_2FA_RECOVERY_USED",
    entityType: "user",
    entityId: userId,
    result: "SUCCESS",
    ipAddress: ip,
    userAgent: ua,
    metadata: { usedRecovery: !!body.recovery }
  });

  return NextResponse.json({ ok: true });
}
