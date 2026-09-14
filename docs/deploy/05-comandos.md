# Referência Rápida de Comandos

Este documento agrupa os comandos mais utilizados no desenvolvimento local, no gerenciamento do banco de dados, na administração do sistema e na verificação de sanidade da aplicação PassVGON.

---

## Desenvolvimento local

### Instalar dependências

```bash
npm install
```

Instala todas as dependências declaradas em `package.json`, tanto de produção quanto de desenvolvimento. Recomendado rodar sempre após um `git pull` que modifique `package.json` ou `package-lock.json`.

### Iniciar servidor de desenvolvimento

```bash
npm run dev
```

Inicia o Next.js em modo de desenvolvimento com **Hot Module Replacement (HMR)** ativado. Qualquer alteração no código-fonte é refletida imediatamente no navegador, sem necessidade de restart manual. O servidor estará disponível em `http://localhost:3000` por padrão.

### Gerar build de produção

```bash
npm run build
```

Executa o build otimizado para produção. O Next.js compila páginas, gera bundles minificados, otimiza assets e prepara o diretório `.next/`. Este é o mesmo comando executado pelo `Dockerfile` durante o build da imagem.

### Rodar build de produção localmente

```bash
npm run start
```

Inicia o servidor Next.js utilizando os artefatos gerados por `npm run build`. Útil para validar localmente que a build de produção se comporta como esperado, antes de enviar para deploy. Requer que `npm run build` tenha sido executado previamente.

### Executar lint (ESLint)

```bash
npm run lint
```

Executa o ESLint (com a configuração do Next.js) em todo o projeto, reportando problemas de estilo, anti-padrões e potenciais bugs de acordo com as regras definidas em `.eslintrc.json`. Sempre rode e corrija os avisos antes de abrir um PR.

### Verificar tipagem TypeScript

```bash
npm run typecheck
```

Executa o compilador TypeScript (`tsc --noEmit`) sem emitir arquivos JavaScript, apenas validando estaticamente as tipagens de todo o projeto. Erros de tipo **devem ser resolvidos antes de qualquer merge em `main`**.

---

## Banco de dados & Prisma

### Gerar Prisma Client

```bash
npm run prisma:generate
```

Gera (ou re-gera) o cliente TypeScript do Prisma com base no schema em `prisma/schema.prisma`. É necessário rodar sempre que o `schema.prisma` for alterado (novos modelos, campos, enums, etc.). O `Dockerfile` já executa este passo automaticamente durante o build.

### Criar migration de desenvolvimento

```bash
npm run prisma:migrate:dev -- --name descricao-da-migration
```

Compara o estado atual de `prisma/schema.prisma` com o histórico de migrations, gera um novo arquivo SQL de migration em `prisma/migrations/` e a aplica imediatamente no banco configurado em `DATABASE_URL`. Use apenas em ambientes de desenvolvimento ou staging, **nunca em produção**.

Substitua `descricao-da-migration` por um nome claro e descritivo, em `snake_case`, por exemplo: `adiciona_campo_cpf_usuario`, `cria_tabela_patrimonio`.

### Aplicar migrations em produção

```bash
npm run prisma:migrate:deploy
```

Aplica todas as migrations pendentes (presentes em `prisma/migrations/` mas ainda não executadas no banco destino). Este é o comando seguro para ambientes de produção. Diferente do `migrate dev`, ele não altera o schema prismi nem gera novas migrations — apenas executa o que já foi versionado.

### Verificar status das migrations

```bash
npm run prisma:migrate:status
```

Lista todas as migrations encontradas no diretório `prisma/migrations/` e informa, para cada uma, se já foi aplicada no banco configurado, ou se está pendente. Útil para validar o estado do banco antes de deploy e após restore de backup.

### Abrir Prisma Studio (GUI do banco)

```bash
npm run prisma:studio
```

Inicia o Prisma Studio, uma interface web gráfica para consultar, inserir, editar e excluir dados diretamente do banco. Abre por padrão em `http://localhost:5555`. Utilize apenas em desenvolvimento ou com extremo cuidado em staging/produção (pois permite alterações diretas nos dados).

---

## Administração do sistema

### Criar usuário administrador

```bash
npm run create-admin -- --email=admin@vgon.com.br --name="Nome do Administrador" --password="Senha123!"
```

Executa o script em `scripts/create-admin.ts` que cria um novo usuário com papel de **administrador** diretamente no banco. Deve ser utilizado após o primeiro deploy (conforme documentado em [02-easypanel.md](./02-easypanel.md)) e sempre que for necessário provisionar novos admins por linha de comando.

Parâmetros:

| Parâmetro | Obrigatório | Descrição |
|---|---|---|
| `--email` | SIM | E-mail único que será utilizado para login. |
| `--name` | SIM | Nome de exibição do usuário. |
| `--password` | SIM | Senha inicial do usuário. Deve atender aos requisitos mínimos de força definidos na aplicação. |

> **Recomendação:** Sempre gere senhas fortes e aleatórias. Exemplo em Linux/macOS: `openssl rand -base64 18`.

---

## Docker local (se quiser testar antes de deploy)

### Construir imagem local

```bash
docker build -t passvgon:local .
```

Constrói a imagem Docker da aplicação utilizando o `Dockerfile` presente na raiz do projeto, taggeando-a como `passvgon:local`. Útil para reproduzir localmente o comportamento exato do deploy em produção (incluindo entrypoint, migrations automáticas e health check).

### Rodar container localmente

```bash
docker run --rm --env-file .env -p 3000:3000 passvgon:local
```

Inicia um container temporário (`--rm`) da imagem recém-construída:
- Lê as variáveis de ambiente do arquivo `.env` local via `--env-file`.
- Mapeia a porta `3000` do host para a porta `3000` do container.

**Importante:** Antes de rodar, certifique-se de que:
1. O `.env` contém um `DATABASE_URL` acessível a partir do container (localhost dentro do container é ele mesmo, não o host; use `host.docker.internal` no Windows/macOS ou IP real da máquina).
2. O volume de uploads não é necessário para testes rápidos, mas se quiser persistência adicione `-v $(pwd)/uploads:/app/uploads -v $(pwd)/backups:/app/backups`.

---

## Verificações rápidas

### Verificar health check da aplicação

```bash
curl http://localhost:3000/api/health
```

Requisição HTTP `GET` no endpoint de saúde. Espera-se como resposta um JSON com status `ok`:

```json
{"status":"ok","timestamp":"2026-09-14T12:00:00.000Z"}
```

Em produção substitua `http://localhost:3000` pela URL real com HTTPS.

### Testar interface de login

Abra no navegador:

```
http://localhost:3000/login
```

Ou, em produção:

```
https://pass.vgon.com.br/login
```

Valide que:
- A página carrega sem erros visuais (CSS, fontes, layout).
- Não há erros JavaScript no console do navegador.
- Tentativa de login com credenciais inválidas retorna mensagem de erro apropriada.
- Login com credenciais válidas direciona para o dashboard.
