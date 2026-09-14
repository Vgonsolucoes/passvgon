# PassVGON - Product Requirements Document

## Overview
- **Summary**: Sistema PassVGON para gestão patrimonial e inventário, mantendo identidade visual da VGON. Aplicação web full-stack com Next.js (App Router), TypeScript, Prisma ORM e PostgreSQL, preparada para implantação no EasyPanel.
- **Purpose**: Fornecer uma plataforma robusta, segura e escalável para gestão de ativos patrimoniais, com autenticação, autorização, auditoria e recursos de inventário via QR Code.
- **Target Users**: Administradores, gestores de patrimônio, auditores e operadores de inventário da VGON e seus clientes.

## Goals
- Estruturar aplicação Next.js + TypeScript pronta para produção
- Implementar infraestrutura de deploy no EasyPanel com Docker multi-stage
- Configurar banco de dados PostgreSQL com Prisma ORM e migrações versionadas
- Garantir segurança: variáveis de ambiente, .gitignore, .env.example, endpoint de saúde
- Disponibilizar scripts administrativos (criação de primeiro admin, migrações)
- Documentar processo de deploy, backup, restauração e atualização
- Manter chaves de criptografia persistentes e seguras

## Non-Goals
- Implementar funcionalidades de negócio específicas (CRUD de ativos, fluxo de inventário completo, QR code) nesta fase inicial
- Configurar integração real com serviços de e-mail, domínio ou EasyPanel (apenas documentar configurações necessárias)
- Criar interface visual completa (apenas estrutura base e páginas essenciais)
- Configurar CI/CD automático entre GitHub e EasyPanel (apenas documentar como conectar)
- Executar deploy real no EasyPanel nesta fase

## Background & Context
- Repositório Git: https://github.com/Vgonsolucoes/passvgon
- Projeto EasyPanel: https://easypanel.vgon.com.br/projects/pass_vgon
- Stack tecnológica preferencial: Next.js App Router + TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL, NextAuth
- Gerenciador de pacotes: npm
- Deploy via Docker no EasyPanel
- Identidade visual VGON deve ser preservada

## Functional Requirements
- **FR-1**: Aplicação inicializa com sucesso em ambiente de desenvolvimento e produção
- **FR-2**: Página inicial pública acessível em `/`
- **FR-3**: Endpoint de saúde acessível em `/api/health` retornando status 200
- **FR-4**: Página de login acessível em `/login` com estrutura para autenticação
- **FR-5**: Painel administrativo protegido em `/dashboard`
- **FR-6**: Script CLI para criação segura do primeiro usuário administrador
- **FR-7**: Sistema de migrações de banco de dados via Prisma Migrate
- **FR-8**: Roteamento de API base estruturado para futuros endpoints

## Non-Functional Requirements
- **NFR-1**: Aplicação executa sem privilégios de root no contêiner Docker
- **NFR-2**: Dockerfile em múltiplas etapas (dependencies -> build -> runtime)
- **NFR-3**: Build de produção otimizado e leve (~200MB ou menos)
- **NFR-4**: Porta da aplicação configurável via variável de ambiente `PORT` (padrão 3000)
- **NFR-5**: Endpoint de saúde não expõe dados internos ou credenciais
- **NFR-6**: .gitignore exclui .env, node_modules, .next, uploads, backups e arquivos sensíveis
- **NFR-7**: .env.example documenta todas as variáveis obrigatórias com valores fictícios
- **NFR-8**: Todas as chaves e segredos carregados via variáveis de ambiente, nunca hardcoded
- **NFR-9**: Logs estruturados em stdout/stderr para captura pelo EasyPanel
- **NFR-10**: Configuração de CORS para ambientes de produção
- **NFR-11**: TypeScript com `strict: true` habilitado
- **NFR-12**: ESLint e Prettier configurados para qualidade de código

## Constraints
- **Technical**:
  - Node.js LTS (20.x ou 22.x)
  - Next.js 14/15 com App Router
  - Prisma ORM com PostgreSQL
  - Deploy via Docker no EasyPanel
  - Sem uso de Supabase CLI
  - Windows puro (sem Scoop/Chocolatey)
- **Business**:
  - Preservar identidade visual VGON
  - Nunca incluir dados reais de clientes no repositório
  - Chaves de criptografia NÃO podem ser geradas automaticamente a cada restart
  - Backups devem ser criptografados e fora do contêiner
- **Dependencies**:
  - PostgreSQL (EasyPanel serviço interno, rede privada)
  - Armazenamento persistente (volume EasyPanel para banco e anexos)
  - Serviço de envio de e-mails (a configurar externamente)
  - Domínio público e certificado HTTPS (a configurar no EasyPanel)

## Assumptions
- O usuário finalizará a conexão do repositório GitHub com o EasyPanel usando credenciais de menor privilégio (Personal Access Token com escopo `repo:read`)
- O PostgreSQL será provisionado como serviço separado no EasyPanel, não no mesmo contêiner da aplicação
- Domínio e HTTPS serão configurados manualmente no painel do EasyPanel
- Serviço de e-mail (SMTP) será configurado via variáveis de ambiente, não há provider padrão definido
- Mockup e identidade visual serão aplicados em iterações seguintes de UI/UX

## Acceptance Criteria

### AC-1: Estrutura do projeto inicializa corretamente
- **Type**: `rule`
- **Given**: Repositório clonado, Node.js LTS instalado, npm disponível
- **When**: Executar `npm install && npm run dev`
- **Then**: Aplicação inicia sem erros, acessível em `http://localhost:3000`
- **Pass Condition**: Nenhum erro de compilação ou runtime; página inicial carrega
- **Evidence**: Saída do terminal confirmando inicialização + screenshot da página inicial

### AC-2: Dockerfile multi-stage válido
- **Type**: `rule`
- **Given**: Docker instalado
- **When**: Executar `docker build -t passvgon:test .`
- **Then**: Build conclui com sucesso, gera imagem final baseada em usuário não-root
- **Pass Condition**: `docker inspect` confirma User != root; build exit code 0
- **Evidence**: Log de build + resultado do `docker inspect`

### AC-3: Endpoint de saúde seguro
- **Type**: `rule`
- **Given**: Aplicação rodando
- **When**: Fazer GET `/api/health`
- **Then**: Retorna 200 com JSON `{ status: "ok", timestamp: ISO-8601 }` (sem dados internos)
- **Pass Condition**: Response status = 200; body não contém chaves, credenciais, stack traces ou version details além do necessário
- **Evidence**: `curl`/Postman output do endpoint

### AC-4: Variáveis de ambiente documentadas
- **Type**: `rule`
- **Given**: Arquivo `.env.example` presente
- **When**: Verificar conteúdo
- **Then**: Contém todas as variáveis obrigatórias (DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, ENCRYPTION_KEY, etc.) com descrições e valores fictícios
- **Pass Condition**: Todas as variáveis usadas em `prisma/schema.prisma`, `next.config`, e auth estão listadas; nenhum valor real presente
- **Evidence**: Conteúdo de `.env.example`

### AC-5: .gitignore protege dados sensíveis
- **Type**: `rule`
- **Given**: Arquivo `.gitignore` presente
- **When**: Verificar regras
- **Then**: Exclui `.env*` (exceto .env.example), `node_modules/`, `.next/`, `.prisma/`, `uploads/`, `backups/`, `*.log`, credenciais
- **Pass Condition**: `git check-ignore -v .env` retorna regra de match; mesmos para node_modules, .next
- **Evidence**: Saída de `git check-ignore` para cada arquivo/diretório sensível

### AC-6: Script de criação de admin
- **Type**: `rule`
- **Given**: Banco PostgreSQL rodando, DATABASE_URL configurada
- **When**: Executar script `npm run create-admin -- --email=admin@vgon.com.br --password=Senha123!` (ou comando equivalente)
- **Then**: Registro de usuário criado no banco com role ADMIN e senha hasheada
- **Pass Condition**: Query SQL confirma registro; senha NÃO está em texto plano
- **Evidence**: Saída do script + resultado de query no banco

### AC-7: Migrações Prisma aplicáveis
- **Type**: `rule`
- **Given**: Banco vazio, DATABASE_URL configurada
- **When**: Executar `npx prisma migrate deploy`
- **Then**: Todas as migrações pendentes são aplicadas sem erro; tabelas essenciais (User, Session, etc. de NextAuth + tabelas base) existem
- **Pass Condition**: `prisma migrate status` = todas aplicadas; `\dt` no PostgreSQL lista tabelas
- **Evidence**: Saída dos comandos

### AC-8: Qualidade da arquitetura e documentação
- **Type**: `rubric`
- **Dimension**: Completude e clareza da estrutura, configurações e documentação de deploy
- **Scale**: 1-5
- **Anchors**: 1 = estrutura incompleta, falta arquivos essenciais; 3 = estrutura funcional mas faltam documentações de backup/rollback; 5 = tudo completo, organizado, pronto para deploy em produção sem lacunas
- **Pass Threshold**: >= 4
- **Evidence**: Checklist de todos os entregáveis (Dockerfile, .env.example, docs de deploy, rollback, backup, restore, migration, admin setup)

### AC-9: Segurança e boas práticas de produção
- **Type**: `rubric`
- **Dimension**: Conformidade com requisitos de segurança (não-root, cripto keys persistentes, segredos em env, health seguro, backups fora do container)
- **Scale**: 1-5
- **Anchors**: 1 = falhas críticas (hardcoded secrets, root user, etc.); 3 = básico ok, faltam algumas recomendações; 5 = excelência, todos os NFRs atendidos
- **Pass Threshold**: >= 4
- **Evidence**: Revisão estática do Dockerfile, variáveis, health endpoint, e documentação de backup/keys

## Open Questions
- [ ] Confirmar versão exata do Next.js (14 ou 15)? (Assumiremos Next.js 14 LTS por estabilidade)
- [ ] Confirmar uso de NextAuth vs. JWT Bearer puro para auth web? (Assumiremos NextAuth por ser padrão do stack)
- [ ] Há tabelas de domínio específicas já conhecidas além do User/Admin? (Assumiremos apenas tabelas de auth e estrutura mínima nesta fase)
- [ ] O script de criação de admin deve ser via CLI standalone ou endpoint protegido temporário? (Assumiremos CLI via npm script)
