"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type SetupDto = {
  secret: string;
  qrcode: string;
  recoveryCodes: string[];
};

export default function TwoFactorSetupPage() {
  const [setup, setSetup] = useState<SetupDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState<null | boolean>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch("/api/auth/two-factor/setup", { credentials: "include", cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as SetupDto & { alreadyEnabled?: boolean };
      })
      .then((d) => {
        if (cancelled) return;
        if (d.alreadyEnabled) {
          setEnabled(true);
          setSetup({ secret: d.secret ?? "", qrcode: d.qrcode ?? "", recoveryCodes: [] });
        } else {
          setSetup(d);
          setEnabled(false);
        }
      })
      .catch((e) => !cancelled && setErr(e instanceof Error ? e.message : "Erro"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const confirm = async () => {
    if (!code || code.length < 6) return setErr("Informe o código de 6 dígitos do aplicativo.");
    setVerifying(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/two-factor/setup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }
      setConfirmed(true);
      setEnabled(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Código inválido");
    } finally {
      setVerifying(false);
    }
  };

  const copy = async (v: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(v);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1200);
    } catch {
      /* ignore */
    }
  };

  const copyAll = async () => {
    if (!setup?.recoveryCodes.length) return;
    try {
      await navigator.clipboard.writeText(setup.recoveryCodes.join("\n"));
      setCopiedIdx(-1);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-14 w-2/3 bg-white animate-pulse rounded-2xl" />
        <div className="rounded-2xl bg-white border border-vgon-border/60 shadow-soft p-8 animate-pulse h-[500px]" />
      </div>
    );
  }

  if (enabled && confirmed) {
    return (
      <div className="space-y-6">
        <header className="space-y-1.5">
          <h1 className="text-[28px] font-extrabold tracking-tight text-vgon-ink">Autenticação em dois fatores</h1>
          <p className="text-[14px] text-vgon-muted">2FA configurado e ativado nesta conta.</p>
        </header>
        <div className="rounded-2xl bg-white border border-vgon-border/60 shadow-soft p-10 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center ring-1 ring-emerald-200">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <h2 className="text-[20px] font-bold text-vgon-ink mb-2">Autenticação em dois fatores ativada</h2>
          <p className="text-[13.5px] text-vgon-muted max-w-lg mx-auto mb-6 leading-relaxed">
            Sempre que você fizer login, será solicitado um código temporário de 6 dígitos gerado pelo seu aplicativo autenticador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-[28px] font-extrabold tracking-tight text-vgon-ink">Configurar autenticação em dois fatores</h1>
        <p className="text-[14px] text-vgon-muted">
          Use um aplicativo autenticador (Microsoft Authenticator, Google Authenticator, 1Password, Authy etc.) para escanear o QR Code abaixo.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-2xl bg-white border border-vgon-border/60 shadow-soft p-6 lg:p-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-vgon-primary/10 text-vgon-primary flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M7 7v10M7 12h6M17 7v6M15 17h4"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-bold text-vgon-ink mb-1">1. Escaneie o código QR</h2>
              <p className="text-[13px] text-vgon-muted leading-relaxed">
                Abra o seu aplicativo de autenticação e adicione uma nova conta ao apontar a câmera para o código abaixo.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-vgon-border/60">
            <div className="w-[220px] h-[220px] shrink-0 rounded-2xl bg-white p-3 border border-vgon-border shadow-soft">
              {setup?.qrcode ? (
                <img src={setup.qrcode} alt="QR Code 2FA" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-vgon-muted text-xs text-center">
                  QR Code indisponível
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-[11.5px] uppercase tracking-wide font-bold text-vgon-muted mb-1">
                  Não consegue escanear?
                </p>
                <p className="text-[13px] text-vgon-ink mb-2">
                  Digite esta chave manualmente no aplicativo:
                </p>
                <div className="relative">
                  <code className="block w-full px-3.5 py-2.5 rounded-xl bg-vgon-soft border border-vgon-border text-[13px] font-mono text-vgon-ink break-all pr-20">
                    {setup?.secret ?? "—"}
                  </code>
                  <button
                    onClick={() => setup?.secret && copy(setup.secret, -99)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3 rounded-lg text-[11.5px] font-semibold bg-white border border-vgon-border text-vgon-primary hover:bg-vgon-primary/5 transition"
                  >
                    {copiedIdx === -99 ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
              <div className="text-[12.5px] text-vgon-muted space-y-1">
                <p>• Tipo: baseado em tempo (TOTP).</p>
                <p>• Algoritmo: SHA-1, 30 segundos, 6 dígitos.</p>
                <p>• Conta: PassVGON — e-mail da sessão atual.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl bg-white border border-vgon-border/60 shadow-soft p-6 lg:p-8 flex flex-col">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-vgon-cyan/15 text-vgon-petrol flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4"/>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-bold text-vgon-ink mb-1">2. Confirme um código</h2>
              <p className="text-[13px] text-vgon-muted leading-relaxed">
                Digite um código de 6 dígitos para confirmar que a configuração está correta antes de habilitar.
              </p>
            </div>
          </div>

          <label className="block">
            <span className="block text-[12px] font-semibold text-vgon-ink mb-1.5">
              Código do autenticador <span className="text-rose-500">*</span>
            </span>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className={cn(
                "w-full h-12 rounded-xl border border-vgon-border bg-white text-center text-[26px] font-bold font-mono tracking-[0.4em] text-vgon-ink placeholder:text-vgon-muted/60 focus:outline-none focus:ring-2 focus:ring-vgon-primary/20 focus:border-vgon-primary transition"
              )}
            />
          </label>

          {err && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px]">
              {err}
            </div>
          )}

          <button
            onClick={confirm}
            disabled={verifying || code.length < 6}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 bg-vgon-primary text-white text-[13.5px] font-semibold hover:bg-vgon-petrol shadow-[0_2px_10px_rgba(35,86,165,0.25)] transition disabled:opacity-60"
          >
            {verifying && (
              <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3"/>
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            )}
            Habilitar autenticação em dois fatores
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-amber-50/70 to-orange-50/40 border border-amber-200/80 p-6 lg:p-7 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 ring-1 ring-amber-200">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01"/>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-1.5">
              <h2 className="text-[17px] font-bold text-amber-900">3. Guarde seus códigos de recuperação</h2>
              <button
                onClick={copyAll}
                disabled={!setup?.recoveryCodes.length}
                className="h-8 px-3 rounded-lg text-[11.5px] font-semibold bg-white border border-amber-200 text-amber-800 hover:bg-amber-50 disabled:opacity-50 transition inline-flex items-center gap-1.5"
              >
                {copiedIdx === -1 ? "✓ Copiados" : "Copiar todos"}
              </button>
            </div>
            <p className="text-[13px] text-amber-800 mb-4 leading-relaxed">
              Estes códigos são de uso único e servem para recuperar a conta caso você perca o acesso ao aplicativo autenticador. <b>Armazene-os em local seguro e não compartilhe com ninguém.</b>
            </p>
            {setup?.recoveryCodes.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {setup.recoveryCodes.map((rc, i) => (
                  <div
                    key={i}
                    onClick={() => copy(rc, i)}
                    className="group flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-amber-200/80 cursor-pointer hover:border-amber-300 transition"
                  >
                    <code className="font-mono text-[13px] tracking-wider text-amber-900">
                      {rc.match(/.{1,4}/g)?.join("-") ?? rc}
                    </code>
                    <span className={cn(
                      "text-[10.5px] font-bold uppercase tracking-wide",
                      copiedIdx === i ? "text-emerald-600" : "text-amber-600/70 group-hover:text-amber-800"
                    )}>
                      {copiedIdx === i ? "COPIADO" : "CLIQUE PARA COPIAR"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-amber-800/80 italic">Códigos carregando...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
