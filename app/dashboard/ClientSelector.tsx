"use client";

import { useEffect, useRef, useState } from "react";
import { useClient } from "./useClient";
import { cn } from "@/lib/utils";

export function ClientSelector() {
  const { clients, current, selectClient, loading, error } = useClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = clients.filter((c) =>
    !q ? true : c.name.toLowerCase().includes(q.toLowerCase()) || c.slug.includes(q.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition",
          open
            ? "border-vgon-primary bg-white shadow-[0_0_0_4px_rgba(35,86,165,0.10)]"
            : "border-vgon-border bg-white hover:bg-vgon-soft/60"
        )}
        disabled={loading}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-vgon-primary/90 to-vgon-cyan text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
            {current ? current.name.trim().slice(0, 2).toUpperCase() : "VG"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-vgon-ink">
              {loading ? "Carregando..." : current ? current.name : error ? "Sem acesso" : "Selecione um cliente"}
            </div>
            <div className="truncate text-[11px] text-vgon-muted">
              {current ? `#${current.slug}` : error ?? "Carregue clientes autorizados"}
            </div>
          </div>
        </div>
        <svg
          className={cn("shrink-0 text-vgon-muted transition-transform", open && "rotate-180")}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="absolute z-40 left-0 right-0 mt-2 rounded-xl border border-vgon-border bg-white shadow-card overflow-hidden">
          <div className="p-2 border-b border-vgon-border/60">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-vgon-muted"
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7"/>
                <path d="M21 21l-4.3-4.3"/>
              </svg>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-vgon-soft-2 border border-vgon-border/70 text-[13px] placeholder:text-vgon-muted focus:outline-none focus:ring-2 focus:ring-vgon-primary/20 focus:border-vgon-primary transition"
              />
            </div>
          </div>
          <ul className="max-h-[240px] overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <li className="px-3 py-5 text-[12px] text-vgon-muted text-center">
                Nenhum cliente encontrado.
              </li>
            ) : (
              filtered.map((c) => {
                const active = current?.id === c.id;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        selectClient(c.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition",
                        active
                          ? "bg-vgon-soft ring-1 ring-vgon-primary/15 text-vgon-primary"
                          : "hover:bg-vgon-soft/60 text-vgon-ink"
                      )}
                    >
                      <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-vgon-primary/90 to-vgon-cyan text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                        {c.name.trim().slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold">{c.name}</div>
                        <div className="truncate text-[11px] text-vgon-muted">#{c.slug}</div>
                      </div>
                      {active && (
                        <svg
                          className="ml-auto text-vgon-primary"
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          {clients.length === 0 && !loading && (
            <div className="px-4 py-4 border-t border-vgon-border/50 bg-vgon-soft-2">
              <p className="text-[12px] font-semibold text-vgon-ink">Nenhum cliente acessível</p>
              <p className="text-[11px] text-vgon-muted mt-0.5">
                Peça a um administrador que crie um cliente e te vincule.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
