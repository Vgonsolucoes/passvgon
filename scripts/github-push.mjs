#!/usr/bin/env node
/**
 * Script para inicializar repositório Git local, criar commit inicial e fazer
 * push para o GitHub usando `isomorphic-git` (pure JS, sem dependência de git.exe).
 *
 * Uso:
 *   set GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxx
 *   node scripts/github-push.mjs --name "Nome Usuário" --email "email@exemplo.com" --token "ghp_xxx" --repo "https://github.com/Vgonsolucoes/passvgon.git"
 *
 * Ou fornecer via variável de ambiente GITHUB_TOKEN.
 */

import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        args[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
        args[arg.slice(2)] = argv[++i];
      } else {
        args[arg.slice(2)] = true;
      }
    }
  }
  return args;
}

async function fileExists(p) {
  try {
    await fs.promises.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const token = args.token || process.env.GITHUB_TOKEN;
  const name = args.name || "PassVGON Deploy Bot";
  const email = args.email || "deploy@vgon.com.br";
  const repo =
    args.repo || "https://github.com/Vgonsolucoes/passvgon.git";
  const branch = args.branch || "main";
  const message =
    args.message || "chore: initial scaffolding - PassVGON v0.1.0";

  if (!token || token.trim().length === 0) {
    console.error("ERRO: Token do GitHub não informado.");
    console.error("  Forneça via --token=ghp_xxx ou variável GITHUB_TOKEN.");
    console.error("  Gerar PAT em: https://github.com/settings/tokens (escopo repo)");
    process.exit(1);
  }

  const gitDir = path.join(repoDir, ".git");
  const isGitInit = await fileExists(gitDir);

  console.log("=");
  console.log("PassVGON — Push para GitHub");
  console.log("=");
  console.log(`Repositório remoto: ${repo}`);
  console.log(`Branch:             ${branch}`);
  console.log(`Autor commit:       ${name} <${email}>`);
  console.log(`Repositório local:  ${repoDir}`);
  console.log("=");

  if (!isGitInit) {
    console.log("\n[1/6] Inicializando repositório git local...");
    await git.init({ fs, dir: repoDir, defaultBranch: branch });
    console.log("      OK — repositório inicializado.");
  } else {
    console.log("\n[1/6] Repositório já inicializado. Pulando init.");
  }

  console.log("\n[2/6] Aplicando .gitignore e listando arquivos rastreados...");

  const { default: ignore } = await import("ignore");
  const ig = ignore();
  const gitignorePath = path.join(repoDir, ".gitignore");
  if (await fileExists(gitignorePath)) {
    const content = await fs.promises.readFile(gitignorePath, "utf8");
    ig.add(content);
    ig.add(".git");
  }

  console.log("\n[3/6] Registrando arquivos (git add)...");
  const added = [];

  async function walk(dir, prefix = "") {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      const full = path.join(dir, e.name);
      if (e.name === ".git") continue;
      if (ig.ignores(rel)) continue;
      if (e.isDirectory()) {
        await walk(full, rel);
      } else if (e.isFile()) {
        const content = await fs.promises.readFile(full);
        await git.add({ fs, dir: repoDir, filepath: rel, content });
        added.push(rel);
      }
    }
  }
  await walk(repoDir);

  console.log(`      OK — ${added.length} arquivos adicionados.`);
  if (added.length <= 10) {
    added.forEach((f) => console.log(`        + ${f}`));
  } else {
    added.slice(0, 10).forEach((f) => console.log(`        + ${f}`));
    console.log(`        ... e mais ${added.length - 10} arquivos.`);
  }

  console.log("\n[4/6] Criando commit inicial...");
  const status = await git.statusMatrix({ fs, dir: repoDir });
  const hasChanges = status.some((row) => row[1] !== row[2] || row[2] === 0);
  let sha;

  if (hasChanges || !isGitInit) {
    sha = await git.commit({
      fs,
      dir: repoDir,
      message,
      author: { name, email },
      committer: { name, email }
    });
    console.log(`      OK — commit ${sha.substring(0, 8)} criado.`);
  } else {
    try {
      const log = await git.log({ fs, dir: repoDir, depth: 1 });
      sha = log[0].oid;
      console.log(`      Sem alterações — último commit ${sha.substring(0, 8)}.`);
    } catch {
      sha = await git.commit({
        fs,
        dir: repoDir,
        message,
        author: { name, email },
        committer: { name, email }
      });
      console.log(`      OK — commit ${sha.substring(0, 8)} criado.`);
    }
  }

  console.log("\n[5/6] Configurando remote 'origin'...");
  let remotes = [];
  try {
    remotes = await git.listRemotes({ fs, dir: repoDir });
  } catch {
    remotes = [];
  }
  const hasOrigin = remotes.some((r) => r.remote === "origin");
  if (hasOrigin) {
    await git.deleteRemote({ fs, dir: repoDir, remote: "origin" });
  }
  await git.addRemote({ fs, dir: repoDir, remote: "origin", url: repo });
  console.log(`      OK — origin = ${repo}`);

  console.log("\n[6/6] Enviando push para GitHub...");
  try {
    const pushResult = await git.push({
      fs,
      http,
      dir: repoDir,
      remote: "origin",
      ref: branch,
      url: repo,
      onAuth: () => ({
        username: "x-access-token",
        password: token
      }),
      onAuthFailure: () => {
        console.error("      ERRO: Falha de autenticação.");
        return null;
      },
      onProgress: (event) => {
        if (event.phase && event.phase !== "end" && process.stderr.isTTY) {
          process.stderr.write(`      progresso: ${event.phase} (${event.loaded}/${event.total ?? "?"})\r`);
        }
      }
    });
    if (process.stderr.isTTY) process.stderr.write("\n");
    console.log(`      OK — push concluído. Result: ok=${pushResult.ok}, refs=${JSON.stringify(pushResult.refs ?? {})}`);
  } catch (err) {
    console.error(`      ERRO no push: ${err?.message ?? err}`);
    if (err?.data) console.error(`      detalhes: ${JSON.stringify(err.data)}`);
    if (
      err?.message?.includes("401") ||
      err?.message?.includes("403") ||
      err?.message?.toLowerCase?.().includes("authentication")
    ) {
      console.error("\n      Dica: verifique o GITHUB_TOKEN — precisa ter escopo 'repo' e estar válido.");
      console.error("      Gerar novo token: https://github.com/settings/tokens/new?scopes=repo&description=PassVGON%20Deploy");
    } else if (err?.message?.includes("404") || err?.message?.includes("not found")) {
      console.error("\n      Dica: repositório não encontrado. Confirme se a URL está correta e se o token tem acesso a esse repositório.");
    } else if (err?.message?.includes("non-fast-forward") || err?.message?.includes("rejected")) {
      console.error("\n      Dica: repositório remoto tem commits diferentes. Verifique --force ou limpe o remoto antes.");
    }
    process.exit(1);
  }

  console.log("\n=");
  console.log("PUSH CONCLUÍDO COM SUCESSO!");
  console.log("=");
  console.log(`Commit SHA:  ${sha}`);
  console.log(`Branch:      ${branch}`);
  console.log(`Remoto:      ${repo}`);
  console.log(`Ver URL:     ${repo.replace(/\.git$/, "")}`);
}

main().catch((err) => {
  console.error("ERRO FATAL:", err?.stack ?? err?.message ?? err);
  process.exit(1);
});
