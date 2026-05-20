import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Use the same password in Playwright tests: TEST_ADMIN_PASSWORD env var or 'Admin@12345'
  const password = process.env['SEED_ADMIN_PASSWORD'] ?? 'Admin@12345';
  const passwordHash = await argon2.hash(password);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@medschedule.local' },
    update: {},
    create: {
      email: 'admin@medschedule.local',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Seeded admin user: ${admin.id} (${admin.email})`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
