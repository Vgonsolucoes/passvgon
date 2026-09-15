"use client";

import Link from "next/link";

export default function DiagramsPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-[28px] font-extrabold tracking-tight text-vgon-ink">Diagramas</h1>
          <p className="text-[14px] text-vgon-muted">
            Diagramas de infraestrutura. Não contêm senhas e respeitam as permissões do cliente.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start lg:self-end">
          <button disabled className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 border border-vgon-border bg-white text-sm font-semibold text-vgon-muted opacity-60 cursor-not-allowed">
            Exportar PNG
          </button>
          <button disabled className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 border border-vgon-border bg-white text-sm font-semibold text-vgon-muted opacity-60 cursor-not-allowed">
            Exportar PDF
          </button>
        </div>
      </header>

      <div className="rounded-2xl bg-white border border-vgon-border/60 shadow-soft p-8">
        <div className="relative h-[520px] rounded-xl bg-gradient-to-br from-slate-50 to-white border border-vgon-border/50 overflow-hidden flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full opacity-[0.35]" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet">
            <defs>
              <pattern id="gridDiag" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#D7E1EE"/>
              </pattern>
            </defs>
            <rect width="800" height="520" fill="url(#gridDiag)"/>
          </svg>
          <div className="relative text-center max-w-md px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-vgon-soft text-vgon-primary/70 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="6" rx="1"/>
                <rect x="14" y="3" width="7" height="6" rx="1"/>
                <rect x="3" y="15" width="7" height="6" rx="1"/>
                <rect x="14" y="15" width="7" height="6" rx="1"/>
                <path d="M10 6h4M6.5 9v6M17.5 9v6M10 18h4"/>
              </svg>
            </div>
            <h2 className="text-[18px] font-bold text-vgon-ink mb-1.5">Editor de diagramas em construção</h2>
            <p className="text-[13.5px] text-vgon-muted mb-5 leading-relaxed">
              Os diagramas são documentação complementar do cliente. Não são requisito para cadastrar senhas no cofre.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-vgon-primary text-white text-sm font-semibold hover:bg-vgon-petrol transition"
            >
              Voltar para visão geral
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
