import { prisma } from "../lib/prisma";
import { ALL_MEMBERSHIP_PERMISSIONS } from "../lib/permissions";

async function main() {
  const args = process.argv.slice(2);
  const clientName = args[0] || process.env.SEED_CLIENT_NAME || "Grupo Horizonte";
  const adminEmail = (args[1] || process.env.SEED_ADMIN_EMAIL || "admin@vgon.com.br").trim().toLowerCase();

  const slug = slugify(clientName);

  const client = await prisma.client.upsert({
    where: { slug },
    update: { name: clientName },
    create: {
      name: clientName,
      slug,
      status: "ACTIVE"
    }
  });

  const admin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, email: true, role: true }
  });

  if (!admin) {
    // eslint-disable-next-line no-console
    console.warn(
      `[seed-client] Usuário admin ${adminEmail} não encontrado. Crie-o com npm run create-admin antes do seed.`
    );
    process.exit(0);
  }

  await prisma.clientMembership.upsert({
    where: { clientId_userId: { clientId: client.id, userId: admin.id } },
    update: { permissions: ALL_MEMBERSHIP_PERMISSIONS, isPrimary: true },
    create: {
      clientId: client.id,
      userId: admin.id,
      permissions: ALL_MEMBERSHIP_PERMISSIONS,
      isPrimary: true
    }
  });

  // eslint-disable-next-line no-console
  console.log(
    `[seed-client] Cliente "${client.name}" (slug=${client.slug}) configurado. Usuário ${admin.email} é membro principal com todas as permissões.`
  );
}

function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "cliente";
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
