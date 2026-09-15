"use client";

import Link from "next/link";
import { useClient } from "../useClient";
import { NewCredentialModal } from "../NewCredentialModal";
import { useState } from "react";

export default function M365Page() {
  const { current } = useClient();
  const [showNew, setShowNew] = useState(false);
  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-[28px] font-extrabold tracking-tight text-vgon-ink">Tenants Microsoft</h1>
          <p className="text-[14px] text-vgon-muted">
            Informações do tenant, domínios e contas de serviço vinculadas ao cofre.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          disabled={!current}
          className="self-start lg:self-end inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-vgon-primary text-white text-sm font-semibold hover:bg-vgon-petrol transition disabled:opacity-50"
        >
          <span className="text-[16px] leading-none">+</span> Credencial Microsoft 365
        </button>
      </header>

      <div className="rounded-2xl bg-white border border-vgon-border/60 shadow-soft p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-vgon-soft text-vgon-primary/70 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="8" height="8" rx="1"/>
            <rect x="13" y="3" width="8" height="8" rx="1"/>
            <rect x="3" y="13" width="8" height="8" rx="1"/>
            <rect x="13" y="13" width="8" height="8" rx="1"/>
          </svg>
        </div>
        <h2 className="text-[16px] font-semibold text-vgon-ink mb-1">Nenhum tenant cadastrado</h2>
        <p className="text-[13px] text-vgon-muted mb-5 max-w-md mx-auto">
          Comece cadastrando a credencial administrativa do tenant Microsoft 365 do cliente. As senhas ficam exclusivamente no cofre.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => setShowNew(true)}
            disabled={!current}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-vgon-primary text-white text-sm font-semibold hover:bg-vgon-petrol transition disabled:opacity-50"
          >
            Cadastrar credencial M365
          </button>
          <Link
            href="/dashboard/credentials"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 border border-vgon-border bg-white text-vgon-ink text-sm font-semibold hover:bg-vgon-soft transition"
          >
            Ir para o cofre
          </Link>
        </div>
      </div>

      <NewCredentialModal
        open={showNew}
        onClose={() => setShowNew(false)}
        clientId={current?.id ?? null}
        presetCategory="M365_TENANT"
      />
    </div>
  );
}
