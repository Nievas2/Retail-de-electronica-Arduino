import { PrismaClient, RoleName } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Roles
  const roles: RoleName[] = [RoleName.ADMIN, RoleName.VENDEDOR, RoleName.BODEGA];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r },
      update: {},
      create: { name: r },
    });
  }

  // Admin user
  const adminRole = await prisma.role.findUnique({ where: { name: RoleName.ADMIN } });
  if (!adminRole) throw new Error('ADMIN role not found');

  const username = 'admin';
  const password = 'admin123'; // CAMBIAR en producción
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      roleId: adminRole.id,
      name: 'Administrador',
      username,
      passwordHash,
      active: true,
    },
  });

  console.log('Seed OK: roles + admin creado (admin/admin123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
