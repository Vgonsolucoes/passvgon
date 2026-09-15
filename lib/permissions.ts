import type { UserRole } from "@prisma/client";

export type MembershipPermissionString =
  | "VIEW_METADATA"
  | "REVEAL_SECRET"
  | "COPY_SECRET"
  | "CREATE_CREDENTIAL"
  | "EDIT_CREDENTIAL"
  | "DELETE_CREDENTIAL"
  | "MANAGE_ACCESS"
  | "AUDIT_VIEW";

export const ALL_MEMBERSHIP_PERMISSIONS: MembershipPermissionString[] = [
  "VIEW_METADATA",
  "REVEAL_SECRET",
  "COPY_SECRET",
  "CREATE_CREDENTIAL",
  "EDIT_CREDENTIAL",
  "DELETE_CREDENTIAL",
  "MANAGE_ACCESS",
  "AUDIT_VIEW"
];

export const DEFAULT_MEMBER_PERMISSIONS: MembershipPermissionString[] = [
  "VIEW_METADATA",
  "REVEAL_SECRET",
  "COPY_SECRET",
  "CREATE_CREDENTIAL",
  "EDIT_CREDENTIAL"
];

export const ADMIN_OVERRIDE_ROLES: UserRole[] = ["ADMIN"];

export function roleIsAtLeastAdmin(role: UserRole | null | undefined): boolean {
  return role === "ADMIN";
}

export function hasAnyPermission(params: {
  role: UserRole | null | undefined;
  membershipPermissions: string[] | null | undefined;
  required: string[];
  match?: "any" | "all";
}): boolean {
  if (!params.required || params.required.length === 0) return true;
  if (params.role && ADMIN_OVERRIDE_ROLES.includes(params.role)) {
    return true;
  }
  const perms = new Set(params.membershipPermissions ?? []);
  const mode = params.match ?? "any";
  if (mode === "all") {
    return params.required.every((p) => perms.has(p));
  }
  return params.required.some((p) => perms.has(p));
}

export const AUDITABLE_ACTIONS = {
  AUTH_SIGN_IN: "AUTH_SIGN_IN",
  AUTH_SIGN_OUT: "AUTH_SIGN_OUT",
  AUTH_2FA_SETUP: "AUTH_2FA_SETUP",
  AUTH_2FA_ENABLE: "AUTH_2FA_ENABLE",
  AUTH_2FA_DISABLE: "AUTH_2FA_DISABLE",
  AUTH_2FA_CHALLENGE_SUCCESS: "AUTH_2FA_CHALLENGE_SUCCESS",
  AUTH_2FA_CHALLENGE_FAILED: "AUTH_2FA_CHALLENGE_FAILED",
  AUTH_2FA_RECOVERY_USED: "AUTH_2FA_RECOVERY_USED",
  CLIENT_SWITCHED: "CLIENT_SWITCHED",
  CREDENTIAL_LIST: "CREDENTIAL_LIST",
  CREDENTIAL_CREATE: "CREDENTIAL_CREATE",
  CREDENTIAL_READ: "CREDENTIAL_READ",
  CREDENTIAL_UPDATE: "CREDENTIAL_UPDATE",
  CREDENTIAL_DELETE: "CREDENTIAL_DELETE",
  CREDENTIAL_REVEAL: "CREDENTIAL_REVEAL",
  CREDENTIAL_COPY: "CREDENTIAL_COPY",
  AUTHZ_DENIED: "AUTHZ_DENIED"
} as const;

export type AuditableAction = (typeof AUDITABLE_ACTIONS)[keyof typeof AUDITABLE_ACTIONS];
