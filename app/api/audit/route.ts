import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AUDITABLE_ACTIONS, roleIsAtLeastAdmin, hasAnyPermission } from "@/lib/permissions";
import { audit, extractRequestMeta } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/audit?clientId=...&start=ISO&end=ISO&action=...&limit=50
// Visualizar apenas logs do cliente autorizado. Permissão AUDIT_VIEW ou ADMIN.
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
  const u = await prisma.user.findUnique({
    where: { id: session.user.id, status: "ACTIVE" },
    select: { role: true }
  });
  if (!u) return NextResponse.json({ message: "Usuário inativo" }, { status: 403 });
  if (!roleIsAtLeastAdmin(u.role)) {
    const mem = await prisma.clientMembership.findUnique({
      where: { clientId_userId: { clientId, userId: session.user.id } },
      select: { permissions: true }
    });
    if (!mem) {
      return NextResponse.json({ message: "Sem vínculo com o cliente" }, { status: 403 });
    }
    if (
      !hasAnyPermission({
        role: u.role,
        membershipPermissions: mem.permissions as string[],
        required: ["AUDIT_VIEW"] as never
      })
    ) {
      const { ip, ua } = extractRequestMeta(req);
      await audit({
        userId: session.user.id,
        clientId,
        action: AUDITABLE_ACTIONS.AUTHZ_DENIED,
        entityType: "audit_log",
        result: "DENIED",
        ipAddress: ip,
        userAgent: ua,
        metadata: { operation: "AUDIT_VIEW" }
      });
      return NextResponse.json({ message: "Permissões insuficientes" }, { status: 403 });
    }
  }
  const action = searchParams.get("action") || undefined;
  const start = searchParams.get("start") ? new Date(searchParams.get("start")!) : undefined;
  const end = searchParams.get("end") ? new Date(searchParams.get("end")!) : undefined;
  const limit = Math.min(200, Math.max(5, parseInt(searchParams.get("limit") || "100", 10)));
  const rows = await prisma.auditLog.findMany({
    where: {
      clientId,
      action: action ?? undefined,
      createdAt: {
        gte: start,
        lte: end
      }
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      result: true,
      createdAt: true,
      credentialId: true,
      userId: true,
      user: { select: { id: true, name: true, email: true } },
      credential: { select: { id: true, title: true } },
      metadata: true
    }
  });
  return NextResponse.json({ items: rows, count: rows.length });
}
