import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { extractRequestMeta } from "@/lib/audit";

export const dynamic = "force-dynamic";

// --- GET /api/auth/two-factor/setup → gera setup novo (QR code + secret + recovery)
// Só pode gerar setup quando usuário ainda NÃO tem 2FA habilitado (ou admin forçando reset; não implementado aqui).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Autenticação requerida" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true, email: true, name: true, id: true }
  });
  if (!user) return NextResponse.json({ message: "Usuário inexistente" }, { status: 404 });
  // Se 2FA já habilitado, não retornar setup novo sem desabilitar antes
  if (user.twoFactorEnabled) {
    return NextResponse.json(
      {
        twoFactorEnabled: true,
        message: "2FA já habilitado. Desabilite primeiro para gerar novo setup."
      },
      { status: 409 }
    );
  }
  // Import dinâmico para evitar tree-shake de qrcode/otplib em client
  const { createTwoFactorSetup } = await import("@/lib/totp");
  const setup = await createTwoFactorSetup({
    issuer: "PassVGON",
    accountName: user.email
  });
  const { ip, ua } = extractRequestMeta(req);
  await audit({
    userId: user.id,
    action: "AUTH_2FA_SETUP",
    entityType: "user",
    entityId: user.id,
    result: "PENDING",
    ipAddress: ip,
    userAgent: ua
  });
  // NÃO gravamos o secret no setup GET. O secret só é salvo após POST /enable confirmar código.
  return NextResponse.json({
    twoFactorEnabled: false,
    secretPlaintext: setup.secretPlaintext,
    secretEncrypted: setup.secretEncrypted,
    otpAuthUrl: setup.otpAuthUrl,
    qrCodeDataUrl: setup.qrCodeDataUrl,
    recoveryCodes: setup.recoveryCodes.map((r) => r.plaintext) // plaintext só aqui, uma vez
  });
}

// --- POST /api/auth/two-factor/setup/enable → confirma código + grava secretEnc e backup codes hasheados
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Autenticação requerida" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      twoFactorEnabled: true,
      twoFactorLastTotp: true,
      email: true
    }
  });
  if (!user) return NextResponse.json({ message: "Usuário inexistente" }, { status: 404 });
  if (user.twoFactorEnabled) {
    return NextResponse.json({ ok: false, message: "2FA já habilitado." }, { status: 409 });
  }
  let body: {
    code?: string;
    secretEncrypted?: string;
    recoveryCodesHashesJson?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });
  }
  if (!body.code || !body.secretEncrypted || !body.recoveryCodesHashesJson) {
    return NextResponse.json(
      { ok: false, message: "Campos obrigatórios ausentes" },
      { status: 400 }
    );
  }
  const { verifyTOTP } = await import("@/lib/totp");
  const { valid, newLastTotp } = verifyTOTP({
    code: body.code,
    secretEncrypted: body.secretEncrypted,
    lastUsedTotp: null
  });
  if (!valid) {
    const { ip, ua } = extractRequestMeta(req);
    await audit({
      userId: user.id,
      action: "AUTH_2FA_CHALLENGE_FAILED",
      entityType: "user",
      entityId: user.id,
      result: "DENIED",
      ipAddress: ip,
      userAgent: ua
    });
    return NextResponse.json(
      { ok: false, message: "Código TOTP inválido na confirmação de setup." },
      { status: 422 }
    );
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorSecretEnc: body.secretEncrypted,
      twoFactorBackupCodes: body.recoveryCodesHashesJson,
      twoFactorLastTotp: newLastTotp,
      lastTwoFactorAttemptAt: new Date()
    }
  });
  const { ip, ua } = extractRequestMeta(req);
  await audit({
    userId: user.id,
    action: "AUTH_2FA_ENABLE",
    entityType: "user",
    entityId: user.id,
    result: "SUCCESS",
    ipAddress: ip,
    userAgent: ua
  });
  // Sessão passa a ter 2FA required=true e verified=true agora
  const { update } = await import("@/auth");
  await update({
    twoFactorEnabled: true,
    twoFactorRequired: true,
    twoFactorVerified: true
  } as never);
  return NextResponse.json({ ok: true, message: "2FA habilitado." });
}

// --- DELETE /api/auth/two-factor → desabilita 2FA (requer senha + TOTP atual validos para segurança)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Autenticação requerida" }, { status: 401 });
  }
  let body: { password?: string; code?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });
  }
  if (!body.password || !body.code) {
    return NextResponse.json(
      { ok: false, message: "Senha e código TOTP são obrigatórios para desabilitar 2FA." },
      { status: 400 }
    );
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      twoFactorEnabled: true,
      twoFactorSecretEnc: true,
      twoFactorLastTotp: true,
      passwordHash: true,
      passwordAlgo: true
    }
  });
  if (!user) return NextResponse.json({ message: "Usuário inexistente" }, { status: 404 });
  if (!user.twoFactorEnabled) {
    return NextResponse.json({ ok: false, message: "2FA não está habilitado." }, { status: 409 });
  }
  const { verifyPassword } = await import("@/lib/password");
  const pw = await verifyPassword(
    body.password,
    user.passwordHash ?? "",
    (user.passwordAlgo ?? "bcrypt") as "argon2id" | "bcrypt"
  );
  if (!pw.valid) {
    return NextResponse.json({ ok: false, message: "Senha incorreta." }, { status: 403 });
  }
  const { verifyTOTP } = await import("@/lib/totp");
  const totp = verifyTOTP({
    code: body.code,
    secretEncrypted: user.twoFactorSecretEnc,
    lastUsedTotp: user.twoFactorLastTotp
  });
  if (!totp.valid) {
    return NextResponse.json({ ok: false, message: "Código TOTP inválido." }, { status: 403 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecretEnc: null,
      twoFactorBackupCodes: null,
      twoFactorLastTotp: null
    }
  });
  const { update } = await import("@/auth");
  await update({
    twoFactorEnabled: false,
    twoFactorRequired: false,
    twoFactorVerified: true
  } as never);
  const { ip, ua } = extractRequestMeta(req);
  await audit({
    userId: user.id,
    action: "AUTH_2FA_DISABLE",
    entityType: "user",
    entityId: user.id,
    result: "SUCCESS",
    ipAddress: ip,
    userAgent: ua
  });
  return NextResponse.json({ ok: true });
}
