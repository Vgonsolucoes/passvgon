"use client";

import { useEffect, useState } from "react";
import { useClient } from "../useClient";
import { formatDate, initialsOf, cn } from "@/lib/utils";

type AuditRow = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  credential: { id: string; title: string } | null;
  user: { id: string; name: string; email: string } | null;
  result: string;
  createdAt: string;
  ip: string | null;
  userAgent: string | null;
};

const ACTION_LABEL: Record<string, string> = {
  CREDENTIAL_CREATE: "Criação de credencial",
  CREDENTIAL_UPDATE: "Atualização de credencial",
  CREDENTIAL_DELETE: "Exclusão de credencial",
  CREDENTIAL_REVEAL: "Revelação de senha",
  CREDENTIAL_COPY: "Cópia de senha",
  AUTH_SIGN_IN: "Login",
  AUTH_SIGN_OUT: "Logout",
  CLIENT_SWITCHED: "Troca de cliente",
  AUTHZ_DENIED: "Acesso negado",
  AUDIT_VIEWED: "Auditoria consultada",
  MEMBERSHIP_UPDATED: "Permissões alteradas",
  RECOVERY_CODE_USED: "Código de recuperação usado",
  TWO_FA_VERIFIED: "2FA verificado",
  TWO_FA_ENABLED: "2FA ativado",
  TWO_FA_DISABLED: "2FA desativado"
};

export default function AuditPage() {
  const { current } = useClient();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [action, setAction] = useState("");

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    const params = new URLSearchParams();
    params.set("clientId", current.id);
    params.set("limit", "50");
    if (action) params.set("action", action);
    fetch(`/api/audit?${params.toString()}`, { credentials: "include", cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as { items: AuditRow[] };
      })
      .then((d) => !cancelled && setRows(d.items ?? []))
      .catch((e) => !cancelled && setErr(e instanceof Error ? e.message : "Erro"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [current?.id, action]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-[28px] font-extrabold tracking-tight text-vgon-ink">Auditoria</h1>
          <p className="text-[14px] text-vgon-muted">
            Trilha de eventos das credenciais e dos acessos. Segredos nunca são gravados nos logs.
          </p>
        </div>
        <div className="self-start lg:self-end">
          <select value={action} onChange={(e) => setAction(e.target.value)} className="h-11 px-4 rounded-xl border border-vgon-border bg-white text-[13px] text-vgon-ink focus:outline-none focus:ring-2 focus:ring-vgon-primary/20 focus:border-vgon-primary transition">
            <option value="">Todas as ações</option>
            {Object.entries(ACTION_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </header>

      <section className="rounded-2xl bg-white border border-vgon-border/60 shadow-soft overflow-hidden">
        {loading && !rows.length ? (
          <div className="p-12 text-center text-vgon-muted">Carregando auditoria...</div>
        ) : err ? (
          <div className="p-12 text-center text-rose-600">{err}</div>
        ) : !rows.length ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-vgon-soft text-vgon-primary/70 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <h2 className="text-[16px] font-semibold text-vgon-ink mb-1">
              Nenhum registro de auditoria
            </h2>
            <p className="text-[13px] text-vgon-muted max-w-md mx-auto">
              Operações de criação, edição, exclusão, revelação e cópia de credenciais aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-vgon-soft/40 border-b border-vgon-border/50 text-[11px] uppercase tracking-wider font-semibold text-vgon-muted">
                  <th className="text-left px-6 py-3">Horário</th>
                  <th className="text-left px-4 py-3">Ação</th>
                  <th className="text-left px-4 py-3">Autor</th>
                  <th className="text-left px-4 py-3">Credencial</th>
                  <th className="text-left px-4 py-3">Resultado</th>
                  <th className="text-left px-6 py-3">Origem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const resultBadge =
                    r.result === "SUCCESS"
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : r.result === "DENIED"
                      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                      : r.result === "FAILURE"
                      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                      : "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
                  return (
                    <tr key={r.id} className="border-b border-vgon-border/40 last:border-0 hover:bg-vgon-soft/30 transition">
                      <td className="px-6 py-3.5 text-[12.5px] text-vgon-ink whitespace-nowrap">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-[13px] text-vgon-ink">
                          {ACTION_LABEL[r.action] ?? r.action}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vgon-primary/90 to-vgon-cyan text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white shadow">
                            {initialsOf(r.user?.name ?? r.user?.email)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-vgon-ink truncate max-w-[180px]">
                              {r.user?.name ?? r.user?.email ?? "Sistema"}
                            </p>
                            {r.user?.email && r.user.name && (
                              <p className="text-[11.5px] text-vgon-muted truncate max-w-[180px]">{r.user.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {r.credential ? (
                          <p className="text-[13px] text-vgon-ink truncate max-w-[200px]">{r.credential.title}</p>
                        ) : (
                          <span className="text-[12px] italic text-vgon-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold", resultBadge)}>
                          {r.result === "SUCCESS" ? "Sucesso" : r.result === "DENIED" ? "Negado" : r.result === "FAILURE" ? "Falha" : r.result}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="text-[12px] text-vgon-muted truncate max-w-[260px]">
                          {r.ip && <span className="font-mono">{r.ip}</span>}
                          {r.userAgent && (
                            <div className="text-[11px] opacity-80 truncate max-w-[260px]" title={r.userAgent}>
                              {r.userAgent}
                            </div>
                          )}
                          {!r.ip && !r.userAgent && <span className="italic">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
