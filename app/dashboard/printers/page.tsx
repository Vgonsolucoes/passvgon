"use client";

import Link from "next/link";
import { useClient } from "../useClient";
import { useState } from "react";
import { NewCredentialModal } from "../NewCredentialModal";

export default function PrintersPage() {
  const { current } = useClient();
  const [showNew, setShowNew] = useState(false);
  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-[28px] font-extrabold tracking-tight text-vgon-ink">Impressoras</h1>
          <p className="text-[14px] text-vgon-muted">
            Inventário de impressoras. Credenciais do painel administrativo permanecem no cofre.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          disabled={!current}
          className="self-start lg:self-end inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-vgon-primary text-white text-sm font-semibold hover:bg-vgon-petrol transition disabled:opacity-50"
        >
          + Credencial de impressora
        </button>
      </header>

      <div className="rounded-2xl bg-white border border-vgon-border/60 shadow-soft p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-vgon-soft text-fuchsia-600/70 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9V3h12v6"/>
            <rect x="3" y="9" width="18" height="8" rx="2"/>
            <rect x="6" y="14" width="12" height="7" rx="1"/>
          </svg>
        </div>
        <h2 className="text-[16px] font-semibold text-vgon-ink mb-1">Nenhuma impressora registrada</h2>
        <p className="text-[13px] text-vgon-muted mb-5 max-w-md mx-auto">
          Use o cofre para guardar as senhas do painel web e SNMP das impressoras, depois vincule ao ativo quando necessário.
        </p>
        <Link
          href="/dashboard/credentials"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-vgon-primary text-white text-sm font-semibold hover:bg-vgon-petrol transition"
        >
          Ir para o cofre
        </Link>
      </div>

      <NewCredentialModal
        open={showNew}
        onClose={() => setShowNew(false)}
        clientId={current?.id ?? null}
        presetCategory="PRINTER"
      />
    </div>
  );
}
