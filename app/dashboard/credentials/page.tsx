"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useClient } from "../useClient";
import { cn, formatDate } from "@/lib/utils";
import { NewCredentialModal } from "../NewCredentialModal";
import { CredentialDrawer } from "../CredentialDrawer";

const CATEGORY_OPTIONS = [
  { value: "", label: "Todas as categorias" },
  { value: "M365_TENANT", label: "Microsoft 365 / Tenant" },
  { value: "WINDOWS_SERVER_AD", label: "Windows Server / AD" },
  { value: "REMOTE_ACCESS_RDP", label: "Acesso remoto / RDP" },
  { value: "FIREWALL_VPN", label: "Firewall / VPN" },
  { value: "SWITCH_WIFI", label: "Switch / Wi-Fi" },
  { value: "PRINTER", label: "Impressora" },
  { value: "NAS_BACKUP", label: "NAS / Backup" },
  { value: "DATABASE", label: "Banco de dados" },
  { value: "SYSTEM_PORTAL", label: "Sistema / Portal" },
  { value: "OTHER", label: "Outros" }
];

const CATEGORY_STYLES: Record<string, { label: string; color: string }> = {
  M365_TENANT: { label: "Microsoft 365", color: "bg-blue-50 text-vgon-primary ring-blue-200" },
  WINDOWS_SERVER_AD: { label: "Windows Server", color: "bg-sky-50 text-vgon-petrol ring-sky-200" },
  REMOTE_ACCESS_RDP: { label: "Acesso remoto", color: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  FIREWALL_VPN: { label: "Firewall / VPN", color: "bg-orange-50 text-orange-700 ring-orange-200" },
  SWITCH_WIFI: { label: "Switch / Wi-Fi", color: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  PRINTER: { label: "Impressora", color: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200" },
  NAS_BACKUP: { label: "NAS / Backup", color: "bg-purple-50 text-purple-700 ring-purple-200" },
  DATABASE: { label: "Banco de dados", color: "bg-rose-50 text-rose-700 ring-rose-200" },
  SYSTEM_PORTAL: { label: "Sistema / Portal", color: "bg-cyan-50 text-cyan-700 ring-cyan-200" },
  OTHER: { label: "Outros", color: "bg-slate-50 text-slate-700 ring-slate-200" }
};

type CredentialRow = {
  id: string;
  title: string;
  category: string;
  username: string | null;
  url: string | null;
  hostname: string | null;
  domain: string | null;
  tenantId: string | null;
  unit: string | null;
  environment: string | null;
  owner: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: { id: string; name: string; color: string | null }[];
  passwordMask: string;
  _count: {
    linkedServers: number;
    linkedPrinters: number;
    linkedNetworks: number;
    linkedDocuments: number;
  };
};

export default function CredentialsPage() {
  const { current, loading: clientLoading, registerRevealed, getRevealed, clearRevealed, markCopied } = useClient();

  const [rows, setRows] = useState<CredentialRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [unit, setUnit] = useState("");
  const [environment, setEnvironment] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [openDrawer, setOpenDrawer] = useState<{ id: string; mode: "view" | "edit" } | null>(null);
  const [revealLoad, setRevealLoad] = useState<string | null>(null);

  const debouncedSearch = useDebounced(search, 250);

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    const params = new URLSearchParams();
    params.set("clientId", current.id);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (category) params.set("category", category);
    if (tag) params.set("tag", tag);
    if (unit) params.set("unit", unit);
    if (environment) params.set("environment", environment);

    fetch(`/api/credentials?${params.toString()}`, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { items: CredentialRow[]; total: number; page: number; pageCount: number };
      })
      .then((d) => {
        if (!cancelled) {
          setRows(d.items ?? []);
          setTotal(d.total ?? 0);
        }
      })
      .catch((e) => !cancelled && setErr(e instanceof Error ? e.message : "Erro"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [current?.id, page, pageSize, debouncedSearch, category, tag, unit, environment]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const onReveal = async (cid: string) => {
    const existing = getRevealed(`cred:${cid}`);
    if (existing) {
      clearRevealed(`cred:${cid}`);
      return;
    }
    setRevealLoad(cid);
    try {
      const res = await fetch(`/api/credentials/${cid}/reveal`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        alert(`Revelação não autorizada: ${res.status} ${msg.slice(0, 80)}`);
        return;
      }
      const d = (await res.json()) as { password?: string; notes?: string };
      if (d.password) registerRevealed(`cred:${cid}`, d.password, 15_000);
      if (d.notes) registerRevealed(`notes:${cid}`, d.notes, 15_000);
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

  const onCopyPass = async (cid: string) => {
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
    } catch {
      /* ignore */
    }
  };

  const onDelete = async (cid: string) => {
    if (!confirm("Deseja realmente excluir esta credencial? Esta ação é permanente e será auditada.")) return;
    try {
      const res = await fetch(`/api/credentials/${cid}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) return alert(`Falha ao excluir: HTTP ${res.status}`);
      setRows((r) => r.filter((x) => x.id !== cid));
      setTotal((t) => Math.max(0, t - 1));
      clearRevealed(`cred:${cid}`);
      clearRevealed(`notes:${cid}`);
    } catch {
      /* ignore */
    }
  };

  const catStyle = (c: string) => CATEGORY_STYLES[c] ?? CATEGORY_STYLES.OTHER;

  return (
    <div className="space-y-6">
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-[32px] font-extrabold tracking-tight text-vgon-ink leading-tight">
            Cofre de senhas
          </h1>
          <p className="text-[14px] text-vgon-muted">
            {current ? (
              <>
                Credenciais de{" "}
                <span className="font-semibold text-vgon-ink">{current.name}</span> — encontre, revele e gerencie acessos seguros.
              </>
            ) : (
              "Selecione um cliente para acessar o cofre."
            )}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          disabled={!current}
          className="inline-flex items-center gap-2 self-start lg:self-end rounded-xl px-5 py-3 bg-vgon-primary text-white text-sm font-semibold shadow-[0_2px_10px_rgba(35,86,165,0.25)] hover:bg-vgon-petrol transition-colors disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nova credencial
        </button>
      </section>

      {/* Barra de filtros e busca */}
      <section className="rounded-2xl bg-white border border-vgon-border/60 shadow-soft p-4 lg:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
          <div className="flex-1 min-w-0 relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-vgon-muted"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7"/>
              <path d="M21 21l-4.3-4.3"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={current ? "Buscar credencial neste cliente..." : "Selecione um cliente..."}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-vgon-border bg-white text-[13.5px] placeholder:text-vgon-muted focus:outline-none focus:ring-2 focus:ring-vgon-primary/20 focus:border-vgon-primary transition"
              disabled={!current}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-2 flex-shrink-0 w-full lg:w-auto">
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className={selectCls}>
              {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag" className={inputClsMini} />
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unidade" className={inputClsMini} />
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className={selectCls}
            >
              <option value="">Ambiente</option>
              <option value="PRODUCAO">Produção</option>
              <option value="HOMOLOGACAO">Homologação</option>
              <option value="DESENVOLVIMENTO">Desenvolvimento</option>
              <option value="TESTE">Teste</option>
            </select>
          </div>
        </div>
      </section>

      {/* Tabela */}
      <section className="rounded-2xl bg-white border border-vgon-border/60 shadow-soft overflow-hidden">
        {loading && !rows.length ? (
          <div className="p-12 text-center text-vgon-muted">Carregando credenciais...</div>
        ) : err ? (
          <div className="p-12 text-center text-rose-600">{err}</div>
        ) : !rows.length ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-vgon-soft text-vgon-primary/70 flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 className="font-semibold text-vgon-ink mb-1">
              Nenhuma credencial encontrada
            </h3>
            <p className="text-[13px] text-vgon-muted mb-5">
              {current ? "Ajuste os filtros ou cadastre a primeira credencial." : "Selecione um cliente."}
            </p>
            {current && (
              <button
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-vgon-primary text-white text-sm font-semibold hover:bg-vgon-petrol transition"
              >
                Nova credencial
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-vgon-soft/40 border-b border-vgon-border/50 text-[11px] uppercase tracking-wider font-semibold text-vgon-muted">
                    <th className="text-left px-6 py-3">Recurso</th>
                    <th className="text-left px-4 py-3">Categoria</th>
                    <th className="text-left px-4 py-3">Usuário</th>
                    <th className="text-left px-4 py-3">Endereço de acesso</th>
                    <th className="text-left px-4 py-3">Senha</th>
                    <th className="text-left px-4 py-3">Atualização</th>
                    <th className="text-right px-6 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const rev = getRevealed(`cred:${r.id}`);
                    const addr = r.url ?? r.hostname ?? r.domain ?? "";
                    return (
                      <tr key={r.id} className="border-b border-vgon-border/40 last:border-0 hover:bg-vgon-soft/30 transition align-middle">
                        <td className="px-6 py-3.5">
                          <div className="font-semibold text-[13.5px] text-vgon-ink leading-tight">
                            {r.title}
                          </div>
                          {r.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5 max-w-sm">
                              {r.tags.slice(0, 4).map((t) => (
                                <span key={t.id} className="inline-flex items-center rounded-md bg-vgon-soft text-vgon-muted text-[10.5px] font-semibold px-1.5 py-0.5">
                                  #{t.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold", catStyle(r.category).color)}>
                            {catStyle(r.category).label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-mono text-vgon-ink/90 truncate max-w-[180px]">
                              {r.username ?? <span className="text-vgon-muted italic">—</span>}
                            </span>
                            {r.username && (
                              <button
                                onClick={() => onCopyUser(r.username)}
                                className="p-1 rounded-md text-vgon-muted hover:text-vgon-primary hover:bg-vgon-soft transition shrink-0"
                                title="Copiar usuário"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {addr ? (
                            r.url ? (
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[12.5px] text-vgon-primary hover:underline truncate inline-flex items-center gap-1 max-w-[220px]"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                  <polyline points="15 3 21 3 21 9"/>
                                  <line x1="10" y1="14" x2="21" y2="3"/>
                                </svg>
                                <span className="truncate">{prettyAddr(addr)}</span>
                              </a>
                            ) : (
                              <span className="text-[12.5px] font-mono text-vgon-ink/80">{addr}</span>
                            )
                          ) : (
                            <span className="text-vgon-muted italic text-[12px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "font-mono text-[14px] tracking-widest",
                              rev ? "text-vgon-primary" : "text-vgon-ink/75"
                            )}>
                              {rev ?? r.passwordMask}
                            </span>
                            <button
                              onClick={() => onReveal(r.id)}
                              disabled={revealLoad === r.id}
                              className="p-1.5 rounded-lg text-vgon-muted hover:text-vgon-primary hover:bg-vgon-soft disabled:opacity-60 transition"
                              title={rev ? "Ocultar" : "Revelar senha"}
                            >
                              {revealLoad === r.id ? (
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
                              onClick={() => onCopyPass(r.id)}
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
                        <td className="px-4 py-3.5 text-[12.5px] text-vgon-muted whitespace-nowrap">
                          {formatDate(r.updatedAt)}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setOpenDrawer({ id: r.id, mode: "view" })}
                              className="p-2 rounded-lg text-vgon-muted hover:text-vgon-primary hover:bg-vgon-soft transition"
                              title="Abrir detalhes"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1"/>
                                <circle cx="19" cy="12" r="1"/>
                                <circle cx="5" cy="12" r="1"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => setOpenDrawer({ id: r.id, mode: "edit" })}
                              className="p-2 rounded-lg text-vgon-muted hover:text-vgon-primary hover:bg-vgon-soft transition"
                              title="Editar"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9"/>
                                <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => onDelete(r.id)}
                              className="p-2 rounded-lg text-vgon-muted hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Excluir"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1.5 14a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
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

            {/* Paginação */}
            <div className="px-6 py-4 border-t border-vgon-border/50 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[12.5px] text-vgon-muted">
                Exibindo <span className="font-semibold text-vgon-ink">{rows.length}</span> de <span className="font-semibold text-vgon-ink">{total}</span> credenciais
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 px-3 rounded-lg border border-vgon-border text-[12.5px] font-semibold text-vgon-ink hover:bg-vgon-soft disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Anterior
                </button>
                <span className="h-8 min-w-[36px] px-2 inline-flex items-center justify-center text-[12.5px] font-semibold text-vgon-ink">
                  {page} / {pageCount}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                  className="h-8 px-3 rounded-lg border border-vgon-border text-[12.5px] font-semibold text-vgon-ink hover:bg-vgon-soft disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <NewCredentialModal
        open={showNew}
        onClose={() => setShowNew(false)}
        clientId={current?.id ?? null}
        onCreated={() => {
          // Força recarregar
          setPage(1);
          setRows((r) => [...r]);
          const params = new URLSearchParams();
          if (!current) return;
          params.set("clientId", current.id);
          params.set("page", "1");
          params.set("pageSize", String(pageSize));
          if (debouncedSearch) params.set("search", debouncedSearch);
          if (category) params.set("category", category);
          if (tag) params.set("tag", tag);
          if (unit) params.set("unit", unit);
          if (environment) params.set("environment", environment);
          fetch(`/api/credentials?${params.toString()}`, { credentials: "include", cache: "no-store" })
            .then((res) => res.ok && res.json())
            .then((d) => d && (setRows(d.items ?? []), setTotal(d.total ?? 0)))
            .catch(() => {});
        }}
      />

      {openDrawer && (
        <CredentialDrawer
          id={openDrawer.id}
          initialMode={openDrawer.mode}
          onClose={() => setOpenDrawer(null)}
          onChanged={() => {
            // refresh leve
            const params = new URLSearchParams();
            if (!current) return;
            params.set("clientId", current.id);
            params.set("page", String(page));
            params.set("pageSize", String(pageSize));
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (category) params.set("category", category);
            if (tag) params.set("tag", tag);
            if (unit) params.set("unit", unit);
            if (environment) params.set("environment", environment);
            fetch(`/api/credentials?${params.toString()}`, { credentials: "include", cache: "no-store" })
              .then((res) => res.ok && res.json())
              .then((d) => d && (setRows(d.items ?? []), setTotal(d.total ?? 0)))
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}

const inputClsMini =
  "h-11 px-3 rounded-xl border border-vgon-border bg-white text-[13px] text-vgon-ink placeholder:text-vgon-muted focus:outline-none focus:ring-2 focus:ring-vgon-primary/20 focus:border-vgon-primary transition";

const selectCls =
  "h-11 px-3 rounded-xl border border-vgon-border bg-white text-[13px] text-vgon-ink focus:outline-none focus:ring-2 focus:ring-vgon-primary/20 focus:border-vgon-primary transition";

function prettyAddr(a: string): string {
  try {
    const u = new URL(a);
    return u.hostname + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return a;
  }
}

function useDebounced<T>(v: T, ms: number): T {
  const [out, setOut] = useState(v);
  useEffect(() => {
    const id = window.setTimeout(() => setOut(v), ms);
    return () => window.clearTimeout(id);
  }, [v, ms]);
  return out;
}
