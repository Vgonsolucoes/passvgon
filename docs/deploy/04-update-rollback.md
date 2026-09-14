# Fluxo de Atualização e Procedimento de Rollback

Este documento define o fluxo completo de atualização (deploy de nova versão) do sistema PassVGON e o procedimento de rollback a ser adotado em caso de incidentes.

---

## FLUXO COMPLETO DE ATUALIZAÇÃO (6 passos)

### Passo 1 — Desenvolver e revisar

Todo código que chega a produção deve passar por:

1. **Branch separado:** Não commite diretamente na branch principal (`main`). Crie branches feature/bugfix específicas.
2. **Pull Request (PR):** Abra um PR no GitHub com descrição clara do que foi alterado, motivação e, se aplicável, screenshots ou evidências de teste.
3. **Code Review:** Pelo menos um outro desenvolvedor deve aprovar o PR antes do merge.
4. **Verificações automáticas:** Certifique-se de que o pipeline CI (se existente) executa lint, typecheck e testes automatizados e tudo passa.
5. **Merge na `main`:** Apenas após aprovações e checks verdes, efetue o merge.

### Passo 2 — Testes e verificações de segurança

Antes de gerar a tag de versão, execute localmente (ou no CI) as seguintes verificações:

```bash
npm run lint
npm run typecheck
npm audit --production
```

Se disponível no ambiente, execute também varredura de vulnerabilidades na imagem Docker:

```bash
trivy image passvgon:local
```

Corrija vulnerabilidades críticas e altas encontradas pelo `npm audit` ou `trivy` antes de prosseguir.

### Passo 3 — Gerar versão a partir de commit ID

Sempre implante versões identificáveis por **tag semântica** (preferencial) ou pelo **hash do commit**. Deployes por branch volátil ("latest da main") não são recomendados em produção por dificultarem rollback e auditoria.

```bash
git checkout main
git pull origin main

# Versionamento semântico: MAJOR.MINOR.PATCH
# MAJOR: quebra de compatibilidade
# MINOR: nova funcionalidade compatível
# PATCH: correção de bug compatível
git tag v1.2.3
git push origin v1.2.3
```

Anote também o hash completo do commit correspondente à tag (disponível via `git rev-parse v1.2.3`). No EasyPanel, use a opção de deploy por **tag** ou **commit hash** em vez de apenas o nome da branch.

### Passo 4 — Executar migrações de forma controlada

#### Regras gerais

- O `docker-entrypoint.sh` já executa `prisma migrate deploy` automaticamente durante a inicialização do container, a menos que `SKIP_MIGRATIONS=true`.
- **Prisma Migrate é FORWARD-ONLY.** Não existem rollbacks automáticos de migrations. Toda migration é aplicada de forma irreversível.
- Por isso, **toda migration deve ser ADITIVA**:
  - Não use `DROP TABLE` ou `DROP COLUMN` diretamente.
  - Não use `ALTER COLUMN` para mudar tipo de dados de forma incompatível (ex.: `TEXT` → `INT`) sem estratégia de migração dual.
  - Se precisar remover uma coluna:
    1. **1ª release:** marque a coluna como `@deprecated` no código, torne-a `nullable` se necessário e garanta que a versão nova e a versão antiga do código funcionem sem ela.
    2. **2ª release (release seguinte, após rollout confirmado):** só então crie uma migration com `DROP COLUMN`.
- **Sempre faça BACKUP FULL antes de rodar `migrate deploy` em produção.** Siga o procedimento em [03-backup-restore.md](./03-backup-restore.md).

#### Execução manual (opcional, via EasyPanel)

Se preferir executar as migrations manualmente antes do deploy da aplicação:

1. No EasyPanel, serviço `passvgon-web`, aba **Command** ou **Exec**, rode:

```bash
SKIP_MIGRATIONS=true npx prisma migrate deploy
```

2. Verifique o status:

```bash
npx prisma migrate status
```

3. Confirme que todas as migrations pendentes foram aplicadas.

Se optar por rodar manualmente, lembre-se de manter `SKIP_MIGRATIONS=true` também nas variáveis de ambiente durante o deploy, para evitar dupla execução.

### Passo 5 — Deploy no EasyPanel

1. Acesse o serviço `passvgon-web` em https://easypanel.vgon.com.br/projects/pass_vgon.
2. Na aba de deploy, selecione **Deploy by tag** ou **Deploy by commit hash**.
3. Informe a tag criada no Passo 3 (ex.: `v1.2.3`) ou o hash do commit.
4. Confirme o deploy e acompanhe os logs na aba **Deployments** ou **Logs**.
5. Aguarde até que o container esteja com status **Running** e **Healthy**.

### Passo 6 — Verificações pós-deploy

Imediatamente após o deploy, execute, no mínimo:

1. **Health check:**
   ```bash
   curl -I https://pass.vgon.com.br/api/health
   ```
   O resultado esperado é `HTTP/2 200`.

2. **Login administrativo:** Acesse `https://pass.vgon.com.br/login`, efetue login com o usuário admin e, se 2FA estiver configurado, complete o segundo fator.

3. **Acesso a registros:** No dashboard, liste os registros existentes e execute um CRUD básico (quando aplicável) para validar que as telas, permissões e banco estão consistentes.

4. **Monitoramento de logs:** Durante os primeiros 15 a 30 minutos após o deploy, monitore os logs do container em tempo real (aba **Logs** do EasyPanel), filtrando por `error`, `exception`, `warn` para capturar falhas tardias.

---

## PROCEDIMENTO DE RETORNO (ROLLBACK)

Acione o rollback imediatamente se, após as verificações pós-deploy ou durante a janela de monitoramento, for detectado:
- Indisponibilidade total ou parcial da aplicação (health check falhando).
- Erros repetidos de autenticação ou 2FA.
- Corrupção de dados ou inconsistência em telas de CRUD.
- Erros de migration que não possam ser resolvidos rapidamente.
- Qualquer incidente de segurança suspeito.

### Rollback de CÓDIGO

O rollback de código é simples no EasyPanel:

1. No serviço `passvgon-web`, navegue até a aba **Deployments**.
2. Localize o deploy anterior, correspondente à tag ou commit que estava rodando de forma estável antes da atualização.
3. Clique em **Redeploy** (ou equivalente).
4. Aguarde o novo container entrar em estado **Healthy**.
5. Refaça as verificações do Passo 6 (health, login, acesso a dados, monitoramento de logs).

### Rollback de BANCO

Como o Prisma Migrate é forward-only, **não existe rollback automático de migrations** e a operação `prisma migrate resolve`/`prisma migrate reset` **nunca deve ser usada em PRODUÇÃO**.

Adote a seguinte estratégia progressiva:

**a) Caso mais comum — migrations aditivas**

Se todas as migrations aplicadas foram aditivas (nenhum `DROP` ou alteração incompatível), **nada precisa ser feito no banco**. O código anterior (rollback no passo acima) continuará funcionando normalmente sobre a estrutura atual, pois nenhuma coluna ou tabela de que ele dependia foi removida. Esta é a principal razão pela qual as migrations devem ser sempre aditivas.

**b) Caso a migration realmente quebrou a estrutura**

Se uma migration introduziu alteração destrutiva e incompatível (ex.: ALTER de tipo que quebra consultas, ou remoção acidental de coluna essencial):

1. Immediatamente acione o rollback de código (item anterior) para parar o tráfego na versão problemática.
2. Restaure o backup completo do PostgreSQL tirado **imediatamente antes** do `migrate deploy`, seguindo o procedimento em [03-backup-restore.md](./03-backup-restore.md).
3. Após restore, execute as verificações do Passo 6.

> ⚠️ **Aviso:** Restaurar backup implica perda de todos os dados gravados entre o momento do backup e o momento do restore. Por isso é crítico: (1) fazer backup imediatamente antes de migrations e (2) usar migrations aditivas para nunca precisar deste passo.

**c) O que NÃO fazer**

- Nunca execute `prisma migrate reset` em produção — ele apaga TODO o banco.
- Não edite manualmente a tabela `_prisma_migrations` a menos que seja instruído por documentação oficial do Prisma para um cenário específico.

### Checklist final de rollback

- [ ] Código da versão anterior redeployado com sucesso.
- [ ] `GET /api/health` retornando 200.
- [ ] Login administrativo e 2FA funcionando.
- [ ] Dados críticos acessíveis e íntegros (ex.: listagem de registros).
- [ ] Se restore de banco foi necessário: dados do momento do backup estão recuperados.
- [ ] Logs sem erros repetidos por 10 minutos contínuos.

### Comunicado pós-rollback

Após estabilizar o ambiente:

1. **Documente o incidente:** Anote horário, versão problemática, sintomas, tempo decorrido entre deploy e rollback, e passos executados.
2. **Abra um postmortem:** Reúna o time para análise de causa raiz, identificando por que o erro não foi pego em staging e quais mudanças de processo evitarão repetição.
3. **Corrija o bug:** Desenvolva a correção em uma branch separada, com testes que reproduzam o cenário da falha.
4. **Reteste exaustivamente em staging:** Inclua cenários de migration, login, CRUD e health check.
5. **Só então agende novo deploy** seguindo novamente os 6 passos deste documento.
