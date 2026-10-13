import { hash } from 'argon2';

import { env } from '../src/config/env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_PASSWORD = env.SEED_ADMIN_PASSWORD ?? 'Admin12345';
const OPERATOR_PASSWORD = env.SEED_OPERATOR_PASSWORD ?? 'Operator12345';

async function main(): Promise<void> {
  const adminHash = await hash(ADMIN_PASSWORD);
  const operatorHash = await hash(OPERATOR_PASSWORD);

  const users = [
    {
      username: 'administrator',
      name: 'Administrator JMC',
      email: 'admin@jmc-indonesia.test',
      role: 'ADMIN' as const,
      passwordHash: adminHash,
      isLocked: false,
    },
    {
      username: 'operator1',
      name: 'Budi Santoso',
      email: 'budi.santoso@jmc-indonesia.test',
      role: 'OPERATOR' as const,
      passwordHash: operatorHash,
      isLocked: false,
    },
    {
      username: 'operator2',
      name: 'Liana Putri',
      email: 'liana.putri@jmc-indonesia.test',
      role: 'OPERATOR' as const,
      passwordHash: operatorHash,
      isLocked: false,
    },
    {
      username: 'operator3',
      name: 'Joko Suyanto',
      email: 'joko.suyanto@jmc-indonesia.test',
      role: 'OPERATOR' as const,
      passwordHash: operatorHash,
      isLocked: true,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        name: user.name,
        email: user.email,
        role: user.role,
        isLocked: user.isLocked,
        lockedAt: user.isLocked ? new Date() : null,
      },
      create: {
        ...user,
        lockedAt: user.isLocked ? new Date() : null,
      },
    });
  }

  const categories = [
    { code: 'PK', name: 'Perlengkapan Kantor' },
    { code: 'FO', name: 'Makanan' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { code: category.code },
      update: { name: category.name },
      create: category,
    });
  }

  const subCategories = [
    { categoryCode: 'PK', name: 'Alat Tulis', priceLimit: 500_000 },
    { categoryCode: 'PK', name: 'Perabotan', priceLimit: 7_500_000 },
    { categoryCode: 'FO', name: 'Makanan Ringan', priceLimit: 1_000_000 },
  ];

  for (const sub of subCategories) {
    const category = await prisma.category.findUniqueOrThrow({
      where: { code: sub.categoryCode },
      select: { id: true },
    });
    await prisma.subCategory.upsert({
      where: { categoryId_name: { categoryId: category.id, name: sub.name } },
      update: { priceLimit: sub.priceLimit },
      create: {
        categoryId: category.id,
        name: sub.name,
        priceLimit: sub.priceLimit,
      },
    });
  }

  console.log('Seed completed: 4 users, 2 categories, 3 sub-categories');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
