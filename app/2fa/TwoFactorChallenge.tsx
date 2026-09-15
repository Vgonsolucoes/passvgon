"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export function TwoFactorChallenge({ email }: { email: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [mode, setMode] = useState<"code" | "recovery">("code");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const callbackUrl = search.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    const t = setTimeout(() => setError(null), 3500);
    return () => clearTimeout(t);
  }, [error]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      if (mode === "code") body.code = code.trim().replace(/\s+/g, "");
      else body.recovery = recovery.trim().toUpperCase();

      const res = await fetch("/api/auth/two-factor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (res.ok && data.ok) {
        router.replace(callbackUrl);
        router.refresh();
        return;
      }
      setAttempts((x) => x + 1);
      setError(data.message || "Código inválido. Tente novamente.");
    } catch (_err) {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#2356A5] flex items-center justify-center text-white font-bold text-xl shadow-md">
            VG
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center">
            Autenticação em dois fatores
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            {email}. Confirme o código de 6 dígitos do aplicativo autenticador ou use um código de recuperação.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4"
        >
          <div className="flex gap-2 mb-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setMode("code")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                mode === "code"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              Código TOTP
            </button>
            <button
              type="button"
              onClick={() => setMode("recovery")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                mode === "recovery"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              Código recuperação
            </button>
          </div>

          {mode === "code" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Código de 6 dígitos
              </label>
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xl tracking-[0.6em] font-mono text-center focus:outline-none focus:ring-2 focus:ring-[#2356A5]/60 focus:border-[#2356A5]"
                placeholder="000000"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Código de recuperação (uso único)
              </label>
              <input
                autoFocus
                required
                value={recovery}
                onChange={(e) => setRecovery(e.target.value.toUpperCase().slice(0, 16))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#2356A5]/60 focus:border-[#2356A5]"
                placeholder="XXXX-XXXX-XXXX"
              />
            </div>
          )}

          {error ? (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
              {error} {attempts >= 3 ? "Muitas tentativas. Aguarde ou use um código de recuperação." : ""}
            </div>
          ) : null}

          <button
            disabled={submitting || attempts >= 5}
            type="submit"
            className="w-full py-3 rounded-xl bg-[#2356A5] hover:bg-[#1e4a8f] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-sm"
          >
            {submitting ? "Validando..." : "Verificar e entrar"}
          </button>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Link
              href="/login"
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#2356A5] transition"
            >
              ← Sair e voltar ao login
            </Link>
            <div className="text-[10px] uppercase tracking-wider text-[#4CC6E5] font-semibold">
              Cofre TI
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
