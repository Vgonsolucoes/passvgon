"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useClient } from "./useClient";
import { cn, formatDate, initialsOf } from "@/lib/utils";
import { NewCredentialModal } from "./NewCredentialModal";
import { useRouter } from "next/navigation";

type SummaryDto = {
  cards: {
    credentials: { total: number; monthDelta: number };
    servers: { total: number; monthDelta: number };
    printers: { total: number; monthDelta: number };
    networks: { total: number; monthDelta: number };
  };
  recentActivity: {
    id: string;
    action: string;
    result: string;
    entityType: string | null;
    credential: { id: string; title: string } | null;
    user: { id: string; name: string; email: string } | null;
    createdAt: string;
  }[];
  recentAccesses: {
    id: string;
    title: string;
    category: string;
    username: string | null;
    address: string;
    updatedAt: string;
    passwordMask: string;
  }[];
};

const ACTION_LABEL: Record<string, string> = {
  CREDENTIAL_CREATE: "Credencial criada",
  CREDENTIAL_UPDATE: "Credencial atualizada",
  CREDENTIAL_DELETE: "Credencial excluída",
  CREDENTIAL_REVEAL: "Senha revelada",
  CREDENTIAL_COPY: "Senha copiada",
  AUTH_SIGN_IN: "Autenticação",
  AUTH_SIGN_OUT: "Logout",
  CLIENT_SWITCHED: "Cliente trocado",
  AUTHZ_DENIED: "Acesso negado",
  AUDIT_VIEWED: "Auditoria consultada"
};

const CATEGORY_LABEL: Record<string, { label: string; color: string }> = {
  M365_TENANT: { label: "Microsoft 365", color: "bg-blue-50 text-vgon-primary ring-1 ring-blue-200" },
  WINDOWS_SERVER_AD: { label: "Windows Server", color: "bg-sky-50 text-vgon-petrol ring-1 ring-sky-200" },
  REMOTE_ACCESS_RDP: { label: "Acesso remoto", color: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" },
  FIREWALL_VPN: { label: "Firewall / VPN", color: "bg-orange-50 text-orange-700 ring-1 ring-orange-200" },
  SWITCH_WIFI: { label: "Switch / Wi-Fi", color: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  PRINTER: { label: "Impressora", color: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200" },
  NAS_BACKUP: { label: "NAS / Backup", color: "bg-purple-50 text-purple-700 ring-1 ring-purple-200" },
  DATABASE: { label: "Banco de dados", color: "bg-rose-50 text-rose-700 ring-1 ring-rose-200" },
  SYSTEM_PORTAL: { label: "Sistema / Portal", color: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200" },
  OTHER: { label: "Outros", color: "bg-slate-50 text-slate-700 ring-1 ring-slate-200" }
};

export function DashboardOverview({ user }: { user: { twoFactorVerified: boolean; twoFactorEnabled: boolean } }) {
  const { current, loading: clientLoading, registerRevealed, getRevealed, clearRevealed, markCopied } = useClient();
  const [summary, setSummary] = useState<SummaryDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [revealLoad, setRevealLoad] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/summary?clientId=${encodeURIComponent(current.id)}`, {
          credentials: "include",
          cache: "no-store"
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SummaryDto;
        if (!cancelled) setSummary(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [current?.id]);

  const deltaText = (delta: number) => (delta > 0 ? `+${delta} este mês` : "Sem alterações");
  const deltaColor = (delta: number) => (delta > 0 ? "text-emerald-600" : "text-vgon-muted");

  const onReveal = async (cid: string) => {
    setRevealLoad(cid);
    try {
      const res = await fetch(`/api/credentials/${cid}/reveal`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        alert(`Não autorizado ou sessão inválida: ${res.status} ${msg.slice(0, 60)}`);
        return;
      }
      const d = (await res.json()) as { password?: string };
      if (d.password) registerRevealed(`cred:${cid}`, d.password, 15_000);
    } finally {
      setRevealLoad(null);
    }
  };

  const onCopyUser = async (u: string | null) => {
    if (!u) return;
    try {
      await navigator.clipboard.writeText(u);
      markCopied();
    } catch {
      /* ignore */
    }
  };

  const onCopyPass = async (cid: string, u: string | null) => {
    try {
      const res = await fetch(`/api/credentials/${cid}/copy`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) return alert("Não autorizado");
      const d = (await res.json()) as { username?: string; password?: string };
      const txt = d.password ?? "";
      if (!txt) return;
      try {
        await navigator.clipboard.writeText(txt);
        markCopied();
      } catch {
        /* ignore */
      }
      if (d.username && !u) {
        /* ignore fallback */
      }
    } catch {
      /* ignore */
    }
  };

  if (clientLoading || (!summary && loading)) {
    return (
      <div className="space-y-6">
        <div className="h-16 w-2/3 animate-pulse bg-white/70 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse bg-white rounded-xl border border-vgon-border/60" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[420px] animate-pulse bg-white rounded-xl border border-vgon-border/60" />
          <div className="h-[420px] animate-pulse bg-white rounded-xl border border-vgon-border/60" />
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="p-12 rounded-xl bg-white border border-vgon-border/60 text-center">
        <h2 className="text-lg font-semibold text-vgon-ink mb-2">Nenhum cliente selecionado</h2>
        <p className="text-sm text-vgon-muted">Selecione um cliente na barra lateral para visualizar o painel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========== HERO ========== */}
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-[40px] lg:text-[44px] font-extrabold tracking-tight text-vgon-ink leading-[1.05]">
            Infraestrutura sob controle.
          </h1>
          <p className="text-[17px] text-vgon-muted leading-relaxed">
            Gerencie as credenciais e os acessos de <span className="font-semibold text-vgon-ink">{current.name}</span>.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 self-start lg:self-end rounded-xl px-5 py-3 bg-vgon-primary text-white text-sm font-semibold shadow-[0_2px_10px_rgba(35,86,165,0.25)] hover:bg-vgon-petrol transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nova credencial
        </button>
      </section>

      {/* ========== 4 CARDS ========== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Credenciais",
            total: summary?.cards.credentials.total ?? 0,
            delta: summary?.cards.credentials.monthDelta ?? 0,
            href: "/dashboard/credentials",
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            ),
            ring: "bg-blue-50 text-vgon-primary ring-blue-200"
          },
          {
            label: "Servidores",
            total: summary?.cards.servers.total ?? 0,
            delta: summary?.cards.servers.monthDelta ?? 0,
            href: "/dashboard/servers",
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="7" rx="2"/>
                <rect x="3" y="13" width="18" height="7" rx="2"/>
                <circle cx="7" cy="7.5" r="0.9" fill="currentColor"/>
                <circle cx="7" cy="16.5" r="0.9" fill="currentColor"/>
              </svg>
            ),
            ring: "bg-sky-50 text-vgon-petrol ring-sky-200"
          },
          {
            label: "Impressoras",
            total: summary?.cards.printers.total ?? 0,
            delta: summary?.cards.printers.monthDelta ?? 0,
            href: "/dashboard/printers",
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9V3h12v6"/>
                <rect x="3" y="9" width="18" height="8" rx="2"/>
                <rect x="6" y="14" width="12" height="7" rx="1"/>
              </svg>
            ),
            ring: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200"
          },
          {
            label: "Redes e VLANs",
            total: summary?.cards.networks.total ?? 0,
            delta: summary?.cards.networks.monthDelta ?? 0,
            href: "/dashboard/networks",
            icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="4" r="2"/>
                <circle cx="6" cy="12" r="2"/>
                <circle cx="12" cy="20" r="2"/>
                <circle cx="18" cy="12" r="2"/>
                <path d="M10.5 5.5L7.5 10.5M13.5 5.5L16.5 10.5M7.5 13.5L10.5 18.5M16.5 13.5L13.5 18.5"/>
              </svg>
            ),
            ring: "bg-cyan-50 text-cyan-700 ring-cyan-200"
          }
        ].map((c) => (
          <Link
            key={c.label}
            href={c.href}
            onClick={() => c.href === "/dashboard/credentials" && clearRevealed()}
            className="group p-5 rounded-2xl bg-white border border-vgon-border/60 shadow-soft hover:shadow-card hover:border-vgon-primary/30 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-vgon-muted mb-2">{c.label}</p>
                <p className="text-[34px] font-extrabold tracking-tight text-vgon-ink leading-none">
                  {c.total}
                </p>
                <p className={cn("text-[12px] font-medium mt-3", deltaColor(c.delta))}>
                  {deltaText(c.delta)}
                </p>
              </div>
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center ring-1 shrink-0", c.ring)}>
                {c.icon}
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* ========== 2 COL: DIAGRAMA + ATIVIDADE ========== */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DIAGRAMA */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-vgon-border/60 shadow-soft p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-vgon-soft text-vgon-primary flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10"/>
                  <path d="M22 2 12 12"/>
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-vgon-ink text-[15px]">Diagrama de infraestrutura</h2>
                <p className="text-[12px] text-vgon-muted">Matriz • Visão geral</p>
              </div>
            </div>
            <Link
              href="/dashboard/diagrams"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-vgon-muted hover:text-vgon-primary transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar diagrama
            </Link>
          </div>
          <div className="relative h-[360px] rounded-xl bg-gradient-to-br from-slate-50 to-white border border-vgon-border/50 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full opacity-[0.4]" viewBox="0 0 800 360" preserveAspectRatio="xMidYMid meet">
              <defs>
                <pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="#D7E1EE"/>
                </pattern>
              </defs>
              <rect width="800" height="360" fill="url(#grid)"/>
            </svg>

            <div className="absolute left-1/2 top-8 -translate-x-1/2 flex flex-col items-center gap-2">
              <div className="w-20 h-14 rounded-2xl bg-white border border-vgon-border shadow-soft flex items-center justify-center">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#6B7A92" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 15c0-4 5-6 9-6s9 2 9 6-5 6-9 6-9-2-9-6z"/>
                  <path d="M3 10c0-4 5-6 9-6s9 2 9 6"/>
                </svg>
              </div>
              <div className="text-[12px] font-semibold text-vgon-ink">Internet</div>
            </div>

            <div className="absolute left-1/2 top-[32%] -translate-x-1/2 flex flex-col items-center gap-1.5">
              <div className="px-3 py-2 rounded-xl bg-vgon-primary/10 text-vgon-primary border border-vgon-primary/30 font-semibold text-[12px] shadow">
                Firewall
              </div>
              <div className="text-[11px] text-vgon-muted">10.0.0.1</div>
            </div>

            <div className="absolute left-1/2 top-[56%] -translate-x-1/2 flex flex-col items-center gap-1.5">
              <div className="px-3 py-2 rounded-xl bg-vgon-cyan/15 text-vgon-petrol border border-vgon-cyan/40 font-semibold text-[12px] shadow">
                Switch central
              </div>
              <div className="text-[11px] text-vgon-muted">10.0.0.10</div>
            </div>

            <div className="absolute left-[12%] top-[82%] -translate-x-1/2 flex flex-col items-center gap-1.5">
              <div className="px-3 py-2.5 rounded-xl bg-white border border-vgon-border shadow-soft text-center min-w-[120px]">
                <div className="text-[13px] font-semibold text-vgon-ink">Servidores</div>
                <div className="text-[11px] text-vgon-muted">VLAN 10</div>
              </div>
            </div>

            <div className="absolute left-1/2 top-[82%] -translate-x-1/2 flex flex-col items-center gap-1.5">
              <div className="px-3 py-2.5 rounded-xl bg-white border border-vgon-border shadow-soft text-center min-w-[120px]">
                <div className="text-[13px] font-semibold text-vgon-ink">Wi-Fi</div>
                <div className="text-[11px] text-vgon-muted">VLAN 20</div>
              </div>
            </div>

            <div className="absolute left-[88%] top-[82%] -translate-x-1/2 flex flex-col items-center gap-1.5">
              <div className="px-3 py-2.5 rounded-xl bg-white border border-vgon-border shadow-soft text-center min-w-[120px]">
                <div className="text-[13px] font-semibold text-vgon-ink">Impressoras</div>
                <div className="text-[11px] text-vgon-muted">VLAN 30</div>
              </div>
            </div>

            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 360">
              <line x1="400" y1="100" x2="400" y2="150" stroke="#D7E1EE" strokeWidth="2.5"/>
              <line x1="400" y1="190" x2="400" y2="260" stroke="#4CC6E5" strokeWidth="2.5"/>
              <line x1="400" y1="290" x2="110" y2="310" stroke="#D7E1EE" strokeWidth="2"/>
              <line x1="400" y1="290" x2="400" y2="310" stroke="#D7E1EE" strokeWidth="2"/>
              <line x1="400" y1="290" x2="690" y2="310" stroke="#D7E1EE" strokeWidth="2"/>
            </svg>
          </div>
        </div>

        {/* ATIVIDADE RECENTE + 2FA */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-vgon-border/60 shadow-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-vgon-soft text-vgon-primary flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <h2 className="font-semibold text-vgon-ink text-[15px]">Atividade recente</h2>
              </div>
              <Link
                href="/dashboard/audit"
                className="text-[12px] font-semibold text-vgon-primary hover:text-vgon-petrol transition"
              >
                Ver todas
              </Link>
            </div>
            <ul className="space-y-3">
              {summary?.recentActivity.length ? (
                summary.recentActivity.map((a) => {
                  const label = ACTION_LABEL[a.action] ?? a.action;
                  const accent = a.result === "SUCCESS" ? "bg-emerald-400" : a.result === "DENIED" ? "bg-rose-400" : "bg-vgon-border";
                  return (
                    <li key={a.id} className="flex items-start gap-3 p-3 -mx-3 rounded-xl hover:bg-vgon-soft/40 transition">
                      <div className="relative mt-0.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vgon-primary/90 to-vgon-cyan text-white text-xs font-bold flex items-center justify-center ring-2 ring-white shadow">
                          {initialsOf(a.user?.name)}
                        </div>
                        <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white", accent)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-vgon-ink leading-tight">
                          {label}
                          {a.credential && (
                            <span className="block text-[12px] text-vgon-muted font-normal mt-0.5 truncate">
                              {a.credential.title}
                            </span>
                          )}
                        </p>
                        <p className="text-[11.5px] text-vgon-muted mt-1">
                          por {a.user?.name ?? "Sistema"} • {formatDate(a.createdAt)}
                        </p>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="text-center py-8 text-[13px] text-vgon-muted">
                  Nenhuma atividade recente.
                </li>
              )}
            </ul>
          </div>

          {/* BLOCO 2FA */}
          <div
            className={cn(
              "rounded-2xl border shadow-soft p-5",
              user.twoFactorVerified
                ? "bg-emerald-50/60 border-emerald-200"
                : "bg-amber-50/60 border-amber-200"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center ring-1 shrink-0",
                  user.twoFactorVerified
                    ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                    : "bg-amber-100 text-amber-700 ring-amber-200"
                )}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className={cn(
                    "font-semibold text-[14px]",
                    user.twoFactorVerified ? "text-emerald-800" : "text-amber-800"
                  )}
                >
                  {user.twoFactorVerified ? "Acesso protegido" : "Autenticação em dois fatores recomendada"}
                </h3>
                <p
                  className={cn(
                    "text-[12px] mt-1",
                    user.twoFactorVerified ? "text-emerald-700" : "text-amber-700"
                  )}
                >
                  {user.twoFactorVerified
                    ? "Autenticação em dois fatores habilitada e sessão verificada."
                    : "Ative o 2FA para acessar credenciais protegidas."}
                </p>
                {!user.twoFactorVerified && (
                  <button
                    onClick={() => router.push("/dashboard/2fa-setup")}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-amber-600 text-white text-[12px] font-semibold hover:bg-amber-700 transition"
                  >
                    Configurar 2FA
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== ACESSOS DO CLIENTE ========== */}
      <section className="rounded-2xl bg-white border border-vgon-border/60 shadow-soft overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-vgon-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-vgon-soft text-vgon-primary flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-vgon-ink text-[15px]">Acessos do cliente</h2>
              <p className="text-[12px] text-vgon-muted">Atualizações recentes no cofre</p>
            </div>
          </div>
          <Link
            href="/dashboard/credentials"
            onClick={() => clearRevealed()}
            className="text-[12px] font-semibold text-vgon-primary hover:text-vgon-petrol transition"
          >
            Ver todos
          </Link>
        </div>

        {summary?.recentAccesses.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-vgon-soft/40 border-b border-vgon-border/50 text-[11px] uppercase tracking-wider font-semibold text-vgon-muted">
                  <th className="text-left px-6 py-3">Recurso</th>
                  <th className="text-left px-4 py-3">Categoria</th>
                  <th className="text-left px-4 py-3">Usuário</th>
                  <th className="text-left px-4 py-3">Senha</th>
                  <th className="text-left px-4 py-3">Atualização</th>
                  <th className="text-right px-6 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentAccesses.map((a) => {
                  const rev = getRevealed(`cred:${a.id}`);
                  const cat = CATEGORY_LABEL[a.category] ?? CATEGORY_LABEL.OTHER;
                  return (
                    <tr key={a.id} className="border-b border-vgon-border/40 last:border-0 hover:bg-vgon-soft/30 transition">
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-[13.5px] text-vgon-ink leading-tight">
                          {a.title}
                        </div>
                        {a.address && (
                          <div className="text-[11.5px] text-vgon-muted mt-0.5 truncate max-w-[260px]">
                            {a.address}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold", cat.color)}>
                          {cat.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[13px] font-mono text-vgon-ink/90">
                          {a.username ?? <span className="text-vgon-muted italic">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[14px] tracking-widest text-vgon-ink/80">
                            {rev ?? a.passwordMask}
                          </span>
                          <button
                            onClick={() => onReveal(a.id)}
                            disabled={revealLoad === a.id}
                            className="p-1.5 rounded-lg text-vgon-muted hover:text-vgon-primary hover:bg-vgon-soft disabled:opacity-60 transition"
                            title={rev ? "Ocultar" : "Revelar senha"}
                          >
                            {revealLoad === a.id ? (
                              <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
                                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                              </svg>
                            ) : rev ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19.5c-7 0-10.5-7.5-10.5-7.5a21.6 21.6 0 0 1 5.12-6.49m8.31-.15a21.6 21.6 0 0 1 4.57 6.64S23 19.5 16 19.5a10.7 10.7 0 0 1-1.82-.15"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                              </svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s3.5-7.5 11-7.5S23 12 23 12s-3.5 7.5-11 7.5S1 12 1 12z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => onCopyPass(a.id, a.username)}
                            className="p-1.5 rounded-lg text-vgon-muted hover:text-vgon-primary hover:bg-vgon-soft transition"
                            title="Copiar senha"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2"/>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[12.5px] text-vgon-muted">
                        {formatDate(a.updatedAt)}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => router.push(`/dashboard/credentials`)}
                            className="p-2 rounded-lg text-vgon-muted hover:text-vgon-primary hover:bg-vgon-soft transition"
                            title="Abrir no cofre"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 3h7v7"/>
                              <path d="M10 14L21 3"/>
                              <path d="M21 14v7H3V3h7"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => a.username && onCopyUser(a.username)}
                            className="p-2 rounded-lg text-vgon-muted hover:text-vgon-primary hover:bg-vgon-soft transition"
                            title="Copiar usuário"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2"/>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-vgon-soft text-vgon-primary/70 flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 className="font-semibold text-vgon-ink mb-1">
              Nenhuma credencial cadastrada para {current.name}
            </h3>
            <p className="text-[13px] text-vgon-muted mb-5">
              Comece a cadastrar os acessos seguros do cliente.
            </p>
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-vgon-primary text-white text-sm font-semibold hover:bg-vgon-petrol transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nova credencial
            </button>
          </div>
        )}
      </section>

      <NewCredentialModal
        open={showNew}
        onClose={() => setShowNew(false)}
        clientId={current?.id ?? null}
        onCreated={() => {
          router.refresh();
          // re-summarize manually
          if (current)
            fetch(`/api/summary?clientId=${encodeURIComponent(current.id)}`, { credentials: "include", cache: "no-store" })
              .then((r) => r.ok && r.json())
              .then((d) => d && setSummary(d as SummaryDto))
              .catch(() => {});
        }}
      />
    </div>
  );
}
