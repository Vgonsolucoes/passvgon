import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-700 to-sky-500 flex items-center justify-center text-white font-bold">
              VG
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                PassVGON
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Painel Administrativo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Visão geral
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Bem-vindo(a) ao PassVGON. Estrutura inicial do painel administrativo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              k: "Ativos cadastrados",
              v: "0",
              delta: "+0 este mês",
              color: "from-blue-600 to-blue-500"
            },
            {
              k: "Em inventário",
              v: "0",
              delta: "0 processados",
              color: "from-amber-600 to-amber-500"
            },
            {
              k: "Usuários ativos",
              v: "0",
              delta: "+0 este mês",
              color: "from-emerald-600 to-emerald-500"
            },
            {
              k: "Auditorias",
              v: "0",
              delta: "0 concluídas",
              color: "from-purple-600 to-purple-500"
            }
          ].map((s) => (
            <div
              key={s.k}
              className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium mb-2">
                {s.k}
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                {s.v}
              </p>
              <span
                className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gradient-to-r ${s.color} bg-clip-text text-transparent bg-opacity-10 ring-1 ring-current`}
              >
                {s.delta}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Recursos disponíveis
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Estrutura inicial
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "Ativos Patrimoniais", desc: "Cadastro e gestão de ativos" },
                { name: "Inventários", desc: "Ciclos e coletas por QR Code" },
                { name: "Usuários", desc: "Gestão de acessos e permissões" },
                { name: "Auditoria", desc: "Trilha e registros de operações" },
                { name: "Relatórios", desc: "Análises e exportações" },
                { name: "Configurações", desc: "Ajustes do sistema" }
              ].map((m) => (
                <div
                  key={m.name}
                  className="p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-900 transition-colors"
                >
                  <p className="font-medium text-sm text-slate-900 dark:text-white mb-1">
                    {m.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {m.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">
              Atalhos rápidos
            </h2>
            <div className="space-y-2">
              <Link
                href="#"
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <span>→ Cadastrar novo ativo</span>
              </Link>
              <Link
                href="#"
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <span>→ Iniciar novo inventário</span>
              </Link>
              <Link
                href="#"
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <span>→ Gerar relatório</span>
              </Link>
              <Link
                href="#"
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <span>→ Gerenciar usuários</span>
              </Link>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                Próximos passos
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                Configure o banco de dados e crie o primeiro administrador com{" "}
                <code className="bg-white/60 dark:bg-blue-900/60 px-1.5 py-0.5 rounded text-[11px]">
                  npm run create-admin
                </code>
                .
              </p>
            </div>
          </div>
        </div>

        <p className="mt-12 text-center text-xs text-slate-400 dark:text-slate-500">
          PassVGON Painel — Versão 0.1.0 • Construído com Next.js &amp; Prisma
        </p>
      </div>
    </main>
  );
}
