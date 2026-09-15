import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function shortId(id?: string | null, n = 8): string {
  if (!id) return "-";
  return id.slice(0, n);
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return "VG";
  const pieces = name.trim().split(/\s+/).slice(0, 2);
  return pieces.map((p) => (p[0] ?? "").toUpperCase()).join("") || "VG";
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

export function maskCnpj(cnpj: string): string {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}
