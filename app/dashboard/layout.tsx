import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ClientProvider } from "./useClient";
import { DashboardChrome } from "./DashboardChrome";

export const metadata: Metadata = {
  title: "PassVGON | Cofre TI",
  description: "Cofre de senhas de TI por cliente — PassVGON."
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.twoFactorRequired && !session.user.twoFactorVerified) {
    redirect("/2fa");
  }
  const user = session.user;
  const safeUser = {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? "",
    role: user.role,
    image: user.image ?? null,
    twoFactorEnabled: !!user.twoFactorEnabled,
    twoFactorVerified: !!user.twoFactorVerified
  };

  return (
    <ClientProvider userId={user.id}>
      <DashboardChrome user={safeUser}>{children}</DashboardChrome>
    </ClientProvider>
  );
}
