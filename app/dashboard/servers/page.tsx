"use client";

import Link from "next/link";
import { useClient } from "../useClient";
import { useState } from "react";
import { NewCredentialModal } from "../NewCredentialModal";

export default function ServersPage() {
  const { current } = useClient();
  const [showNew, setShowNew] = useState(false);
  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-[28px] font-extrabold tracking-tight text-vgon-ink">Servidores</h1>
          <p className="text-[14px] text-vgon-muted">
            Inventário complementar. As credenciais de acesso ficam armazenadas no cofre e vinculadas aqui.
          </p>
        </div>
        <div className="self-start lg:self-end flex items-center gap-2 flex-wrap">
          <button
            disabled
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 border border-vgon-border bg-white text-vgon-muted text-sm font-semibold opacity-60 cursor-not-allowed"
          >
            + Cadastrar servidor
          </button>
          <button
            onClick={() => setShowNew(true)}
            disabled={!current}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-vgon-primary text-white text-sm font-semibold hover:bg-vgon-petrol transition disabled:opacity-50"
          >
            + Credencial Windows Server
          </button>
        </div>
      </header>

      <div className="rounded-2xl bg-white border border-vgon-border/60 shadow-soft p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-vgon-soft text-vgon-petrol/70 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="7" rx="2"/>
            <rect x="3" y="13" width="18" height="7" rx="2"/>
            <circle cx="7" cy="7.5" r="1" fill="currentColor"/>
            <circle cx="7" cy="16.5" r="1" fill="currentColor"/>
          </svg>
        </div>
        <h2 className="text-[16px] font-semibold text-vgon-ink mb-1">Nenhum servidor cadastrado</h2>
        <p className="text-[13px] text-vgon-muted mb-5 max-w-md mx-auto">
          Os servidores são cadastrados como ativos complementares. Cadastre primeiro as credenciais de acesso no cofre, elas podem existir sem vínculo com equipamentos.
        </p>
        <Link
          href="/dashboard/credentials"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-vgon-primary text-white text-sm font-semibold hover:bg-vgon-petrol transition"
        >
          Abrir cofre de credenciais
        </Link>
      </div>

      <NewCredentialModal
        open={showNew}
        onClose={() => setShowNew(false)}
        clientId={current?.id ?? null}
        presetCategory="WINDOWS_SERVER_AD"
      />
    </div>
  );
}
