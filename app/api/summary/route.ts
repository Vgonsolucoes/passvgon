import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { roleIsAtLeastAdmin, hasAnyPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// GET /api/summary?clientId=... → Dashboard Visão geral: 4 cards + tabela acessos recente + atividade.
// Requer VIEW_METADATA no cliente.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Autenticação requerida" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ message: "clientId obrigatório" }, { status: 400 });
  const allow = async () => {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id, status: "ACTIVE" },
      select: { role: true }
    });
    if (!u) return false;
    if (roleIsAtLeastAdmin(u.role)) return true;
    const mem = await prisma.clientMembership.findUnique({
      where: { clientId_userId: { clientId, userId: session.user.id } },
      select: { permissions: true }
    });
    if (!mem) return false;
    return hasAnyPermission({
      role: u.role,
      membershipPermissions: mem.permissions as string[],
      required: ["VIEW_METADATA"] as never
    });
  };
  if (!(await allow())) {
    return NextResponse.json({ message: "Acesso negado" }, { status: 403 });
  }

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    credentials,
    credentialsMonth,
    servers,
    serversMonth,
    printers,
    printersMonth,
    networks,
    networksMonth,
    recentActivity,
    recentAccesses
  ] = await Promise.all([
    prisma.credential.count({ where: { clientId } }),
    prisma.credential.count({ where: { clientId, createdAt: { gte: startOfMonth } } }),
    prisma.server.count({ where: { clientId } }),
    prisma.server.count({ where: { clientId, createdAt: { gte: startOfMonth } } }),
    prisma.printer.count({ where: { clientId } }),
    prisma.printer.count({ where: { clientId, createdAt: { gte: startOfMonth } } }),
    prisma.network.count({ where: { clientId } }),
    prisma.network.count({ where: { clientId, createdAt: { gte: startOfMonth } } }),
    prisma.auditLog.findMany({
      where: { clientId },
      take: 6,
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        action: true,
        result: true,
        createdAt: true,
        entityType: true,
        credentialId: true,
        userId: true,
        user: { select: { id: true, name: true, email: true } },
        credential: { select: { id: true, title: true } }
      }
    }),
    prisma.credential.findMany({
      where: { clientId },
      orderBy: [{ updatedAt: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        username: true,
        url: true,
        hostname: true,
        updatedAt: true
      }
    })
  ]);

  return NextResponse.json(
    {
      cards: {
        credentials: { total: credentials, monthDelta: credentialsMonth },
        servers: { total: servers, monthDelta: serversMonth },
        printers: { total: printers, monthDelta: printersMonth },
        networks: { total: networks, monthDelta: networksMonth }
      },
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        result: a.result,
        entityType: a.entityType,
        credential: a.credential ? { id: a.credential.id, title: a.credential.title } : null,
        user: a.user
          ? { id: a.user.id, name: a.user.name ?? a.user.email, email: a.user.email }
          : null,
        createdAt: a.createdAt
      })),
      recentAccesses: recentAccesses.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        username: c.username,
        address: c.url ?? c.hostname ?? "",
        updatedAt: c.updatedAt,
        passwordMask: "••••••••"
      }))
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache"
      }
    }
  );
}
