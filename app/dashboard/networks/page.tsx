"use client";

import Link from "next/link";
import { useClient } from "../useClient";
import { useState } from "react";
import { NewCredentialModal } from "../NewCredentialModal";

export default function NetworksPage() {
  const { current } = useClient();
  const [showNew, setShowNew] = useState(false);
  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-[28px] font-extrabold tracking-tight text-vgon-ink">Redes e IPs</h1>
          <p className="text-[14px] text-vgon-muted">
            Topologia, sub-redes, VLANs e credenciais de equipamentos de rede vinculadas ao cofre.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          disabled={!current}
          className="self-start lg:self-end inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-vgon-primary text-white text-sm font-semibold hover:bg-vgon-petrol transition disabled:opacity-50"
        >
          + Credencial Firewall / Switch / VPN
        </button>
      </header>

      <div className="rounded-2xl bg-white border border-vgon-border/60 shadow-soft p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-vgon-soft text-cyan-700/70 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="4" r="2.2"/>
            <circle cx="6" cy="12" r="2.2"/>
            <circle cx="12" cy="20" r="2.2"/>
            <circle cx="18" cy="12" r="2.2"/>
            <path d="M10.3 5.8L7.7 10.2M13.7 5.8L16.3 10.2M7.7 13.8L10.3 18.2M16.3 13.8L13.7 18.2"/>
          </svg>
        </div>
        <h2 className="text-[16px] font-semibold text-vgon-ink mb-1">Nenhuma rede cadastrada</h2>
        <p className="text-[13px] text-vgon-muted mb-5 max-w-md mx-auto">
          Comece cadastrando as credenciais de firewall, VPN e switches no cofre. A topologia de rede é documentada posteriormente.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => setShowNew(true)}
            disabled={!current}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-vgon-primary text-white text-sm font-semibold hover:bg-vgon-petrol transition disabled:opacity-50"
          >
            Cadastrar credencial de rede
          </button>
          <Link
            href="/dashboard/diagrams"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 border border-vgon-border bg-white text-vgon-ink text-sm font-semibold hover:bg-vgon-soft transition"
          >
            Abrir diagrama
          </Link>
        </div>
      </div>

      <NewCredentialModal
        open={showNew}
        onClose={() => setShowNew(false)}
        clientId={current?.id ?? null}
        presetCategory="FIREWALL_VPN"
      />
    </div>
  );
}
