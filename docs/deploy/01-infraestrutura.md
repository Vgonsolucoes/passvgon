# Infraestrutura e Variáveis de Ambiente

Este documento descreve todas as variáveis de ambiente necessárias para o funcionamento do sistema PassVGON, além de orientações sobre geração de segredos e boas práticas de segurança.

## Variáveis de Ambiente

A tabela a seguir lista todas as variáveis de ambiente, sua obrigatoriedade, finalidade e exemplo de uso.

| Variável | Obrigatoriedade | Descrição | Exemplo |
|---|---|---|---|
| `DATABASE_URL` | SIM | URL de conexão com o banco de dados PostgreSQL. Usada pela aplicação e pelo Prisma Client. Formato: `postgresql://usuario:senha@host:5432/nome_banco?schema=public` | `postgresql://passvgon_user:S3nh4F0rte@pg-vgon.internal:5432/pass_vgon?schema=public` |
| `DIRECT_URL` | SIM | URL direta de conexão com o banco de dados, usada por Prisma Migrate e Prisma Studio em ambientes com poolers de conexão. Geralmente igual ao `DATABASE_URL` quando não há pooler. | `postgresql://passvgon_user:S3nh4F0rte@pg-vgon.internal:5432/pass_vgon?schema=public` |
| `NEXTAUTH_URL` | SIM | URL base completa da aplicação usada pelo NextAuth para redirecionamentos, callbacks de autenticação e geração de links. Em produção, deve corresponder ao domínio público com HTTPS. | `https://pass.vgon.com.br` |
| `NEXTAUTH_SECRET` | SIM | Chave secreta usada pelo NextAuth para assinar, criptografar e validar tokens de sessão, cookies de autenticação e CSRF tokens. Deve ter no mínimo 32 caracteres aleatórios. | `a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2` |
| `ENCRYPTION_KEY` | SIM | Chave de criptografia AES-256 usada para criptografar dados sensíveis armazenados no banco de dados. Deve ter no mínimo 32 caracteres aleatórios. **Esta chave é crítica e deve ser persistente — nunca gerá-la automaticamente em deploy.** | `f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5` |
| `PORT` | NÃO | Porta TCP em que o servidor Next.js aceitará conexões. Padrão: `3000`. | `3000` |
| `APP_ENV` | SIM | Identificador do ambiente em execução. Valores aceitos: `development`, `staging`, `production`. Controla comportamentos como logging e mensagens de erro. | `production` |
| `SMTP_HOST` | NÃO | Hostname ou endereço IP do servidor SMTP utilizado para envio de e-mails (recuperação de senha, notificações, etc.). | `smtp.sendgrid.net` |
| `SMTP_PORT` | NÃO | Porta do servidor SMTP. Valores comuns: `587` (STARTTLS), `465` (SSL/TLS implícito), `25` (sem criptografia — não recomendado). | `587` |
| `SMTP_USER` | NÃO | Nome de usuário para autenticação no servidor SMTP. | `apikey` |
| `SMTP_PASS` | NÃO | Senha ou API Key para autenticação no servidor SMTP. | `SG.xxxxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy` |
| `SMTP_FROM` | NÃO | Endereço de e-mail e nome exibidos como remetente nas mensagens enviadas pelo sistema. | `"PassVGON" <noreply@vgon.com.br>` |
| `UPLOAD_DIR` | SIM | Caminho absoluto do diretório no sistema de arquivos onde os arquivos carregados (uploads) pelos usuários serão armazenados. Deve apontar para um volume persistente em produção. | `/app/uploads` |
| `BACKUP_DIR` | SIM | Caminho absoluto do diretório destinado ao armazenamento de arquivos de backup gerados pela aplicação. Deve apontar para um volume persistente. | `/app/backups` |
| `SKIP_MIGRATIONS` | NÃO | Quando definida como `true`, impede que as migrações do Prisma sejam executadas automaticamente no entrypoint do container. Útil para execução manual e controlada de migrações. | `true` |

## Como gerar segredos seguros

### `NEXTAUTH_SECRET`

Para gerar uma chave aleatória segura para o NextAuth, execute o comando abaixo em um terminal com OpenSSL disponível:

```bash
openssl rand -hex 32
```

O resultado será uma string de 64 caracteres hexadecimais (32 bytes), suficiente para atender ao requisito mínimo de 32 caracteres. Esta chave pode ser rotacionada periodicamente, desde que se aceite que todas as sessões ativas serão encerradas.

### `ENCRYPTION_KEY`

A `ENCRYPTION_KEY` também deve ser gerada com comando similar:

```bash
openssl rand -hex 32
```

**ATENÇÃO — CRÍTICO:** A `ENCRYPTION_KEY` **DEVE SER PERSISTENTE**. Nunca gere esta chave automaticamente em scripts de deploy, pipelines CI/CD ou entrypoints de container. Se esta chave for perdida ou alterada, **todos os dados criptografados no banco de dados se tornarão permanentemente inacessíveis e irrecuperáveis**. Armazene-a em um cofre de segredos (Vault, 1Password, AWS Secrets Manager, etc.) e distribua-a manualmente apenas para ambientes autorizados.

## Considerações de segurança

1. **Separação entre `ENCRYPTION_KEY` e banco de dados:** A chave de criptografia **nunca** deve ser armazenada no mesmo servidor, volume ou serviço onde reside o banco de dados PostgreSQL. Idealmente, utilize um gerenciador de segredos dedicado e externo.

2. **Nunca registrar (logar) segredos:** Certifique-se de que nenhuma rotina de logging, middleware de debug ou ferramenta de telemetria capture ou persista os valores de `ENCRYPTION_KEY`, `NEXTAUTH_SECRET`, `DATABASE_URL` (que contém senha), `SMTP_PASS` e demais segredos.

3. **Versionamento separado:** Nenhuma variável sensível deve ser commitada no repositório Git. O arquivo `.env.example` serve apenas como referência de estrutura, sempre com valores vazios. Os valores reais devem ser gerenciados externamente.

4. **Restrição de acesso:** Apenas administradores autorizados devem ter acesso aos valores dos segredos em produção. No EasyPanel, utilize as funcionalidades de gerenciamento de equipe e permissões para restringir visualização e edição de variáveis de ambiente.

5. **HTTPS obrigatório em produção:** O tráfego entre o cliente e a aplicação deve sempre utilizar HTTPS. O `NEXTAUTH_URL` deve usar o esquema `https://` em ambientes `staging` e `production`.

6. **Rotação de segredos:** Defina uma política periódica de rotação para `NEXTAUTH_SECRET` e credenciais SMTP/DB. A `ENCRYPTION_KEY` só deve ser rotacionada em processo planejado de re-criptografia de todos os dados existentes.
