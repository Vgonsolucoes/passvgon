import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-700 to-sky-500 flex items-center justify-center text-white font-bold">
              VG
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                PassVGON
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gestão Patrimonial &amp; Inventário
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-3xl w-full text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Sistema Online
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
            Controle completo do seu{" "}
            <span className="bg-gradient-to-r from-blue-700 to-sky-500 bg-clip-text text-transparent">
              patrimônio
            </span>
          </h2>

          <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Plataforma corporativa para gestão de ativos, inventário inteligente
            com QR Code, auditoria e relatórios estratégicos.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold transition-colors shadow-lg shadow-blue-700/20"
            >
              Acessar Painel
            </Link>
            <a
              href="https://vgon.com.br"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
            >
              Conhecer a VGON
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
            {[
              {
                title: "Inventário por QR Code",
                desc: "Leitura rápida e precisa de ativos utilizando QR codes dinâmicos."
              },
              {
                title: "Auditoria Completa",
                desc: "Registro de todas as ações com trilha de auditoria e responsible."
              },
              {
                title: "Relatórios Estratégicos",
                desc: "Dashboards analíticos e exportação em múltiplos formatos."
              }
            ].map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:shadow-lg transition-shadow"
              >
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} VGON Soluções. Todos os direitos reservados.</p>
          <p>PassVGON — Versão 0.1.0</p>
        </div>
      </footer>
    </main>
  );
}
