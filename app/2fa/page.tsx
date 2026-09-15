import { TwoFactorChallenge } from "./TwoFactorChallenge";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TwoFactorPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Usuário sem 2FA habilitado e sessão já validada — não precisa ficar aqui
  if (session.user.twoFactorEnabled === false || !session.user.twoFactorRequired) {
    if (session.user.twoFactorVerified) redirect("/dashboard");
  }

  return <TwoFactorChallenge email={session.user.email ?? ""} />;
}
