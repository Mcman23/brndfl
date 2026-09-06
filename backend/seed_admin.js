import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  const email = process.env.ADMIN_EMAIL || "mammadovarif144@gmail.com";
  const pass = process.env.ADMIN_PASSWORD || "admin123";
  const hash = await bcrypt.hash(pass, 10);
  
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin exists. Updating password...");
    await prisma.adminUser.update({
      where: { email },
      data: { passwordHash: hash, active: true, role: 'SUPER_ADMIN' }
    });
  } else {
    console.log("Creating admin...");
    await prisma.adminUser.create({
      data: {
        email,
        passwordHash: hash,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        active: true
      }
    });
  }
  console.log("Done.");
}

seed().catch(console.error).finally(() => prisma.$disconnect());
