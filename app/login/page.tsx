import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

interface LoginPageProps {
  searchParams: { callbackUrl?: string; error?: string };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const callbackUrl = searchParams?.callbackUrl ?? "/dashboard";
  const error = searchParams?.error ?? null;

  return (
    <LoginForm initialCallbackUrl={callbackUrl} initialError={error} />
  );
}
