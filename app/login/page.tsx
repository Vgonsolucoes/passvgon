import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-sky-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            VG
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              PassVGON
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gestão Patrimonial &amp; Inventário
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Entrar na conta
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Informe suas credenciais para acessar o painel administrativo.
            </p>

            <form className="space-y-4" action="/api/auth/callback/credentials" method="POST">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="admin@vgon.com.br"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Senha
                  </label>
                  <a
                    href="#"
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Esqueci a senha
                  </a>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Lembrar-me
                </label>
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium transition-colors shadow-lg shadow-blue-700/20"
              >
                Entrar
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ← Voltar para início
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
          Ao acessar, você concorda com os termos de uso e política de privacidade da VGON.
        </p>
      </div>
    </main>
  );
}
