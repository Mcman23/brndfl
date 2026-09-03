import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { projects, solutions, articles, jobs } from './seed-data.js';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Brandfull content from structured seed-data.js...');

  // Seed Projects
  for (const project of projects) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: project,
      create: project
    });
  }
  console.log(`Seeded/Upserted ${projects.length} projects.`);

  // Seed Solutions
  for (const sol of solutions) {
    await prisma.solution.upsert({
      where: { id: sol.id },
      update: sol,
      create: sol
    });
  }
  console.log(`Seeded/Upserted ${solutions.length} solutions.`);

  // Seed Articles
  for (const article of articles) {
    await prisma.article.upsert({
      where: { id: article.id },
      update: article,
      create: article
    });
  }
  console.log(`Seeded/Upserted ${articles.length} articles.`);

  // Seed Jobs
  for (const job of jobs) {
    await prisma.job.upsert({
      where: { id: job.id },
      update: job,
      create: job
    });
  }
  console.log(`Seeded/Upserted ${jobs.length} jobs.`);

  // Seed Default Admin User
  const email = process.env.ADMIN_EMAIL || 'admin@brandfull.com';
  const password = process.env.ADMIN_PASSWORD || 'admin_temp_password_123';
  
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email }
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        active: true
      }
    });
    console.log(`Seeded default Admin User: ${email}`);
  } else {
    console.log('Admin user already exists. Skipping admin seed.');
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
