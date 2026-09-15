import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

interface Args {
  email?: string;
  name?: string;
  password?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--email" && i + 1 < argv.length) {
      args.email = argv[++i];
    } else if (arg.startsWith("--email=")) {
      args.email = arg.split("=")[1];
    } else if (arg === "--name" && i + 1 < argv.length) {
      args.name = argv[++i];
    } else if (arg.startsWith("--name=")) {
      args.name = arg.split("=")[1];
    } else if (arg === "--password" && i + 1 < argv.length) {
      args.password = argv[++i];
    } else if (arg.startsWith("--password=")) {
      args.password = arg.split("=")[1];
    }
  }
  return args;
}

function validateArgs(args: Args): string[] {
  const errors: string[] = [];
  if (!args.email) errors.push("--email é obrigatório");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) errors.push("Email inválido");
  if (!args.name) errors.push("--name é obrigatório");
  else if (args.name.trim().length < 2) errors.push("Nome deve ter pelo menos 2 caracteres");
  if (!args.password) errors.push("--password é obrigatório");
  else if (args.password.length < 8) errors.push("Senha deve ter pelo menos 8 caracteres");
  return errors;
}

async function main() {
  const args = parseArgs(process.argv);
  const errors = validateArgs(args);

  if (errors.length > 0) {
    console.error("Erros de validação:");
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error("\nUso: tsx scripts/create-admin.ts --email <email> --name <nome> --password <senha>");
    process.exit(1);
  }

  const { email, name, password } = args as Required<Args>;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const { hash, algo } = await hashPassword(password);
      await prisma.user.update({
        where: { email },
        data: { passwordHash: hash, passwordAlgo: algo, role: "ADMIN", status: "ACTIVE" }
      });
      console.log(`Usuário ${email} já existia. Senha atualizada (${algo}) e role=ADMIN garantido.`);
      process.exit(0);
    }

    const { hash, algo } = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hash,
        passwordAlgo: algo,
        role: "ADMIN",
        status: "ACTIVE"
      },
      select: { id: true, email: true, name: true, role: true, passwordAlgo: true }
    });

    console.log("Usuário admin criado com sucesso:");
    console.log(`  ID: ${user.id}`);
    console.log(`  Nome: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Hash Algo: ${user.passwordAlgo ?? "bcrypt"}`);
  } catch (error) {
    console.error("Erro ao criar usuário admin:");
    if (error instanceof Error) {
      console.error(`  ${error.message}`);
    } else {
      console.error("  Erro desconhecido");
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
