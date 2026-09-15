import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardOverview } from "./DashboardOverview";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? "",
    role: (session.user.role ?? "USER") as "ADMIN" | "USER" | "OPERATOR" | "AUDITOR",
    image: session.user.image ?? null,
    twoFactorEnabled: Boolean((session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled),
    twoFactorVerified: Boolean((session.user as { twoFactorVerified?: boolean }).twoFactorVerified)
  };

  return <DashboardOverview user={user} />;
}
