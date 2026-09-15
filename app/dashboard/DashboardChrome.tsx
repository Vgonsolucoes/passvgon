"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useClient } from "./useClient";
import { cn, initialsOf, formatDate } from "@/lib/utils";
import { ClientSelector } from "./ClientSelector";
import { signOut } from "next-auth/react";

type UserShim = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "USER" | "OPERATOR" | "AUDITOR";
  image: string | null;
  twoFactorEnabled: boolean;
  twoFactorVerified: boolean;
};

const MENU: {
  key: string;
  label: string;
  href: string;
  icon: JSX.Element;
}[] = [
  {
    key: "overview",
    label: "Visão geral",
    href: "/dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z"/>
      </svg>
    )
  },
  {
    key: "credentials",
    label: "Credenciais",
    href: "/dashboard/credentials",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    )
  },
  {
    key: "m365",
    label: "Tenants Microsoft",
    href: "/dashboard/m365",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="8" rx="1"/>
        <rect x="13" y="3" width="8" height="8" rx="1"/>
        <rect x="3" y="13" width="8" height="8" rx="1"/>
        <rect x="13" y="13" width="8" height="8" rx="1"/>
      </svg>
    )
  },
  {
    key: "servers",
    label: "Servidores",
    href: "/dashboard/servers",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="7" rx="2"/>
        <rect x="3" y="13" width="18" height="7" rx="2"/>
        <circle cx="7" cy="7.5" r="0.8" fill="currentColor"/>
        <circle cx="7" cy="16.5" r="0.8" fill="currentColor"/>
      </svg>
    )
  },
  {
    key: "printers",
    label: "Impressoras",
    href: "/dashboard/printers",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9V3h12v6"/>
        <rect x="3" y="9" width="18" height="8" rx="2"/>
        <rect x="6" y="14" width="12" height="7" rx="1"/>
      </svg>
    )
  },
  {
    key: "networks",
    label: "Redes e IPs",
    href: "/dashboard/networks",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="4" r="1.6"/>
        <circle cx="6" cy="12" r="1.6"/>
        <circle cx="12" cy="20" r="1.6"/>
        <circle cx="18" cy="12" r="1.6"/>
        <path d="M10.5 5L7.5 11M13.5 5L16.5 11M7.5 13L10.5 19M16.5 13L13.5 19"/>
      </svg>
    )
  },
  {
    key: "docs",
    label: "Documentação",
    href: "/dashboard/docs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2h8l5 5v15H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
        <path d="M14 2v6h6"/>
      </svg>
    )
  },
  {
    key: "diagrams",
    label: "Diagramas",
    href: "/dashboard/diagrams",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="6" rx="1"/>
        <rect x="14" y="3" width="7" height="6" rx="1"/>
        <rect x="3" y="15" width="7" height="6" rx="1"/>
        <rect x="14" y="15" width="7" height="6" rx="1"/>
        <path d="M10 6h4M6.5 9v6M17.5 9v6M10 18h4"/>
      </svg>
    )
  },
  {
    key: "audit",
    label: "Auditoria",
    href: "/dashboard/audit",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    )
  },
  {
    key: "settings",
    label: "Configurações",
    href: "/dashboard/settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
      </svg>
    )
  }
];

export function DashboardChrome({
  user,
  children
}: {
  user: UserShim;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { current, clearRevealed } = useClient();

  const breadcrumb = useMemo(() => buildBreadcrumb(pathname, current?.name), [pathname, current]);

  const today = useMemo(() => formatDate(new Date()), []);

  return (
    <div className="min-h-screen w-full bg-vgon-soft-2 text-vgon-ink">
      <div className="flex min-h-screen">
        {/* ========== SIDEBAR ========== */}
        <aside className="sticky top-0 z-30 hidden md:flex md:flex-col md:shrink-0 w-[272px] min-h-screen border-r border-vgon-border/60 bg-white">
          <div className="px-6 pt-7 pb-5 flex flex-col gap-2 border-b border-vgon-border/50">
            <Link href="/dashboard" className="flex items-center gap-3">
              <LogoMark />
              <div className="flex flex-col leading-tight">
                <span className="text-[15px] font-extrabold tracking-tight text-vgon-ink">
                  COFRE TI
                </span>
                <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-vgon-muted">
                  vgon soluções
                </span>
              </div>
            </Link>

            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-vgon-muted">
                  Cliente selecionado
                </span>
              </div>
              <ClientSelector />
            </div>
          </div>

          <nav className="px-3 py-4 flex-1 overflow-y-auto">
            <ul className="space-y-0.5">
              {MENU.map((m) => {
                const active =
                  m.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname?.startsWith(m.href) ?? false;
                return (
                  <li key={m.key}>
                    <Link
                      onClick={() => {
                        // Ao mudar de tela (exceto voltar pra mesma) → limpa segredos
                        if (!active) clearRevealed();
                      }}
                      href={m.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors",
                        active
                          ? "bg-vgon-soft text-vgon-primary shadow-[inset_0_0_0_1px_rgba(35,86,165,0.12)]"
                          : "text-vgon-ink/80 hover:bg-vgon-soft/60 hover:text-vgon-primary"
                      )}
                    >
                      <span
                        className={cn(
                          "w-6 h-6 flex items-center justify-center rounded-lg",
                          active
                            ? "text-vgon-primary bg-white shadow-[0_1px_2px_rgba(35,86,165,0.08)]"
                            : "text-vgon-muted group-hover:text-vgon-primary"
                        )}
                      >
                        {m.icon}
                      </span>
                      {m.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 pt-4 border-t border-vgon-border/50 space-y-1 text-[11px] text-vgon-muted">
              <div className="flex items-center justify-between px-3">
                <span className="uppercase tracking-wide font-semibold">
                  {user.twoFactorEnabled ? "2FA ativo" : "2FA desativado"}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                    user.twoFactorEnabled && user.twoFactorVerified
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                  {user.twoFactorEnabled
                    ? user.twoFactorVerified
                      ? "Verificado"
                      : "Pendente"
                    : "Recomendado"}
                </span>
              </div>
              <div className="px-3 pt-1 leading-relaxed">
                Sessão segura — {today}
              </div>
            </div>
          </nav>

          <div className="p-4 border-t border-vgon-border/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                {user.image ? (
                  <img
                    src={user.image}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vgon-primary to-vgon-cyan text-white text-xs font-bold flex items-center justify-center shadow ring-2 ring-white">
                    {initialsOf(user.name ?? user.email)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-vgon-ink truncate">
                  {user.name ?? user.email.split("@")[0]}
                </p>
                <p className="text-[11px] text-vgon-muted truncate">{user.email}</p>
              </div>
              <button
                title="Sair"
                onClick={() =>
                  void signOut({ redirect: true, callbackUrl: "/login" })
                }
                className="p-1.5 rounded-lg text-vgon-muted hover:bg-vgon-soft hover:text-vgon-primary transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </aside>

        {/* ========== MAIN ========== */}
        <main className="flex-1 min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-20 bg-vgon-soft-2/85 backdrop-blur border-b border-vgon-border/50">
            <div className="px-6 lg:px-8 py-4 flex items-center gap-4">
              {/* Breadcrumb */}
              <nav aria-label="breadcrumb" className="flex-1 min-w-0">
                <ol className="flex items-center gap-1.5 text-[13px] text-vgon-muted truncate">
                  {breadcrumb.map((b, i) => (
                    <li key={i} className="flex items-center gap-1.5 min-w-0">
                      {i > 0 && (
                        <span className="text-vgon-muted/60">/</span>
                      )}
                      <span
                        className={cn(
                          "truncate",
                          i === breadcrumb.length - 1
                            ? "font-semibold text-vgon-ink"
                            : "hover:text-vgon-primary transition"
                        )}
                      >
                        {b}
                      </span>
                    </li>
                  ))}
                </ol>
              </nav>

              {/* Busca global */}
              <div className="hidden sm:block relative w-[280px] lg:w-[340px] shrink-0">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-vgon-muted"
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7"/>
                  <path d="M21 21l-4.3-4.3"/>
                </svg>
                <input
                  defaultValue=""
                  placeholder={current ? `Buscar neste cliente...` : "Buscar cliente, credencial, equipamento..."}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-vgon-border/80 text-[13px] placeholder:text-vgon-muted focus:outline-none focus:ring-2 focus:ring-vgon-primary/20 focus:border-vgon-primary transition"
                />
              </div>

              {/* 2FA badge */}
              <div
                className={cn(
                  "hidden lg:inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[12px] font-semibold ring-1",
                  user.twoFactorVerified
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-amber-50 text-amber-700 ring-amber-200"
                )}
                title={
                  user.twoFactorVerified
                    ? "Sessão validada com segundo fator de autenticação."
                    : "Segundo fator pendente para sessão completa."
                }
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
                2FA {user.twoFactorVerified ? "ativo" : "pendente"}
              </div>

              {/* Avatar compacto (mobile: só aparece; sidebar está oculta) */}
              <div className="md:hidden shrink-0">
                {user.image ? (
                  <img
                    src={user.image}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vgon-primary to-vgon-cyan text-white text-xs font-bold flex items-center justify-center shadow ring-2 ring-white">
                    {initialsOf(user.name ?? user.email)}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Conteúdo */}
          <div className="px-6 lg:px-8 py-6 lg:py-8 space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

function buildBreadcrumb(pathname: string | null, clientName?: string | null): string[] {
  const trail: string[] = ["Clientes"];
  if (clientName) trail.push(clientName);
  const p = pathname ?? "/dashboard";
  const map: Record<string, string> = {
    "/dashboard": "Visão geral",
    "/dashboard/credentials": "Credenciais",
    "/dashboard/m365": "Tenants Microsoft",
    "/dashboard/servers": "Servidores",
    "/dashboard/printers": "Impressoras",
    "/dashboard/networks": "Redes e IPs",
    "/dashboard/docs": "Documentação",
    "/dashboard/diagrams": "Diagramas",
    "/dashboard/audit": "Auditoria",
    "/dashboard/settings": "Configurações",
    "/dashboard/2fa": "Autenticação em dois fatores"
  };
  const key = Object.keys(map).find((k) => (k === "/dashboard" ? p === k : p.startsWith(k)));
  if (key) trail.push(map[key]);
  return trail;
}

function LogoMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-11 h-11 rounded-2xl bg-white ring-1 ring-vgon-border shadow-soft flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2356A5] via-[#3A7AC4] to-[#4CC6E5] flex items-center justify-center"
          aria-hidden
        >
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <path
              d="M2 4.5 C 2 3.2, 3.2 2, 4.5 2 L 27.5 2 C 28.8 2, 30 3.2, 30 4.5 L 30 18 C 30 22, 26.5 25.5, 22.5 25.5 L 17 25.5 L 14 30 L 11 25.5 L 9.5 25.5 C 5.5 25.5, 2 22, 2 18 Z"
              fill="#ffffff"
              opacity="0.18"
            />
            <path
              d="M4 18 L 4 5.5 C 4 4.7, 4.7 4, 5.5 4 L 26.5 4 C 27.3 4, 28 4.7, 28 5.5 L 28 18 C 28 22.5, 24.4 26.1, 20 26.1 L 16.7 26.1 L 14.7 29.2 L 12.7 26.1 L 10 26.1 C 5.6 26.1, 2 22.5, 2 18 Z"
              fill="#00598B"
            />
            <path
              d="M6 7 L 26 7 L 26 10 L 6 10 Z"
              fill="#ffffff"
              opacity="0.92"
            />
            <path
              d="M10 14 L 15.5 14 C 16.9 14 18 15.1 18 16.5 C 18 17.9 16.9 19 15.5 19 L 11.5 19 L 11.5 22 L 10 22 Z M 11.5 15.5 L 11.5 17.5 L 15.3 17.5 C 15.9 17.5, 16.4 17, 16.4 16.5 C 16.4 16, 15.9 15.5, 15.3 15.5 Z M 19.5 14 L 22 14 C 23.4 14, 24.5 15.1, 24.5 16.5 C 24.5 17.9, 23.4 19, 22 19 L 21 19 L 21 22 L 19.5 22 Z M 21 15.5 L 21 17.5 L 21.8 17.5 C 22.4 17.5, 22.9 17, 22.9 16.5 C 22.9 16, 22.4 15.5, 21.8 15.5 Z"
              fill="#4CC6E5"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
