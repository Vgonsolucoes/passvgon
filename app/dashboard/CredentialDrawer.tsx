"use client";

import { useEffect, useState } from "react";
import { cn, formatDate, initialsOf } from "@/lib/utils";
import { useClient } from "./useClient";
import { generateSecurePassword } from "@/lib/crypto-client";

const CATEGORY_OPTIONS = [
  { value: "M365_TENANT", label: "Microsoft 365 / Tenant" },
  { value: "WINDOWS_SERVER_AD", label: "Windows Server / Active Directory" },
  { value: "REMOTE_ACCESS_RDP", label: "Acesso remoto / RDP" },
  { value: "FIREWALL_VPN", label: "Firewall / VPN" },
  { value: "SWITCH_WIFI", label: "Switch / Wi-Fi" },
  { value: "PRINTER", label: "Impressora" },
  { value: "NAS_BACKUP", label: "NAS / Backup" },
  { value: "DATABASE", label: "Banco de dados" },
  { value: "SYSTEM_PORTAL", label: "Sistema / Portal" },
  { value: "OTHER", label: "Outros" }
] as const;

type Env = "PRODUCAO" | "HOMOLOGACAO" | "DESENVOLVIMENTO" | "TESTE";

type Detail = {
  id: string;
  clientId: string;
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
  tags: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
  author: { name: string | null; email: string } | null;
  updater: { name: string | null; email: string } | null;
  linkedServers: { id: string; name: string; hostname: string | null }[];
  linkedPrinters: { id: string; name: string; ip: string | null }[];
  linkedNetworks: { id: string; name: string; vlan: number | null }[];
  linkedDocuments: { id: string; title: string }[];
};

const ENV_LABEL: Record<string, string> = {
  PRODUCAO: "Produção",
  HOMOLOGACAO: "Homologação",
  DESENVOLVIMENTO: "Desenvolvimento",
  TESTE: "Teste"
};

export function CredentialDrawer({
  id,
  initialMode,
  onClose,
  onChanged
}: {
  id: string;
  initialMode: "view" | "edit";
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { registerRevealed, getRevealed, clearRevealed, markCopied } = useClient();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [mode, setMode] = useState<"view" | "edit">(initialMode);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Edição
  const [e, setE] = useState({
    title: "",
    category: "M365_TENANT" as (typeof CATEGORY_OPTIONS)[number]["value"],
    username: "",
    newPassword: "",
    url: "",
    hostname: "",
    domain: "",
    tenantId: "",
    unit: "",
    environment: "" as "" | Env,
    owner: "",
    notes: "",
    expiresAt: "",
    tags: ""
  });
  const [showNewPass, setShowNewPass] = useState(false);
  const [notesLoad, setNotesLoad] = useState(false);
  const [notesRevealed, setNotesRevealed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch(`/api/credentials/${id}`, { credentials: "include", cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as Detail;
      })
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setE({
          title: d.title,
          category: d.category as typeof e.category,
          username: d.username ?? "",
          newPassword: "",
          url: d.url ?? "",
          hostname: d.hostname ?? "",
          domain: d.domain ?? "",
          tenantId: d.tenantId ?? "",
          unit: d.unit ?? "",
          environment: (d.environment as Env | "") ?? "",
          owner: d.owner ?? "",
          notes: "",
          expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString().slice(0, 16) : "",
          tags: d.tags.map((t) => t.name).join(", ")
        });
      })
      .catch((e) => !cancelled && setErr(e instanceof Error ? e.message : "Erro"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
      clearRevealed(`cred:${id}`);
      clearRevealed(`notes:${id}`);
    };
  }, [id, clearRevealed]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, id]);

  const onRevealPass = async () => {
    const rev = getRevealed(`cred:${id}`);
    if (rev) return clearRevealed(`cred:${id}`);
    try {
      const res = await fetch(`/api/credentials/${id}/reveal`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) return alert(`Revelação não autorizada: HTTP ${res.status}`);
      const d = (await res.json()) as { password?: string; notes?: string };
      if (d.password) registerRevealed(`cred:${id}`, d.password, 15_000);
    } catch {
      /* ignore */
    }
  };

  const onRevealNotes = async () => {
    const rev = getRevealed(`notes:${id}`);
    if (rev) return setNotesRevealed(false);
    setNotesLoad(true);
    try {
      const res = await fetch(`/api/credentials/${id}/reveal`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) return alert(`Revelação não autorizada: HTTP ${res.status}`);
      const d = (await res.json()) as { password?: string; notes?: string };
      if (d.notes) {
        registerRevealed(`notes:${id}`, d.notes, 15_000);
        setNotesRevealed(true);
      } else {
        setNotesRevealed(true);
      }
    } finally {
      setNotesLoad(false);
    }
  };

  const copy = async (v: string | null | undefined, label: string) => {
    if (!v) return alert(`${label} não informado`);
    try {
      await navigator.clipboard.writeText(v);
      markCopied();
    } catch {
      /* ignore */
    }
  };

  const copyPass = async () => {
    try {
      const res = await fetch(`/api/credentials/${id}/copy`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) return alert("Não autorizado");
      const d = (await res.json()) as { password?: string };
      if (d.password) {
        try {
          await navigator.clipboard.writeText(d.password);
          markCopied();
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
  };

  const onGenNew = () => {
    const pw = generateSecurePassword(20);
    setE((x) => ({ ...x, newPassword: pw }));
    setShowNewPass(true);
  };

  const save = async () => {
    if (!e.title.trim()) return setErr("Título obrigatório.");
    setSaving(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        title: e.title.trim(),
        category: e.category,
        username: e.username.trim() || null,
        url: e.url.trim() || null,
        hostname: e.hostname.trim() || null,
        domain: e.domain.trim() || null,
        tenantId: e.tenantId.trim() || null,
        unit: e.unit.trim() || null,
        environment: e.environment || null,
        owner: e.owner.trim() || null,
        expiresAt: e.expiresAt || null,
        tags: e.tags.split(",").map((s) => s.trim()).filter(Boolean)
      };
      if (e.newPassword.length > 0) {
        // Apenas enviar se o usuário escreveu algo (preserva senha atual caso vazio)
        body.newPassword = e.newPassword;
        body.replacePassword = true;
      }
      // Observações: só atualiza se estiver preenchido; limpa se string vazia e usuário tiver tocado.
      // Para evitar perder: só envia `notes` se usuário digitar algo ou limpar intencionalmente.
      // Regra: enviar notes sempre (null limpa, string nova criptografa, undefined mantem).
      // Mas na edição, para manter sem exibir: se string vazia -> preservamos antigo, se espaço vazio intencional?
      // Melhor: adicionamos checkbox limpar notas se necessário. Aqui: enviar string vazia = limpa.
      body.notes = e.notes;

      const res = await fetch(`/api/credentials/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }
      onChanged?.();
      setMode("view");
      // recarregar
      const rd = await fetch(`/api/credentials/${id}`, { credentials: "include", cache: "no-store" });
      if (rd.ok) {
        const nd = (await rd.json()) as Detail;
        setDetail(nd);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-vgon-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="absolute right-0 top-0 bottom-0 w-full md:w-[560px] max-w-full bg-white border-l border-vgon-border/60 shadow-[0_0_40px_-10px_rgba(11,27,54,0.3)] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-vgon-border/50 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide font-bold text-vgon-muted mb-1">
              {mode === "edit" ? "Editando credencial" : "Detalhes da credencial"}
            </p>
            <h2 className="text-[17px] font-bold text-vgon-ink truncate">
              {loading ? "Carregando..." : detail?.title ?? "Credencial"}
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {mode === "view" && detail && (
              <button
                onClick={() => setMode("edit")}
                className="h-9 px-3 rounded-xl text-[12.5px] font-semibold text-vgon-primary hover:bg-vgon-primary/10 transition inline-flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>
                </svg>
                Editar
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-vgon-muted hover:bg-vgon-soft hover:text-vgon-primary transition"
              title="Fechar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {loading && !detail ? (
          <div className="p-8 text-center text-vgon-muted">Carregando detalhes...</div>
        ) : err && !detail ? (
          <div className="p-8 text-center text-rose-600">{err}</div>
        ) : detail ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {err && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px]">
                  {err}
                </div>
              )}

              {mode === "view" ? (
                <>
                  {/* Info resumo */}
                  <section className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <InfoRow label="Categoria">
                      <span className="font-semibold text-vgon-ink text-[13px]">
                        {CATEGORY_OPTIONS.find((c) => c.value === detail.category)?.label ?? detail.category}
                      </span>
                    </InfoRow>
                    <InfoRow label="Ambiente">
                      <span className="font-semibold text-vgon-ink text-[13px]">
                        {detail.environment ? ENV_LABEL[detail.environment] ?? detail.environment : "—"}
                      </span>
                    </InfoRow>
                    <InfoRow label="Unidade">
                      <span className="font-mono text-[13px] text-vgon-ink">{detail.unit ?? "—"}</span>
                    </InfoRow>
                    <InfoRow label="Responsável">
                      <span className="text-[13px] text-vgon-ink">{detail.owner ?? "—"}</span>
                    </InfoRow>
                  </section>

                  <Divider />

                  {/* Usuário */}
                  <section>
                    <Label>Usuário / Login</Label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-vgon-soft/70 border border-vgon-border/60 text-[13.5px] font-mono text-vgon-ink truncate">
                        {detail.username ?? <span className="text-vgon-muted italic">não informado</span>}
                      </code>
                      <button
                        onClick={() => copy(detail.username, "Usuário")}
                        disabled={!detail.username}
                        className="h-10 px-3 rounded-xl border border-vgon-border hover:bg-vgon-soft text-[12.5px] font-semibold text-vgon-ink inline-flex items-center gap-1.5 disabled:opacity-50 transition"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copiar
                      </button>
                    </div>
                  </section>

                  {/* Senha */}
                  <section>
                    <Label>Senha</Label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-vgon-soft/70 border border-vgon-border/60 text-[14px] font-mono tracking-widest text-vgon-ink truncate">
                        {getRevealed(`cred:${id}`) ?? "••••••••"}
                      </code>
                      <button
                        onClick={onRevealPass}
                        className="h-10 px-3 rounded-xl border border-vgon-border hover:bg-vgon-soft text-[12.5px] font-semibold text-vgon-ink inline-flex items-center gap-1.5 transition"
                      >
                        {getRevealed(`cred:${id}`) ? "Ocultar" : "Revelar"}
                      </button>
                      <button
                        onClick={copyPass}
                        className="h-10 px-3 rounded-xl bg-vgon-primary hover:bg-vgon-petrol text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition"
                      >
                        Copiar senha
                      </button>
                    </div>
                    <p className="mt-2 text-[11.5px] text-vgon-muted">
                      A senha não é exibida por padrão. O valor é buscado sob autorização e ocultado automaticamente.
                    </p>
                  </section>

                  <Divider />

                  {/* Acesso */}
                  <section className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <InfoRow label="URL de acesso">
                      {detail.url ? (
                        <a
                          href={detail.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] font-mono text-vgon-primary hover:underline break-all"
                        >
                          {detail.url}
                        </a>
                      ) : (
                        <span className="text-vgon-muted italic text-[13px]">—</span>
                      )}
                    </InfoRow>
                    <InfoRow label="Hostname / IP">
                      <span className="font-mono text-[13px] text-vgon-ink">{detail.hostname ?? "—"}</span>
                    </InfoRow>
                    <InfoRow label="Domínio / AD">
                      <span className="font-mono text-[13px] text-vgon-ink">{detail.domain ?? "—"}</span>
                    </InfoRow>
                    <InfoRow label="Tenant ID">
                      <span className="font-mono text-[12px] text-vgon-ink break-all">{detail.tenantId ?? "—"}</span>
                    </InfoRow>
                    <InfoRow label="Vencimento">
                      {detail.expiresAt ? (
                        <span className={cn(
                          "font-semibold text-[13px]",
                          new Date(detail.expiresAt) < new Date() ? "text-rose-600" : "text-vgon-ink"
                        )}>
                          {formatDate(detail.expiresAt)}
                        </span>
                      ) : <span className="text-vgon-muted italic text-[13px]">sem data</span>}
                    </InfoRow>
                  </section>

                  {detail.tags.length > 0 && (
                    <section>
                      <Label>Tags</Label>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {detail.tags.map((t) => (
                          <span key={t.id} className="inline-flex items-center rounded-lg bg-vgon-soft text-vgon-ink text-[11.5px] font-semibold px-2 py-1">
                            #{t.name}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Observações protegidas */}
                  <section>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label>Observações protegidas</Label>
                      <button
                        onClick={onRevealNotes}
                        disabled={notesLoad}
                        className="h-7 px-2.5 rounded-lg text-[11.5px] font-semibold text-vgon-primary hover:bg-vgon-primary/10 inline-flex items-center gap-1.5 disabled:opacity-50 transition"
                      >
                        {notesLoad ? (
                          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3"/>
                            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                          </svg>
                        ) : notesRevealed && getRevealed(`notes:${id}`) ? (
                          "Ocultar"
                        ) : (
                          "Revelar"
                        )}
                      </button>
                    </div>
                    {notesRevealed && getRevealed(`notes:${id}`) ? (
                      <div className="p-4 rounded-xl bg-vgon-soft/60 border border-vgon-border/70 text-[13px] text-vgon-ink whitespace-pre-wrap break-words">
                        {getRevealed(`notes:${id}`)}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-vgon-soft/40 border border-vgon-border/60 text-[12.5px] text-vgon-muted italic text-center">
                        🔒 Conteúdo criptografado. Clique em Revelar para visualizar.
                      </div>
                    )}
                  </section>

                  {/* Ativos vinculados */}
                  {([
                    { key: "linkedServers", label: "Servidores vinculados", items: detail.linkedServers, desc: (x: Detail["linkedServers"][number]) => x.hostname ?? "" },
                    { key: "linkedPrinters", label: "Impressoras vinculadas", items: detail.linkedPrinters, desc: (x: Detail["linkedPrinters"][number]) => x.ip ?? "" },
                    { key: "linkedNetworks", label: "Redes e VLANs vinculadas", items: detail.linkedNetworks, desc: (x: Detail["linkedNetworks"][number]) => x.vlan ? `VLAN ${x.vlan}` : "" },
                    { key: "linkedDocuments", label: "Documentação vinculada", items: detail.linkedDocuments, desc: () => "" }
                  ] as const).map((sec) => (
                    sec.items.length > 0 && (
                      <section key={sec.key}>
                        <Label>{sec.label}</Label>
                        <ul className="mt-2 space-y-1.5">
                          {sec.items.map((itRaw) => {
                            const it = itRaw as { id: string; name?: string; title?: string; hostname?: string | null; ip?: string | null; vlan?: number | null };
                            return (
                              <li key={it.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-vgon-soft/50 border border-vgon-border/50">
                                <div>
                                  <p className="text-[13px] font-semibold text-vgon-ink">
                                    {it.name ?? it.title ?? it.id}
                                  </p>
                                  {sec.desc(itRaw as never) && (
                                    <p className="text-[11.5px] text-vgon-muted font-mono">{sec.desc(itRaw as never)}</p>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    )
                  ))}

                  <Divider />

                  {/* Datas e autor */}
                  <section className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <InfoRow label="Criado em">
                      <span className="text-[12.5px] text-vgon-ink">{formatDate(detail.createdAt)}</span>
                    </InfoRow>
                    <InfoRow label="Atualizado em">
                      <span className="text-[12.5px] text-vgon-ink">{formatDate(detail.updatedAt)}</span>
                    </InfoRow>
                    <InfoRow label="Autor">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-vgon-primary to-vgon-cyan text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white shadow">
                          {initialsOf(detail.author?.name ?? detail.author?.email)}
                        </div>
                        <span className="text-[12.5px] text-vgon-ink">
                          {detail.author?.name ?? detail.author?.email ?? "—"}
                        </span>
                      </div>
                    </InfoRow>
                    {detail.updater && (
                      <InfoRow label="Última atualização por">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-vgon-soft text-vgon-primary text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                            {initialsOf(detail.updater.name ?? detail.updater.email)}
                          </div>
                          <span className="text-[12.5px] text-vgon-ink">
                            {detail.updater.name ?? detail.updater.email}
                          </span>
                        </div>
                      </InfoRow>
                    )}
                  </section>
                </>
              ) : (
                // ============= MODO EDIÇÃO =============
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-[12px] text-vgon-petrol leading-relaxed">
                    <b>Regras de edição:</b> Deixe o campo de senha vazio para <b>preservar a senha atual</b>. Para limpar observações, apague todo o texto.
                  </div>

                  <Field label="Título" required>
                    <input value={e.title} onChange={(ev) => setE((x) => ({ ...x, title: ev.target.value }))} className={inp} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Categoria" required>
                      <select value={e.category} onChange={(ev) => setE((x) => ({ ...x, category: ev.target.value as typeof e.category }))} className={inp}>
                        {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Ambiente">
                      <select
                        value={e.environment}
                        onChange={(ev) => setE((x) => ({ ...x, environment: ev.target.value as typeof e.environment }))}
                        className={inp}
                      >
                        <option value="">—</option>
                        <option value="PRODUCAO">Produção</option>
                        <option value="HOMOLOGACAO">Homologação</option>
                        <option value="DESENVOLVIMENTO">Desenvolvimento</option>
                        <option value="TESTE">Teste</option>
                      </select>
                    </Field>
                  </div>

                  <Field label="Usuário / Login">
                    <input value={e.username} onChange={(ev) => setE((x) => ({ ...x, username: ev.target.value }))} className={inp} />
                  </Field>

                  <Field label="Nova senha (opcional)">
                    <div className="relative">
                      <input
                        type={showNewPass ? "text" : "password"}
                        value={e.newPassword}
                        onChange={(ev) => setE((x) => ({ ...x, newPassword: ev.target.value }))}
                        placeholder="Deixe vazio para manter a atual"
                        className={cn(inp, "pr-[170px] font-mono")}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button type="button" onClick={() => setShowNewPass((x) => !x)} className={miniBtn}>
                          {showNewPass ? "Ocultar" : "Mostrar"}
                        </button>
                        <button type="button" onClick={onGenNew} className={cn(miniBtn, "!bg-vgon-primary/10 !text-vgon-primary")}>
                          Gerar
                        </button>
                      </div>
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="URL de acesso">
                      <input value={e.url} onChange={(ev) => setE((x) => ({ ...x, url: ev.target.value }))} className={inp} />
                    </Field>
                    <Field label="Hostname / IP">
                      <input value={e.hostname} onChange={(ev) => setE((x) => ({ ...x, hostname: ev.target.value }))} className={inp} />
                    </Field>
                    <Field label="Domínio / AD">
                      <input value={e.domain} onChange={(ev) => setE((x) => ({ ...x, domain: ev.target.value }))} className={inp} />
                    </Field>
                    <Field label="Tenant ID">
                      <input value={e.tenantId} onChange={(ev) => setE((x) => ({ ...x, tenantId: ev.target.value }))} className={inp} />
                    </Field>
                    <Field label="Unidade / Filial">
                      <input value={e.unit} onChange={(ev) => setE((x) => ({ ...x, unit: ev.target.value }))} className={inp} />
                    </Field>
                    <Field label="Responsável">
                      <input value={e.owner} onChange={(ev) => setE((x) => ({ ...x, owner: ev.target.value }))} className={inp} />
                    </Field>
                    <Field label="Vencimento">
                      <input
                        type="datetime-local"
                        value={e.expiresAt}
                        onChange={(ev) => setE((x) => ({ ...x, expiresAt: ev.target.value }))}
                        className={inp}
                      />
                    </Field>
                  </div>

                  <Field label="Tags (vírgula)">
                    <input value={e.tags} onChange={(ev) => setE((x) => ({ ...x, tags: ev.target.value }))} className={inp} />
                  </Field>

                  <Field label="Observações protegidas (deixe vazio para limpar)">
                    <textarea
                      rows={5}
                      value={e.notes}
                      onChange={(ev) => setE((x) => ({ ...x, notes: ev.target.value }))}
                      placeholder="A nota original não é carregada aqui por segurança. Escreva um novo conteúdo para substituí-la."
                      className={cn(inp, "resize-y h-auto py-2.5")}
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-vgon-border/50 flex items-center justify-end gap-2">
              {mode === "edit" ? (
                <>
                  <button
                    onClick={() => setMode("view")}
                    className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-vgon-ink hover:bg-vgon-soft transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white bg-vgon-primary hover:bg-vgon-petrol shadow-[0_2px_8px_rgba(35,86,165,0.25)] transition disabled:opacity-60"
                    )}
                  >
                    {saving && (
                      <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3"/>
                        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                    )}
                    Salvar alterações
                  </button>
                </>
              ) : (
                <button
                  onClick={onClose}
                  className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-vgon-ink bg-vgon-soft hover:bg-vgon-soft/70 transition"
                >
                  Fechar
                </button>
              )}
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}

const inp =
  "w-full h-10 px-3 rounded-xl border border-vgon-border bg-white text-[13px] text-vgon-ink placeholder:text-vgon-muted focus:outline-none focus:ring-2 focus:ring-vgon-primary/20 focus:border-vgon-primary transition";

const miniBtn =
  "h-8 px-2.5 rounded-lg text-[11.5px] font-semibold bg-vgon-soft text-vgon-ink hover:bg-vgon-primary/10 hover:text-vgon-primary transition";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[11.5px] uppercase tracking-wider font-bold text-vgon-muted">
      {children}
    </span>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-vgon-ink mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide font-bold text-vgon-muted mb-1">{label}</p>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-vgon-border/60" />;
}
