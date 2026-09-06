const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.solution.create({
    data: {
      id: 'sol_1',
      title: 'Süni İntellekt və Platformalar',
      slug: 'ai-platforms',
      num: '01',
      tagline: 'AI Solutions',
      desc: 'Süni intellekt əsaslı platformalar yaradırıq.',
      deliverables: [],
      order: 1,
      published: true
    }
  });

  await prisma.solution.create({
    data: {
      id: 'sol_2',
      title: 'Brend Strategiyası və Dizayn',
      slug: 'brand-strategy',
      num: '02',
      tagline: 'Strategy',
      desc: 'Brendinizin kimliyini sıfırdan formalaşdırırıq.',
      deliverables: [],
      order: 2,
      published: true
    }
  });

  console.log('Seeding complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
