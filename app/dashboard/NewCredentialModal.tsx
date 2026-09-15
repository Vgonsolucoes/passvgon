"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
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

type Props = {
  open: boolean;
  onClose: () => void;
  clientId: string | null;
  onCreated?: () => void;
  presetCategory?: string;
};

type Tab = "quick" | "full";

export function NewCredentialModal({ open, onClose, clientId, onCreated, presetCategory }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("quick");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [genLen, setGenLen] = useState(20);
  const [showPass, setShowPass] = useState(false);

  const [f, setF] = useState({
    title: "",
    category: (presetCategory as (typeof CATEGORY_OPTIONS)[number]["value"]) ?? "M365_TENANT",
    username: "",
    password: "",
    url: "",
    hostname: "",
    domain: "",
    tenantId: "",
    unit: "",
    environment: "",
    owner: "",
    notes: "",
    tags: "",
    expiresAt: "",
    linkedServerIds: [] as string[]
  });

  useEffect(() => {
    if (open) {
      setTab("quick");
      setErr(null);
      setF({
        title: "",
        category: (presetCategory as (typeof CATEGORY_OPTIONS)[number]["value"]) ?? "M365_TENANT",
        username: "",
        password: "",
        url: "",
        hostname: "",
        domain: "",
        tenantId: "",
        unit: "",
        environment: "",
        owner: "",
        notes: "",
        tags: "",
        expiresAt: "",
        linkedServerIds: []
      });
      setShowPass(false);
    }
  }, [open, presetCategory]);

  const strengths = useMemo(() => scorePassword(f.password), [f.password]);

  const onGen = () => {
    const pw = generateSecurePassword(genLen);
    setF((x) => ({ ...x, password: pw }));
    setShowPass(true);
  };

  const onCopyNew = async () => {
    if (!f.password) return;
    try {
      await navigator.clipboard.writeText(f.password);
    } catch {
      /* ignore */
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return setErr("Selecione um cliente primeiro.");
    if (!f.title.trim()) return setErr("Informe o título da credencial.");
    if (!f.category) return setErr("Selecione uma categoria.");

    setSaving(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        clientId,
        title: f.title.trim(),
        category: f.category,
        username: f.username.trim() || null,
        password: f.password,
        url: f.url.trim() || null,
        hostname: f.hostname.trim() || null,
        domain: f.domain.trim() || null,
        tenantId: f.tenantId.trim() || null,
        unit: f.unit.trim() || null,
        environment: f.environment.trim() || null,
        owner: f.owner.trim() || null,
        notes: f.notes.trim() || null,
        expiresAt: f.expiresAt || null,
        tags: f.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      };
      if (tab === "full") {
        body.linkedServerIds = f.linkedServerIds;
      }
      const res = await fetch("/api/credentials", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }
      onCreated?.();
      router.refresh();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-vgon-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-card border border-vgon-border/60 flex flex-col">
        <div className="px-6 py-5 border-b border-vgon-border/50 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-bold text-vgon-ink">Nova credencial</h2>
            <p className="text-[12.5px] text-vgon-muted mt-0.5">
              Cadastre um acesso seguro. A senha será criptografada com AES-256-GCM.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-vgon-muted hover:bg-vgon-soft hover:text-vgon-primary transition shrink-0"
            title="Fechar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="inline-flex items-center p-1 rounded-xl bg-vgon-soft text-[12.5px] font-semibold">
            {(["quick", "full"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 py-1.5 rounded-lg transition",
                  tab === t ? "bg-white text-vgon-ink shadow-soft" : "text-vgon-muted hover:text-vgon-ink"
                )}
              >
                {t === "quick" ? "Rápido" : "Completo"}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Título" required>
            <input
              autoFocus
              value={f.title}
              onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))}
              placeholder="Ex.: Administrador Microsoft 365"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Categoria" required>
              <select value={f.category} onChange={(e) => setF((x) => ({ ...x, category: e.target.value as typeof f.category }))} className={inputCls}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Usuário / Login">
              <input
                value={f.username}
                onChange={(e) => setF((x) => ({ ...x, username: e.target.value }))}
                placeholder="admin@cliente.com.br"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Senha ou segredo">
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={f.password}
                onChange={(e) => setF((x) => ({ ...x, password: e.target.value }))}
                placeholder="••••••••••••"
                className={cn(inputCls, "pr-[220px] font-mono tracking-wider")}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button type="button" onClick={() => setShowPass((x) => !x)} className={miniBtn} title={showPass ? "Ocultar" : "Mostrar"}>
                  {showPass ? "Ocultar" : "Mostrar"}
                </button>
                <button type="button" onClick={onCopyNew} className={miniBtn} title="Copiar" disabled={!f.password}>
                  Copiar
                </button>
                <button type="button" onClick={onGen} className={cn(miniBtn, "!bg-vgon-primary/10 !text-vgon-primary hover:!bg-vgon-primary/15")} title="Gerar senha forte">
                  🔄 Gerar
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11.5px] text-vgon-muted">
                <span>Tamanho:</span>
                <input
                  type="number"
                  min={12}
                  max={64}
                  step={1}
                  value={genLen}
                  onChange={(e) => setGenLen(Math.max(12, Math.min(64, parseInt(e.target.value || "12", 10))))}
                  className="w-16 h-7 px-2 rounded-lg border border-vgon-border text-[12px] font-mono"
                />
                <span>caracteres</span>
              </div>
              {f.password && (
                <div className="flex-1 min-w-0 ml-2">
                  <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-vgon-border/50">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 rounded-full transition",
                          i < strengths.bars
                            ? strengths.bars === 1
                              ? "bg-rose-500"
                              : strengths.bars === 2
                              ? "bg-amber-500"
                              : strengths.bars === 3
                              ? "bg-sky-500"
                              : "bg-emerald-500"
                            : "bg-vgon-border"
                        )}
                      />
                    ))}
                  </div>
                  <div className="text-[11px] text-vgon-muted mt-1">{strengths.label}</div>
                </div>
              )}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="URL de acesso">
              <input
                type="url"
                value={f.url}
                onChange={(e) => setF((x) => ({ ...x, url: e.target.value }))}
                placeholder="https://portal.office.com"
                className={inputCls}
              />
            </Field>
            {tab === "full" ? (
              <>
                <Field label="Hostname / IP">
                  <input value={f.hostname} onChange={(e) => setF((x) => ({ ...x, hostname: e.target.value }))} placeholder="10.0.0.10" className={inputCls} />
                </Field>
                <Field label="Domínio AD / Empresa">
                  <input value={f.domain} onChange={(e) => setF((x) => ({ ...x, domain: e.target.value }))} placeholder="cliente.local" className={inputCls} />
                </Field>
                <Field label="Tenant ID">
                  <input value={f.tenantId} onChange={(e) => setF((x) => ({ ...x, tenantId: e.target.value }))} placeholder="GUID Azure AD" className={inputCls} />
                </Field>
                <Field label="Unidade / Filial">
                  <input value={f.unit} onChange={(e) => setF((x) => ({ ...x, unit: e.target.value }))} placeholder="Matriz SP" className={inputCls} />
                </Field>
                <Field label="Ambiente">
                  <select
                    value={f.environment}
                    onChange={(e) => setF((x) => ({ ...x, environment: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    <option value="PRODUCAO">Produção</option>
                    <option value="HOMOLOGACAO">Homologação</option>
                    <option value="DESENVOLVIMENTO">Desenvolvimento</option>
                    <option value="TESTE">Teste</option>
                  </select>
                </Field>
                <Field label="Responsável / Técnico">
                  <input value={f.owner} onChange={(e) => setF((x) => ({ ...x, owner: e.target.value }))} placeholder="Nome" className={inputCls} />
                </Field>
                <Field label="Vencimento">
                  <input
                    type="datetime-local"
                    value={f.expiresAt}
                    onChange={(e) => setF((x) => ({ ...x, expiresAt: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              </>
            ) : null}
          </div>

          <Field label="Tags (separadas por vírgula)">
            <input
              value={f.tags}
              onChange={(e) => setF((x) => ({ ...x, tags: e.target.value }))}
              placeholder="admin, 365, tenant"
              className={inputCls}
            />
          </Field>

          {tab === "full" && (
            <Field label="Observações protegidas (criptografadas)">
              <textarea
                rows={4}
                value={f.notes}
                onChange={(e) => setF((x) => ({ ...x, notes: e.target.value }))}
                placeholder="Instruções, PINs complementares, dicas de uso..."
                className={cn(inputCls, "resize-y")}
              />
            </Field>
          )}

          {err && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px]">
              {err}
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-vgon-border/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-vgon-ink hover:bg-vgon-soft transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={onSubmit as never}
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
            Salvar credencial
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full h-10 px-3 rounded-xl border border-vgon-border bg-white text-[13px] text-vgon-ink placeholder:text-vgon-muted focus:outline-none focus:ring-2 focus:ring-vgon-primary/20 focus:border-vgon-primary transition";

const miniBtn =
  "h-8 px-2.5 rounded-lg text-[11.5px] font-semibold bg-vgon-soft text-vgon-ink hover:bg-vgon-primary/10 hover:text-vgon-primary transition disabled:opacity-50";

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

function scorePassword(pw: string): { bars: number; label: string } {
  if (!pw) return { bars: 0, label: "—" };
  let s = 0;
  if (pw.length >= 12) s++;
  if (pw.length >= 16) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  const bars = Math.max(1, Math.min(4, s));
  const label = bars === 1 ? "Fraca" : bars === 2 ? "Razoável" : bars === 3 ? "Boa" : "Forte";
  return { bars, label };
}
