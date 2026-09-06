const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.solution.create({
    data: {
      id: 'sol_1',
      titleAz: 'Brend Strategiyası',
      iconUrl: '⭐',
      order: 1,
      num: '01',
      featured: true,
      descriptionAz: 'Brendinizin bazardakı yerini müəyyən edirik.'
    }
  });

  await prisma.solution.create({
    data: {
      id: 'sol_2',
      titleAz: 'Rəqəmsal Məhsul (UX/UI)',
      iconUrl: '🎨',
      order: 2,
      num: '02',
      featured: true,
      descriptionAz: 'İstifadəçi təcrübəsini artıracaq məhsullar yaradırıq.'
    }
  });

  console.log('Seeding complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
