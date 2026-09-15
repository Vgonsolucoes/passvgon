"use client";

import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-[28px] font-extrabold tracking-tight text-vgon-ink">Documentação</h1>
        <p className="text-[14px] text-vgon-muted">
          Manuais, procedimentos e documentos vinculados às credenciais e aos ativos do cliente.
        </p>
      </header>

      <div className="rounded-2xl bg-white border border-vgon-border/60 shadow-soft p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-vgon-soft text-vgon-primary/70 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2h8l5 5v15H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
            <path d="M14 2v6h6"/>
          </svg>
        </div>
        <h2 className="text-[16px] font-semibold text-vgon-ink mb-1">Nenhum documento enviado</h2>
        <p className="text-[13px] text-vgon-muted mb-5 max-w-md mx-auto">
          Os documentos são complementares. Credenciais e equipamentos podem referenciar manuais, termos e políticas de segurança.
        </p>
        <Link
          href="/dashboard/credentials"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-vgon-primary text-white text-sm font-semibold hover:bg-vgon-petrol transition"
        >
          Voltar para o cofre
        </Link>
      </div>
    </div>
  );
}
