import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PassVGON | Gestão Patrimonial e Inventário",
  description:
    "Sistema PassVGON para gestão patrimonial, inventário e controle de ativos da VGON.",
  applicationName: "PassVGON",
  authors: [{ name: "VGON Soluções", url: "https://vgon.com.br" }],
  keywords: [
    "passvgon",
    "vgon",
    "gestão patrimonial",
    "inventário",
    "patrimônio",
    "ativos"
  ],
  robots: {
    index: false,
    follow: false
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
