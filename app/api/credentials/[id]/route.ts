import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AUDITABLE_ACTIONS, roleIsAtLeastAdmin, hasAnyPermission } from "@/lib/permissions";
import { encryptSecret } from "@/lib/crypto";
import { audit, extractRequestMeta } from "@/lib/audit";
import { z } from "zod";
import type { CredentialCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<CredentialCategory, string> = {
  M365_TENANT: "Microsoft 365 / Tenant",
  WINDOWS_SERVER_AD: "Windows Server / Active Directory",
  REMOTE_ACCESS_RDP: "Acesso remoto / RDP",
  FIREWALL_VPN: "Firewall / VPN",
  SWITCH_WIFI: "Switch / Wi-Fi",
  PRINTER: "Impressora",
  NAS_BACKUP: "NAS / Backup",
  DATABASE: "Banco de dados",
  SYSTEM_PORTAL: "Sistema / Portal",
  OTHER: "Outros"
};

const UpdateSchema = z
  .object({
    title: z.string().min(2).max(240).optional(),
    category: z
      .enum([
        "M365_TENANT",
        "WINDOWS_SERVER_AD",
        "REMOTE_ACCESS_RDP",
        "FIREWALL_VPN",
        "SWITCH_WIFI",
        "PRINTER",
        "NAS_BACKUP",
        "DATABASE",
        "SYSTEM_PORTAL",
        "OTHER"
      ])
      .optional(),
    username: z.string().max(240).nullable().optional(),
    // ⚠️ Regra de edição: password = null/undefined NÃO APAGA A SENHA ATUAL.
    // Só altera quando password é string não vazia (nova senha informada).
    password: z.string().max(2000).optional(),
    url: z.string().max(2048).nullable().optional(),
    hostname: z.string().max(240).nullable().optional(),
    domain: z.string().max(240).nullable().optional(),
    tenantId: z.string().max(240).nullable().optional(),
    unit: z.string().max(120).nullable().optional(),
    environment: z.string().max(120).nullable().optional(),
    owner: z.string().max(120).nullable().optional(),
    // observações: se null → limpar campo; se undefined → não mexer; se string não vazia → criptografar nova
    notes: z.string().max(20000).nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional()
  })
  .strict();

// GET /api/credentials/:id → detalhe (METADADOS APENAS; SEM passwordEncrypted SEM notesEncrypted)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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
      title: true,
      category: true,
      username: true,
      url: true,
      hostname: true,
      domain: true,
      tenantId: true,
      unit: true,
      environment: true,
      owner: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      authorId: true,
      updaterId: true,
      tags: { select: { id: true, name: true, color: true } },
      linkedServers: {
        select: {
          serverId: true,
          server: { select: { id: true, name: true, hostname: true, ipAddress: true } }
        }
      },
      linkedPrinters: {
        select: {
          printerId: true,
          printer: { select: { id: true, name: true, model: true, ipAddress: true } }
        }
      },
      linkedNetworks: {
        select: {
          networkId: true,
          network: { select: { id: true, name: true, vlan: true, cidr: true } }
        }
      },
      linkedDocuments: {
        select: {
          documentId: true,
          document: { select: { id: true, title: true, type: true, fileName: true } }
        }
      }
    }
  });
  if (!cred) return NextResponse.json({ message: "Credencial não encontrada" }, { status: 404 });
  // Autorização: VIEW_METADATA no cliente da credencial
  const allow = await allowOnCredential(session.user.id, cred.clientId, ["VIEW_METADATA"]);
  if (!allow.ok) {
    const { ip, ua } = extractRequestMeta(req);
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
      metadata: { operation: "READ_METADATA", reason: allow.reason }
    });
    return NextResponse.json({ message: allow.reason ?? "Acesso negado" }, { status: 403 });
  }
  const { ip, ua } = extractRequestMeta(req);
  await audit({
    userId: session.user.id,
    clientId: cred.clientId,
    credentialId: cred.id,
    action: AUDITABLE_ACTIONS.CREDENTIAL_READ,
    entityType: "credential",
    entityId: cred.id,
    result: "SUCCESS",
    ipAddress: ip,
    userAgent: ua,
    metadata: { category: cred.category }
  });
  return NextResponse.json(
    {
      credential: {
        ...cred,
        categoryLabel: CATEGORY_LABELS[cred.category] ?? cred.category,
        passwordMask: "••••••••",
        notesMask: cred.linkedDocuments.length > 0 || cred.owner ? "Protegido" : null
      }
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
        Expires: "0"
      }
    }
  );
}

// PUT /api/credentials/:id → editar METADADOS; nova senha só quando password string não vazia
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Autenticação requerida" }, { status: 401 });
  }
  const id = params.id;
  const current = await prisma.credential.findUnique({
    where: { id },
    select: { id: true, clientId: true, category: true, title: true }
  });
  if (!current) return NextResponse.json({ message: "Credencial não encontrada" }, { status: 404 });
  const allow = await allowOnCredential(session.user.id, current.clientId, ["EDIT_CREDENTIAL"]);
  if (!allow.ok) {
    const { ip, ua } = extractRequestMeta(req);
    await audit({
      userId: session.user.id,
      clientId: current.clientId,
      credentialId: id,
      action: AUDITABLE_ACTIONS.AUTHZ_DENIED,
      entityType: "credential",
      entityId: id,
      result: "DENIED",
      ipAddress: ip,
      userAgent: ua,
      metadata: { operation: "UPDATE", reason: allow.reason }
    });
    return NextResponse.json({ message: allow.reason ?? "Acesso negado" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body JSON inválido" }, { status: 400 });
  }
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados inválidos", errors: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const p = parsed.data;
  const updateData: Parameters<typeof prisma.credential.update>[0]["data"] = {
    title: p.title ?? undefined,
    category: p.category ?? undefined,
    username: p.username === undefined ? undefined : p.username,
    url: p.url === undefined ? undefined : p.url,
    hostname: p.hostname === undefined ? undefined : p.hostname,
    domain: p.domain === undefined ? undefined : p.domain,
    tenantId: p.tenantId === undefined ? undefined : p.tenantId,
    unit: p.unit === undefined ? undefined : p.unit,
    environment: p.environment === undefined ? undefined : p.environment,
    owner: p.owner === undefined ? undefined : p.owner,
    expiresAt: p.expiresAt === undefined ? undefined : p.expiresAt ? new Date(p.expiresAt) : null,
    updaterId: session.user.id,
    updatedAt: new Date()
  };
  // Regra de edição de SENHA: apenas string não vazia
  let passwordChanged = false;
  if (typeof p.password === "string" && p.password.length > 0) {
    updateData.passwordEncrypted = encryptSecret(p.password);
    updateData.passwordAlgo = "aes-256-gcm";
    passwordChanged = true;
  }
  // Regra de edição de OBSERVAÇÕES: se null → apagar; se string → nova criptografada; undefined → manter
  let notesChanged = false;
  if (p.notes !== undefined) {
    if (p.notes === null) {
      updateData.notesEncrypted = null;
      notesChanged = true;
    } else if (typeof p.notes === "string") {
      updateData.notesEncrypted = encryptSecret(p.notes);
      notesChanged = true;
    }
  }
  const updated = await prisma.credential.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      clientId: true,
      title: true,
      category: true,
      username: true,
      url: true,
      hostname: true,
      domain: true,
      tenantId: true,
      unit: true,
      environment: true,
      owner: true,
      expiresAt: true,
      updatedAt: true
    }
  });
  const { ip, ua } = extractRequestMeta(req);
  await audit({
    userId: session.user.id,
    clientId: updated.clientId,
    credentialId: id,
    action: AUDITABLE_ACTIONS.CREDENTIAL_UPDATE,
    entityType: "credential",
    entityId: id,
    result: "SUCCESS",
    ipAddress: ip,
    userAgent: ua,
    metadata: { passwordChanged, notesChanged, category: updated.category }
  });
  return NextResponse.json({ credential: { ...updated, categoryLabel: CATEGORY_LABELS[updated.category] } });
}

// DELETE /api/credentials/:id → apaga (se permissão DELETE_CREDENTIAL)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Autenticação requerida" }, { status: 401 });
  }
  const id = params.id;
  const current = await prisma.credential.findUnique({
    where: { id },
    select: { id: true, clientId: true, title: true, category: true }
  });
  if (!current) return NextResponse.json({ message: "Credencial não encontrada" }, { status: 404 });
  const allow = await allowOnCredential(session.user.id, current.clientId, ["DELETE_CREDENTIAL"]);
  if (!allow.ok) {
    const { ip, ua } = extractRequestMeta(req);
    await audit({
      userId: session.user.id,
      clientId: current.clientId,
      credentialId: id,
      action: AUDITABLE_ACTIONS.AUTHZ_DENIED,
      entityType: "credential",
      entityId: id,
      result: "DENIED",
      ipAddress: ip,
      userAgent: ua,
      metadata: { operation: "DELETE", reason: allow.reason }
    });
    return NextResponse.json({ message: allow.reason ?? "Acesso negado" }, { status: 403 });
  }
  await prisma.credential.delete({ where: { id } });
  const { ip, ua } = extractRequestMeta(req);
  await audit({
    userId: session.user.id,
    clientId: current.clientId,
    credentialId: id,
    action: AUDITABLE_ACTIONS.CREDENTIAL_DELETE,
    entityType: "credential",
    entityId: id,
    result: "SUCCESS",
    ipAddress: ip,
    userAgent: ua,
    metadata: { category: current.category, titleLen: current.title.length }
  });
  return NextResponse.json({ ok: true }, { status: 200 });
}

// ===== Helpers ======
async function allowOnCredential(
  userId: string,
  clientId: string,
  required: string[]
): Promise<{ ok: boolean; reason?: string; permissions?: string[] }> {
  const adminCheck = await prisma.user.findUnique({
    where: { id: userId, status: "ACTIVE" },
    select: { role: true }
  });
  if (!adminCheck) return { ok: false, reason: "Usuário inativo ou inexistente" };
  if (roleIsAtLeastAdmin(adminCheck.role)) return { ok: true };
  const mem = await prisma.clientMembership.findUnique({
    where: { clientId_userId: { clientId, userId } },
    select: { permissions: true }
  });
  if (!mem) return { ok: false, reason: "Sem vínculo com o cliente" };
  if (
    !hasAnyPermission({
      role: adminCheck.role,
      membershipPermissions: mem.permissions as string[],
      required: required as never
    })
  ) {
    return { ok: false, reason: "Permissões insuficientes" };
  }
  return { ok: true, permissions: mem.permissions as string[] };
}
