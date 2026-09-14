# Deploy no EasyPanel

Este documento descreve o passo a passo completo para implantação do sistema PassVGON no projeto `pass_vgon` disponível em **https://easypanel.vgon.com.br/projects/pass_vgon**.

## 1) Pré-requisitos

Antes de iniciar, certifique-se de que possui:

- Repositório GitHub contendo o código-fonte do PassVGON (público ou privado).
- Serviço **PostgreSQL** provisionado no EasyPanel (recomenda-se usar o template oficial do EasyPanel para PostgreSQL).
- Domínio (ou subdomínio) de sua titularidade, com acesso ao painel de DNS para configuração de registros.
- Permissões de administrador no EasyPanel e no repositório GitHub.

## 2) Conectar repositório GitHub

Para que o EasyPanel possa realizar o build a partir do código-fonte, é necessário conectar o repositório GitHub utilizando um **Personal Access Token (PAT)** com privilégios mínimos.

### 2.1 Gerar PAT no GitHub

1. Acesse **GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)**.
2. Clique em **Generate new token (classic)**.
3. Preencha os campos:
   - **Note:** `EasyPanel PassVGON - Leitura Repo`
   - **Expiration:** Escolha uma data de expiração (recomenda-se 90 dias) ou `No expiration` apenas se houver política de rotação manual.
   - **Select scopes:**
     - Se o repositório for **privado**: marque apenas `repo` (concede leitura e gravação, mas o EasyPanel apenas lê).
     - Se o repositório for **público**: é possível usar escopo ainda mais restrito; no entanto, na prática o EasyPanel costuma exigir `repo` ou `public_repo`. Consulte a documentação atual do EasyPanel para confirmar.
4. Clique em **Generate token** e **copie o token gerado imediatamente** — ele só é exibido uma vez.

### 2.2 Colar PAT no EasyPanel

1. Acesse https://easypanel.vgon.com.br/projects/pass_vgon.
2. No menu lateral ou em **Integrations**, procure a opção **GitHub** ou **Source Providers**.
3. Clique em **Connect GitHub** ou **Add Personal Access Token**.
4. Cole o PAT gerado no GitHub e confirme.
5. O repositório do PassVGON deve aparecer na lista de repositórios disponíveis.

## 3) Criar serviço App "passvgon-web"

1. Dentro do projeto `pass_vgon`, clique em **New Service** e escolha **App** (aplicação construída a partir de código-fonte).
2. Preencha as informações básicas:
   - **Service name:** `passvgon-web`
   - **Source:** Build from source
   - **Repository:** Selecione o repositório do PassVGON conectado no passo 2.
   - **Branch:** `main` (ou a branch padrão de produção)
3. Avance para as configurações de build:
   - **Builder:** Dockerfile
   - **Dockerfile path:** `./Dockerfile`
   - **Port:** `3000`
4. Confirme a criação do serviço.

## 4) Variáveis de ambiente

1. No serviço `passvgon-web`, navegue até a aba **Environment**.
2. Adicione cada variável de ambiente conforme descrito em [01-infraestrutura.md](./01-infraestrutura.md).
3. Para agilizar, você pode colar o conteúdo no formato `KEY=VALUE` diretamente no campo multi-linha (se o EasyPanel suportar importação em lote).
4. Atenção especial:
   - `DATABASE_URL` e `DIRECT_URL` devem usar o **hostname interno** do serviço PostgreSQL do EasyPanel (ex.: `pg-passvgon.service.consul` ou similar, disponível na página do serviço de DB).
   - `NEXTAUTH_URL` deve ser preenchido com o domínio final já com `https://`.
   - `ENCRYPTION_KEY` deve ser copiada do cofre de segredos — **não gere uma nova automaticamente**.
5. Salve as variáveis.

## 5) Volumes persistentes

A aplicação necessita de dois volumes persistentes para armazenar uploads e backups. O PostgreSQL já possui seu próprio volume no serviço de banco de dados separado.

### Criar volume de uploads

1. Aba **Volumes** do serviço `passvgon-web` → **Add Volume**.
2. Preencha:
   - **Name:** `passvgon-uploads`
   - **Mount path:** `/app/uploads`
3. Salve.

### Criar volume de backups

1. Novamente **Add Volume**.
2. Preencha:
   - **Name:** `passvgon-backups`
   - **Mount path:** `/app/backups`
3. Salve.

> **Observação:** O serviço PostgreSQL criado separadamente já provisiona automaticamente um volume para os dados do banco (`/var/lib/postgresql/data`). Não é necessário criar volumes adicionais no serviço `passvgon-web` para o banco.

## 6) Domínio + HTTPS

1. No serviço `passvgon-web`, navegue até a aba **Domains**.
2. Clique em **Add Domain**.
3. Preencha:
   - **Domain:** `pass.vgon.com.br` (substitua pelo seu domínio real)
   - Marque a opção **HTTPS (Let's Encrypt)** para habilitar certificado SSL automático e gratuito.
   - Marque **HTTP → HTTPS Redirect** para redirecionar todo tráfego não criptografado para HTTPS.
4. Salve.
5. O EasyPanel exibirá os registros DNS necessários (geralmente um registro `A` apontando para o IP do servidor ou um `CNAME`). Configure esses registros em seu provedor de DNS.
6. Aguarde a propagação DNS e a emissão do certificado Let's Encrypt.

## 7) Health Check

O `Dockerfile` da aplicação já possui um `HEALTHCHECK` configurado utilizando o endpoint `/api/health`:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

Se necessário customizar as verificações de saúde diretamente no EasyPanel (na aba **Health Checks**), utilize os mesmos parâmetros:

- **Type:** HTTP
- **Path:** `/api/health`
- **Port:** `3000`
- **Interval:** 30s
- **Timeout:** 10s
- **Start period:** 60s
- **Retries:** 5

## 8) Primeiro deploy

1. Na aba principal do serviço `passvgon-web`, clique em **Deploy** ou **Trigger Deploy**.
2. Acompanhe o progresso na aba **Deployments** / **Logs**.
3. Verifique se o build concluiu com sucesso e o container entrou em estado **Running** / **Healthy**.
4. Qualquer falha durante o build ou inicialização estará visível nos logs do container e do build.

## 9) Pós-deploy — Criar usuário administrador

Após o primeiro deploy bem-sucedido, é necessário criar o primeiro usuário administrador.

### Método 1 — Aba Command do EasyPanel

1. No serviço `passvgon-web`, acesse a aba **Command** ou **Run Command**.
2. Execute o comando abaixo, substituindo os valores pelos dados reais do administrador:

```bash
npm run create-admin -- --email=admin@vgon.com.br --name="Admin VGON" --password="Senha123!"
```

> **Recomendação:** Gere uma senha forte e aleatória para o administrador (ex.: `openssl rand -base64 18`). Anote-a em um gerenciador de senhas seguro.

### Método 2 — Exec via terminal do container

1. No serviço `passvgon-web`, clique em **Exec** ou **Terminal** para abrir um shell interativo dentro do container.
2. Execute:

```bash
npm run create-admin -- --email=admin@vgon.com.br --name="Admin VGON" --password="Senha123!"
```

3. Confirme a mensagem de sucesso e feche o terminal.
4. Acesse `https://pass.vgon.com.br/login` e efetue login com as credenciais criadas.

## Recursos de rede e isolamento

- **PostgreSQL em rede privada:** No serviço PostgreSQL do EasyPanel, certifique-se de que a opção **Public / Expose to internet** esteja **DESLIGADA** (OFF). Isso faz com que o banco só seja acessível via DNS interno dentro da rede privada do EasyPanel.
- **Aplicação acessa DB via internal DNS:** Utilize sempre o hostname interno do PostgreSQL (disponível na página do serviço DB) em `DATABASE_URL` e `DIRECT_URL`. Nunca use IP público ou hostname público para comunicação entre aplicação e banco.
- **Firewall:** Se o EasyPanel oferecer funcionalidades de firewall ou Network Policies, restrinja o tráfego de entrada no PostgreSQL para apenas o serviço `passvgon-web`.
