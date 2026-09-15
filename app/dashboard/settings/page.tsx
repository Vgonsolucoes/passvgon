"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-[28px] font-extrabold tracking-tight text-vgon-ink">Configurações</h1>
        <p className="text-[14px] text-vgon-muted">
          Ajustes globais do sistema.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          title="Autenticação em dois fatores"
          desc="Sessão segura com TOTP + códigos de recuperação de uso único."
          badge="2FA"
          badgeColor="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          href="/dashboard/2fa-setup"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          }
        />
        <Card
          title="Clientes e acessos"
          desc="Cadastre clientes e gerencie permissões por usuário."
          badge="Multi-tenant"
          badgeColor="bg-blue-50 text-vgon-primary ring-1 ring-blue-200"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
        />
        <Card
          title="Segurança do cofre"
          desc="Chave de criptografia AES-256-GCM e algoritmos de hash de login."
          badge="AES-256-GCM"
          badgeColor="bg-purple-50 text-purple-700 ring-1 ring-purple-200"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          }
        />
        <Card
          title="Sobre o PassVGON"
          desc="Versão da aplicação e configuração de implantação."
          badge="v1.0.0"
          badgeColor="bg-slate-50 text-slate-700 ring-1 ring-slate-200"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
          }
        />
      </div>
    </div>
  );
}

function Card({
  title,
  desc,
  badge,
  badgeColor,
  icon,
  href
}: {
  title: string;
  desc: string;
  badge: string;
  badgeColor: string;
  icon: JSX.Element;
  href?: string;
}) {
  const Inner = (
    <div className="p-6 rounded-2xl bg-white border border-vgon-border/60 shadow-soft hover:shadow-card hover:border-vgon-primary/25 transition-all h-full">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="w-11 h-11 rounded-xl bg-vgon-soft text-vgon-primary flex items-center justify-center ring-1 ring-vgon-border/60 shrink-0">
          {icon}
        </div>
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-bold", badgeColor)}>
          {badge}
        </span>
      </div>
      <h3 className="font-semibold text-vgon-ink text-[15px] mb-1">{title}</h3>
      <p className="text-[13px] text-vgon-muted leading-relaxed">{desc}</p>
    </div>
  );
  return href ? <Link href={href}>{Inner}</Link> : Inner;
}
