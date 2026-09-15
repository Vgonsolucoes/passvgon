import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  AUDITABLE_ACTIONS,
  hasAnyPermission,
  roleIsAtLeastAdmin,
  DEFAULT_MEMBER_PERMISSIONS
} from "@/lib/permissions";
import { encryptSecret } from "@/lib/crypto";
import { audit, extractRequestMeta } from "@/lib/audit";
import type { CredentialCategory, Prisma } from "@prisma/client";
import { z } from "zod";

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

const CreateSchema = z
  .object({
    clientId: z.string().min(1),
    title: z.string().min(2).max(240),
    category: z.enum([
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
    ]) as z.ZodType<CredentialCategory>,
    username: z.string().max(240).nullish(),
    password: z.string().max(2000).nullish(),
    url: z.string().max(2048).nullish(),
    hostname: z.string().max(240).nullish(),
    domain: z.string().max(240).nullish(),
    tenantId: z.string().max(240).nullish(),
    unit: z.string().max(120).nullish(),
    environment: z.string().max(120).nullish(),
    owner: z.string().max(120).nullish(),
    notes: z.string().max(20000).nullish(), // observações (serão criptografadas → notesEncrypted)
    expiresAt: z.string().datetime().nullish(),
    tags: z.array(z.string().max(40)).nullish(),
    linkedServerIds: z.array(z.string().cuid()).nullish(),
    linkedPrinterIds: z.array(z.string().cuid()).nullish(),
    linkedNetworkIds: z.array(z.string().cuid()).nullish(),
    linkedDocumentIds: z.array(z.string().cuid()).nullish()
  })
  .strict();

// ---- GET /api/credentials?clientId=...&search=...&category=...&tag=...&unit=...&environment=...&page=1&pageSize=20
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Autenticação requerida" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ message: "clientId obrigatório" }, { status: 400 });
  }
  const membership = await getMembershipOrFail(session.user.id, clientId, ["VIEW_METADATA"]);
  if (!membership.ok) {
    return NextResponse.json({ message: membership.reason ?? "Acesso negado" }, { status: 403 });
  }
  const search = searchParams.get("search")?.trim() ?? "";
  const categoryRaw = searchParams.get("category");
  const category = CATEGORY_LABELS[categoryRaw as CredentialCategory]
    ? (categoryRaw as CredentialCategory)
    : null;
  const tag = searchParams.get("tag")?.trim() ?? null;
  const unit = searchParams.get("unit")?.trim() ?? null;
  const environment = searchParams.get("environment")?.trim() ?? null;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(5, parseInt(searchParams.get("pageSize") || "30", 10)));
  const skip = (page - 1) * pageSize;

  const where: Prisma.CredentialWhereInput = {
    clientId,
    AND: [
      category ? { category } : undefined,
      unit ? { unit } : undefined,
      environment ? { environment } : undefined,
      search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
              { hostname: { contains: search, mode: "insensitive" } },
              { domain: { contains: search, mode: "insensitive" } },
              { url: { contains: search, mode: "insensitive" } },
              { owner: { contains: search, mode: "insensitive" } }
            ]
          }
        : undefined,
      tag
        ? {
            tags: { some: { name: { equals: tag, mode: "insensitive" } } }
          }
        : undefined
    ].filter((x) => x != null) as object[]
  };

  const [total, rows] = await Promise.all([
    prisma.credential.count({ where }),
    prisma.credential.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        clientId: true,
        title: true,
        category: true,
        username: true,
        // ⚠️ passwordEncrypted NOT included (nunca em listagem)
        // ⚠️ notesEncrypted NOT included
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
        _count: {
          select: {
            linkedServers: true,
            linkedPrinters: true,
            linkedNetworks: true,
            linkedDocuments: true
          }
        }
      }
    })
  ]);

  const { ip, ua } = extractRequestMeta(req);
  await audit({
    userId: session.user.id,
    clientId,
    action: AUDITABLE_ACTIONS.CREDENTIAL_LIST,
    entityType: "credential",
    entityId: null,
    result: "SUCCESS",
    ipAddress: ip,
    userAgent: ua,
    metadata: { total, page, pageSize, searchLen: search.length }
  });

  return NextResponse.json(
    {
      items: rows.map((r) => ({
        ...r,
        categoryLabel: CATEGORY_LABELS[r.category] ?? r.category,
        passwordMask: "••••••••", // MÁSCARA FIXA 8 chars, NUNCA indica tamanho real
        author: undefined,
        updater: undefined
      })),
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize) || 1,
      categories: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))
    },
    {
      headers: {
        "Cache-Control":
          "private, no-store, max-age=0, must-revalidate, s-maxage=0, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0"
      }
    }
  );
}

// ---- POST /api/credentials → cria credencial. Requer permissão CREATE_CREDENTIAL no cliente.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Autenticação requerida" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body JSON inválido" }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados inválidos", errors: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const p = parsed.data;
  const membership = await getMembershipOrFail(session.user.id, p.clientId, ["CREATE_CREDENTIAL"]);
  if (!membership.ok) {
    const { ip, ua } = extractRequestMeta(req);
    await audit({
      userId: session.user.id,
      clientId: p.clientId,
      action: AUDITABLE_ACTIONS.AUTHZ_DENIED,
      entityType: "credential",
      entityId: null,
      result: "DENIED",
      ipAddress: ip,
      userAgent: ua,
      metadata: { operation: "CREATE", reason: membership.reason }
    });
    return NextResponse.json({ message: membership.reason ?? "Acesso negado" }, { status: 403 });
  }

  const passwordEncrypted = p.password ? encryptSecret(p.password) : null;
  const notesEncrypted = p.notes ? encryptSecret(p.notes) : null;

  // Normaliza tags (cria novas no cliente se não existirem)
  const tagNames = Array.from(new Set((p.tags ?? []).filter(Boolean).map((s) => s.slice(0, 40))));
  const tagConnectOrCreate = tagNames.length
    ? {
        tags: {
          connectOrCreate: tagNames.map((name) => ({
            where: { clientId_name: { clientId: p.clientId, name } },
            create: { clientId: p.clientId, name }
          }))
        }
      }
    : {};

  const credential = await prisma.credential.create({
    data: {
      clientId: p.clientId,
      title: p.title,
      category: p.category,
      username: p.username ?? null,
      passwordEncrypted,
      passwordAlgo: "aes-256-gcm",
      url: p.url ?? null,
      hostname: p.hostname ?? null,
      domain: p.domain ?? null,
      tenantId: p.tenantId ?? null,
      unit: p.unit ?? null,
      environment: p.environment ?? null,
      owner: p.owner ?? null,
      notesEncrypted,
      expiresAt: p.expiresAt ? new Date(p.expiresAt) : null,
      authorId: session.user.id,
      updaterId: session.user.id,
      ...tagConnectOrCreate,
      linkedServers: p.linkedServerIds?.length
        ? {
            create: p.linkedServerIds.map((serverId) => ({ serverId }))
          }
        : undefined,
      linkedPrinters: p.linkedPrinterIds?.length
        ? {
            create: p.linkedPrinterIds.map((printerId) => ({ printerId }))
          }
        : undefined,
      linkedNetworks: p.linkedNetworkIds?.length
        ? {
            create: p.linkedNetworkIds.map((networkId) => ({ networkId }))
          }
        : undefined,
      linkedDocuments: p.linkedDocumentIds?.length
        ? {
            create: p.linkedDocumentIds.map((documentId) => ({ documentId }))
          }
        : undefined
    },
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
      updatedAt: true
    }
  });
  const { ip, ua } = extractRequestMeta(req);
  await audit({
    userId: session.user.id,
    clientId: credential.clientId,
    credentialId: credential.id,
    action: AUDITABLE_ACTIONS.CREDENTIAL_CREATE,
    entityType: "credential",
    entityId: credential.id,
    result: "SUCCESS",
    ipAddress: ip,
    userAgent: ua,
    metadata: {
      category: credential.category,
      titleLen: credential.title.length,
      hasPassword: !!passwordEncrypted,
      hasNotes: !!notesEncrypted
    }
  });
  return NextResponse.json(
    { credential: { ...credential, categoryLabel: CATEGORY_LABELS[credential.category] } },
    { status: 201 }
  );
}

// ============ Helpers internos ============
export async function getMembershipOrFail(
  userId: string,
  clientId: string,
  required: Parameters<typeof hasAnyPermission>[0]["required"]
) {
  const adminCheck = await prisma.user.findUnique({
    where: { id: userId, status: "ACTIVE" },
    select: { role: true }
  });
  if (!adminCheck) return { ok: false as const, reason: "Usuário inativo ou inexistente" };
  if (roleIsAtLeastAdmin(adminCheck.role)) {
    return { ok: true as const, permissions: DEFAULT_MEMBER_PERMISSIONS };
  }
  const mem = await prisma.clientMembership.findUnique({
    where: { clientId_userId: { clientId, userId } },
    select: { permissions: true, isPrimary: true }
  });
  if (!mem) return { ok: false as const, reason: "Sem vínculo com o cliente" };
  if (!hasAnyPermission({ role: adminCheck.role, membershipPermissions: mem.permissions, required })) {
    return { ok: false as const, reason: "Permissões insuficientes" };
  }
  return { ok: true as const, permissions: mem.permissions };
}
