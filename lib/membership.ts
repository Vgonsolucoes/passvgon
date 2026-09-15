import { prisma } from "@/lib/prisma";
import {
  DEFAULT_MEMBER_PERMISSIONS,
  hasAnyPermission,
  roleIsAtLeastAdmin,
  type MembershipPermissionString
} from "@/lib/permissions";

export type MembershipResult =
  | { ok: false; reason: string; permissions?: undefined }
  | { ok: true; permissions: MembershipPermissionString[]; reason?: undefined };

export async function getMembershipOrFail(
  userId: string,
  clientId: string,
  required: MembershipPermissionString[]
): Promise<MembershipResult> {
  const adminCheck = await prisma.user.findUnique({
    where: { id: userId, status: "ACTIVE" },
    select: { role: true }
  });
  if (!adminCheck) return { ok: false, reason: "Usuário inativo ou inexistente" };
  if (roleIsAtLeastAdmin(adminCheck.role)) {
    return { ok: true, permissions: DEFAULT_MEMBER_PERMISSIONS as MembershipPermissionString[] };
  }
  const mem = await prisma.clientMembership.findUnique({
    where: { clientId_userId: { clientId, userId } },
    select: { permissions: true, isPrimary: true }
  });
  if (!mem) return { ok: false, reason: "Sem vínculo com o cliente" };
  if (
    !hasAnyPermission({
      role: adminCheck.role,
      membershipPermissions: mem.permissions as MembershipPermissionString[],
      required
    })
  ) {
    return { ok: false, reason: "Permissões insuficientes" };
  }
  return { ok: true, permissions: mem.permissions as MembershipPermissionString[] };
}
