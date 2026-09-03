import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@brandfull.com';
  const password = process.env.ADMIN_PASSWORD || 'admin_temp_password_123';

  console.log(`Checking if admin user exists with email: ${email}...`);

  const existing = await prisma.adminUser.findUnique({
    where: { email }
  });

  if (existing) {
    console.log('Admin user already exists. Skipping user seed.');
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const admin = await prisma.adminUser.create({
    data: {
      email,
      passwordHash,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      active: true
    }
  });

  console.log(`Admin user successfully seeded with ID: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error('Seeding admin failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
