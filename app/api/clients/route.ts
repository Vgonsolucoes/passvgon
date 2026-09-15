import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { roleIsAtLeastAdmin, AUDITABLE_ACTIONS } from "@/lib/permissions";
import { audit, extractRequestMeta } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/clients → lista os clientes em que o usuário tem pelo menos VIEW_METADATA (ou ADMIN override = todos)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Autenticação requerida" }, { status: 401 });
  }
  const userId = session.user.id;
  const clients = await prisma.client.findMany({
    where: roleIsAtLeastAdmin(session.user.role)
      ? { status: "ACTIVE" }
      : {
          status: "ACTIVE",
          memberships: {
            some: {
              userId,
              OR: [
                { permissions: { hasSome: ["VIEW_METADATA"] } },
                { isPrimary: true }
              ]
            }
          }
        },
    orderBy: [{ name: "asc" }],
    include: roleIsAtLeastAdmin(session.user.role)
      ? undefined
      : {
          memberships: {
            where: { userId },
            select: { permissions: true, isPrimary: true }
          }
        }
  });
  const { ip, ua } = extractRequestMeta(req);
  await audit({
    userId,
    action: AUDITABLE_ACTIONS.CLIENT_SWITCHED,
    entityType: "client",
    entityId: null,
    result: "SUCCESS",
    ipAddress: ip,
    userAgent: ua,
    metadata: { count: clients.length }
  });
  return NextResponse.json({
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      logoUrl: c.logoUrl,
      membership:
        "memberships" in c && Array.isArray((c as { memberships?: unknown[] }).memberships)
          ? (c as { memberships: { permissions: string[]; isPrimary: boolean }[] }).memberships[0] ??
            null
          : null
    }))
  });
}

// POST /api/clients → cria cliente. Apenas ADMIN global pode criar.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Autenticação requerida" }, { status: 401 });
  }
  if (!roleIsAtLeastAdmin(session.user.role)) {
    const { ip, ua } = extractRequestMeta(req);
    await audit({
      userId: session.user.id,
      action: AUDITABLE_ACTIONS.AUTHZ_DENIED,
      entityType: "client",
      entityId: null,
      result: "DENIED",
      ipAddress: ip,
      userAgent: ua,
      metadata: { reason: "ADMIN_ROLE_REQUIRED", operation: "CLIENT_CREATE" }
    });
    return NextResponse.json({ message: "Permissão insuficiente" }, { status: 403 });
  }
  let body: { name?: string; slug?: string; document?: string; email?: string; phone?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body inválido" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ message: "Nome do cliente obrigatório (mínimo 2 caracteres)." }, { status: 400 });
  }
  let slug = (body.slug ?? name).trim().toLowerCase();
  slug = slug
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "cliente";
  let exists = await prisma.client.findUnique({ where: { slug }, select: { id: true } });
  if (exists) {
    const base = slug;
    let i = 1;
    while (exists) {
      const candidate = `${base}-${i}`;
      exists = await prisma.client.findUnique({ where: { slug: candidate }, select: { id: true } });
      if (!exists) slug = candidate;
      i++;
    }
  }
  const created = await prisma.client.create({
    data: {
      name,
      slug,
      document: body.document ?? undefined,
      email: body.email ?? undefined,
      phone: body.phone ?? undefined,
      status: "ACTIVE",
      memberships: {
        create: {
          userId: session.user.id,
          isPrimary: true,
          permissions: [
            "VIEW_METADATA",
            "REVEAL_SECRET",
            "COPY_SECRET",
            "CREATE_CREDENTIAL",
            "EDIT_CREDENTIAL",
            "DELETE_CREDENTIAL",
            "MANAGE_ACCESS",
            "AUDIT_VIEW"
          ]
        }
      }
    },
    select: { id: true, name: true, slug: true }
  });
  const { ip, ua } = extractRequestMeta(req);
  await audit({
    userId: session.user.id,
    clientId: created.id,
    action: "CLIENT_CREATE",
    entityType: "client",
    entityId: created.id,
    result: "SUCCESS",
    ipAddress: ip,
    userAgent: ua
  });
  return NextResponse.json({ client: created }, { status: 201 });
}
