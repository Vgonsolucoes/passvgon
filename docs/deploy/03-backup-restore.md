# Política de Backup e Restauração

Este documento define a política de backup do sistema PassVGON, os tipos de backup existentes, procedimentos passo a passo para backup e restauração, e as boas práticas de retenção e verificação.

## Política de backup

- **Diário automático:** Um backup completo de banco de dados e uploads deve ser executado diariamente, de forma automatizada (via cron do host, ferramenta de backup do EasyPanel, ou serviço externo).
- **Manual antes de deploy/migrações:** Sempre antes de executar deploy com migrações de banco de dados ou qualquer alteração de risco, execute um backup manual completo de todos os componentes.
- **Armazenamento externo:** Os arquivos de backup devem ser copiados para um local externo e independente do servidor de produção (ex.: bucket S3, storage object, disco fora do cluster).

## Tipos de backup

### a) PostgreSQL — `pg_dump` criptografado

Backup lógico do banco de dados utilizando `pg_dump`, no formato custom do PostgreSQL, com posterior criptografia simétrica AES-256 via OpenSSL.

### b) Uploads — `tar.gz` criptografado

Compactação do diretório de uploads (`/app/uploads`) em arquivo `tar.gz`, também criptografado com AES-256.

### c) `ENCRYPTION_KEY` — armazenamento em cofre separado

A chave de criptografia da aplicação **não faz parte dos arquivos de backup** do banco ou uploads. Ela deve ser armazenada exclusivamente em um cofre de segredos (ex.: 1Password, HashiCorp Vault, AWS Secrets Manager), **fora dos containers e fora do banco de dados**. Sem essa chave, os dados restaurados do banco estarão criptografados e inacessíveis.

---

## Passo a passo — Backup PostgreSQL MANUAL

Você pode executar este procedimento de duas formas: diretamente dentro do container do serviço PostgreSQL do EasyPanel (via **Exec**), ou a partir de qualquer máquina que tenha `pg_dump` e acesso ao `DATABASE_URL`.

### Dentro do container PostgreSQL do EasyPanel

1. No EasyPanel, abra o serviço PostgreSQL do projeto.
2. Clique em **Exec** ou **Terminal** para abrir um shell no container.
3. Execute o `pg_dump` substituindo `DATABASE_URL` pela URL completa de conexão:

```bash
pg_dump "postgresql://usuario:senha@localhost:5432/pass_vgon?schema=public" -F c -f /tmp/backup-$(date +%Y%m%d).dump
```

### De uma máquina externa (com `DATABASE_URL`)

```bash
export DATABASE_URL="postgresql://usuario:senha@host-do-db:5432/pass_vgon?schema=public"
pg_dump "$DATABASE_URL" -F c -f backup-$(date +%Y%m%d).dump
```

### Criptografar o arquivo de backup

Após gerar o arquivo `.dump`, criptografe-o com AES-256-CBC utilizando uma **CHAVE_BACKUP** separada (diferente da `ENCRYPTION_KEY` da aplicação e diferente da senha do banco):

```bash
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in backup-20260914.dump \
  -out backup-20260914.dump.enc \
  -pass pass:CHAVE_BACKUP_AQUI
```

> **Importante:** A `CHAVE_BACKUP` também deve ser armazenada em cofre separado, nunca junto com os arquivos de backup.

Após a criptografia, **remova o arquivo `.dump` não criptografado**:

```bash
rm backup-20260914.dump
```

---

## Passo a passo — Restauração PostgreSQL

Sempre execute restaurações primeiro em um ambiente de **staging** para validar integridade antes de tocar produção.

### 1. Descriptografar o arquivo

```bash
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in backup-20260914.dump.enc \
  -out backup-20260914.dump \
  -pass pass:CHAVE_BACKUP_AQUI
```

### 2. Restaurar no banco

Restaure utilizando `pg_restore` com as flags `--no-owner` e `--no-acl` para evitar problemas de permissões quando o usuário do banco destino difere do original:

```bash
export DATABASE_URL_NOVO="postgresql://usuario:senha@host-do-db:5432/pass_vgon_restaurado?schema=public"

pg_restore --no-owner --no-acl -d "$DATABASE_URL_NOVO" backup-20260914.dump
```

> **Nota:** Em caso de restore sobre um banco já existente, certifique-se de que não há conexões ativas ou use as flags apropriadas do `pg_restore` (como `--clean --if-exists`) para sobrescrever objetos. Após a restauração, remova o arquivo `.dump` não criptografado.

---

## Backup do diretório `/app/uploads`

### Compactar e criptografar

```bash
tar -czf uploads-20260914.tar.gz -C /app uploads

openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in uploads-20260914.tar.gz \
  -out uploads-20260914.tar.gz.enc \
  -pass pass:CHAVE_BACKUP_AQUI

rm uploads-20260914.tar.gz
```

### Restauração dos uploads

```bash
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in uploads-20260914.tar.gz.enc \
  -out uploads-20260914.tar.gz \
  -pass pass:CHAVE_BACKUP_AQUI

tar -xzf uploads-20260914.tar.gz -C /app
rm uploads-20260914.tar.gz
```

---

## Rotações e retenção

Aplique a seguinte política de retenção para backups automáticos:

| Tipo | Período | Tempo de retenção |
|---|---|---|
| Diários | Segunda a domingo | 30 dias |
| Semanais | Todo domingo | 12 semanas (~3 meses) |
| Mensais | Todo primeiro dia do mês | 12 meses |

Backups manuais pré-deploy devem ser mantidos por pelo menos 30 dias após o deploy bem-sucedido.

---

## O QUE NÃO FAZER

1. **Não armazene `ENCRYPTION_KEY` junto com o backup do DB.** Os dados do banco estão criptografados com essa chave; se ambos estiverem no mesmo local, a criptografia perde o sentido. E, inversamente, se a chave for perdida, o backup do DB torna-se inútil. Use cofres **separados**.
2. **Não armazene backups apenas no mesmo servidor/cluster.** Se o host ou o EasyPanel sofrer uma falha total, você perderá produção e backups simultaneamente. Sempre envie cópias para storage externo geograficamente independente.
3. **Não use a mesma senha para tudo.** `ENCRYPTION_KEY`, `CHAVE_BACKUP`, senha do PostgreSQL, senha do admin, PAT do GitHub e senha SMTP devem ser todas distintas.
4. **Não pule etapas de restore de teste.** Backups que nunca foram testados são, na prática, inexistentes.
5. **Não envie arquivos `.dump` ou `.tar.gz` não criptografados por e-mail, chat ou repositórios.**

---

## Verificação mensal

Todo mês, em data agendada, execute o seguinte procedimento completo de verificação:

1. Pegue o backup mais recente de **produção** (DB + uploads).
2. Restaure ambos em um ambiente **staging** isolado (nunca em produção).
3. Confira a integridade:
   - `prisma migrate status` no banco restaurado deve reportar todas as migrations aplicadas.
   - Contagem de registros nas tabelas principais deve bater com o esperado.
   - Efetue login com um usuário de teste.
   - Acesse registros que contenham dados criptografados e confira que são exibidos corretamente (valida que a `ENCRYPTION_KEY` está correta).
   - Baixe um arquivo de upload aleatório e valide sua integridade (hash MD5/SHA).
4. Registre o resultado da verificação em um log ou documento de auditoria.
5. Caso qualquer etapa falhe, investigue imediatamente — não espere até precisar de um restore de verdade.
