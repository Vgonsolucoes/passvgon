# PassVGON - Implementation Plan

## Task 1: Inicializar projeto Next.js + TypeScript (App Router)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Criar scaffold de projeto Next.js 14 (LTS) com App Router, TypeScript strict, Tailwind CSS, ESLint
  - Configurar package.json com scripts: dev, build, start, lint, typecheck
  - Configurar tsconfig.json com strict mode
  - Configurar next.config.js/mjs
  - Criar página inicial `/app/page.tsx` (identidade visual VGON - placeholder clean)
  - Criar página `/app/login/page.tsx` (estrutura base de login)
  - Criar página `/app/dashboard/page.tsx` (estrutura base do painel admin)
  - Configurar layout raiz com metadata básica
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `rule` TR-1.1: `npm install` executa sem erros; `npm run dev` inicia em localhost:3000; página `/` retorna 200
  - `rule` TR-1.2: `npx tsc --noEmit` não reporta erros TypeScript
  - `rule` TR-1.3: `npm run lint` não reporta erros bloqueantes
  - `rubric` TR-1.4: Organização das pastas (app/, lib/, scripts/, prisma/, public/); scale 1-5; anchors 1=bagunçado 3=aceitável 5=padrão Next.js exemplar; threshold >=4; evidence: tree -L 3
- **Notes**: Usar `npx create-next-app@14 --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" .`

## Task 2: Configurar Prisma ORM + schema inicial + migrations
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Instalar dependências: prisma (dev) + @prisma/client
  - Inicializar prisma/schema.prisma com provider "postgresql"
  - Definir models essenciais: User, Account, Session, VerificationToken (padrão NextAuth) + campos auditáveis (createdAt, updatedAt)
  - User deve ter: id, email (único), name, passwordHash, role (ADMIN/USER/OPERADOR), status (ATIVO/INATIVO), 2FA fields opcionais
  - Criar migration inicial: `0001_init`
  - Configurar @/lib/prisma.ts (singleton client)
  - Adicionar scripts npm: `prisma:generate`, `prisma:migrate:dev`, `prisma:migrate:deploy`, `prisma:studio`
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `rule` TR-2.1: `npx prisma generate` executa sem erros, gera client
  - `rule` TR-2.2: Schema valida com `npx prisma validate`
  - `rule` TR-2.3: Migration SQL gerado em prisma/migrations/ contém tabelas esperadas
  - `rubric` TR-2.4: Qualidade do schema (índices, constraints, tipos adequados); scale 1-5; threshold >=4; evidence: schema.prisma conteúdo
- **Notes**: Migration será aplicada em runtime apenas durante deploy; não rodar migrate deploy em desenvolvimento nesta task

## Task 3: Configurar NextAuth (estrutura base)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Instalar next-auth@beta (v5) + @auth/prisma-adapter + bcryptjs
  - Criar @/auth.ts (NextAuth config) com Credentials provider (email/senha)
  - Criar rota `/app/api/auth/[...nextauth]/route.ts`
  - Configurar middleware.ts para proteger `/dashboard` e rotas `/api/*` (exceto /api/health e /api/auth)
  - Implementar lógica de senha hasheada com bcryptjs (cost 12)
  - Implementar login page funcional (UI básica)
- **Acceptance Criteria Addressed**: AC-1 (parcial - auth funcional)
- **Test Requirements**:
  - `rule` TR-3.1: Middleware bloqueia acesso não-autenticado a /dashboard (302 para /login)
  - `rule` TR-3.2: Middleware permite acesso a / e /api/health sem autenticação
  - `rule` TR-3.3: `npm run build` não erros de compilação com NextAuth
  - `rubric` TR-3.4: Segurança do auth (bcrypt, session config, cookies secure, etc.); scale 1-5; threshold >=4; evidence: auth.ts + middleware.ts

## Task 4: Criar .gitignore e .env.example
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Criar .gitignore baseado em Next.js + Prisma best practices
  - Regras: node_modules, .next/, .env*, !.env.example, .prisma, uploads/, backups/, *.log, .DS_Store, coverage/, dist/, *.local, .vscode/, *.swp, *.swo, ~, .expo/, eas.json (para futuro), .env.local.*
  - Criar .env.example com: DATABASE_URL, DIRECT_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, ENCRYPTION_KEY, PORT, SMTP_*, APP_ENV, etc. (tudo com comentário explicativo
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `rule` TR-4.1: `git check-ignore -v .env` retorna match (arquivo sensível ignorado
  - `rule` TR-4.2: .env.example lista >= 10 variáveis com descrições e valores fictícios
  - `rule` TR-4.3: `.env.example` NÃO está no .gitignore

## Task 5: Implementar endpoint /api/health
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - Criar `/app/api/health/route.ts`
  - Método GET retorna { status: "ok", timestamp: new Date().toISOString() }
  - Exclui autenticação neste endpoint
  - Status sempre 200 (mesmo se DB off? Não: se DB off retornar 503 com { status: "degraded" })
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `rule` TR-5.1: GET /api/health retorna status 200 + JSON esperado quando app saudável
  - `rule` TR-5.2: Response body NÃO contém DATABASE_URL, chaves ou dados sensíveis (buscar por padrão de chave no output)
  - `rule` TR-5.3: Acessível sem autenticação (200 mesmo sem cookie de sessão)

## Task 6: Script de criação de primeiro administrador
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 2
- **Description**:
  - Criar `scripts/create-admin.ts` (TypeScript)
  - CLI args: --email, --name, --password
  - Usa prisma client + bcrypt para criar User com role=ADMIN
  - Idempotente: se email já existe, avisa e não recria
  - Adicionar em package.json: `"create-admin": "tsx scripts/create-admin.ts"`
  - Instalar tsx como dev dep
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `rule` TR-6.1: Script aceita args e roda sem erro quando DB disponível
  - `rule` TR-6.2: Registro criado tem role ADMIN e passwordHash é hash bcrypt válido (não texto plano)
  - `rule` TR-6.3: Rodar 2x com mesmo email não duplica registro
  - `rubric` TR-6.4: UX do CLI (mensagens claras, help, erros tratados); scale 1-5; threshold >=4

## Task 7: Dockerfile multi-stage + .dockerignore
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1-6
- **Description**:
  - Dockerfile:
    - Stage 1: deps (node:20-alpine, install prod + dev deps)
    - Stage 2: build (gera Prisma client, gera Next.js build standalone)
    - Stage 3: runner (node:20-alpine, usuário node não-root, PORT 3000, cmd start, healthcheck curl /api/health)
    - Não rodar migrações em build; apenas em runtime (entrypoint script?)
    - Criar entrypoint.sh que: 1) `npx prisma migrate deploy` 2) `node server.js`
    - Permitir pular migrate via env SKIP_MIGRATIONS=true
  - .dockerignore: excluir tudo que não precisa (node_modules separado, .git, env, etc.)
- **Acceptance Criteria Addressed**: AC-2, AC-8, AC-9
- **Test Requirements**:
  - `rule` TR-7.1: `docker build -t passvgon-test .` exit code 0
  - `rule` TR-7.2: `docker inspect passvgon-test | grep User` retorna usuário não-root (uid != 0
  - `rule` TR-7.3: `docker run -p 3000:3000 passvgon-test` inicia e /api/health retorna 200 (com DB mock ou degrade)
  - `rubric` TR-7.4: Tamanho final da imagem <= 300MB; scale 1-5; threshold >=4 (5 = <=200MB)
  - `rubric` TR-7.5: Clareza e boas práticas Docker; scale 1-5; threshold >=4

## Task 8: Documentação de implantação e operações
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Todas as tasks acima
- **Description**:
  - Criar pasta `docs/deploy/`:
    - `01-infraestrutura.md`: variáveis de ambiente obrigatórias + finalidade
    - `02-easypanel.md`: passo a passo no EasyPanel (criar serviço, conectar GitHub PAT, var.env, volumes, domínio HTTPS, healthcheck)
    - `03-backup-restore.md`: procedimentos de backup (pg_dump criptografado + restore) e onde armazenar
    - `04-update-rollback.md`: fluxo completo de atualização (dev, test, commit, migrate, deploy, verificações pós deploy; rollback com compatibilidade DB)
    - `05-comandos.md`: npm run create-admin, migrate, lint, etc.
  - Atualizar `.trae/specs apenas se houver lacunas
- **Acceptance Criteria Addressed**: AC-8, AC-9
- **Test Requirements**:
  - `rule` TR-8.1: Documento lista todas as variáveis obrigatórias de .env.example com finalidade
  - `rule` TR-8.2: Passo a passo do EasyPanel cobre: criar app, conectar repo (PAT de menor privilégio), var env, volume para uploads, domínio + HTTPS, healthcheck
  - `rule` TR-8.3: Documento de backup cobre: pg_dump, criptografia (openssl ou gpg, localização fora do container, restore validado
  - `rule` TR-8.4: Update cobre: migrações controladas (prisma migrate deploy, nunca db push em prod) + estratégia compatibilidade; rollback menciona forward-only do Prisma + estratégia
  - `rubric` TR-8.5: Clareza e completude geral da doc; scale 1-5; threshold >=4

## Task 9: Inicializar repositório Git e validar
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 4-8
- **Description**:
  - `git init` no diretório
  - Verificar .gitignore funcionando
  - Criar commit inicial "chore: initial project scaffolding"
  - Adicionar remote origin apontando para https://github.com/Vgonsolucoes/passvgon (verificar com usuário antes de push)
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `rule` TR-9.1: `git status` não lista apenas arquivos que devem entrar (nenhum .env, node_modules etc.)
  - `rule` TR-9.2: .env.example está tracked
  - `rule` TR-9.3: Primeiro commit historico limpo
