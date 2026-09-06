const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding projects, clients, and solutions...');

  await prisma.project.create({
    data: {
      id: 'proj_1',
      title: 'Süni İntellektlə E-Ticarət İdarəetməsi',
      slug: 'ai-ecommerce',
      client: 'RetailHub',
      category: 'E-commerce',
      tag: 'AI',
      year: '2023',
      overview: 'Overview here',
      challenge: 'Challenge here',
      solution: 'Solution here',
      impact: [],
      featured: true,
      image: 'https://images.unsplash.com/photo-1661956602116-aa6865609028?auto=format&fit=crop&q=80&w=800'
    }
  });

  await prisma.project.create({
    data: {
      id: 'proj_2',
      title: 'B2B Finans Platforması Yenilənməsi',
      slug: 'b2b-finance',
      client: 'FinCorp',
      category: 'Finance',
      tag: 'B2B',
      year: '2023',
      overview: 'Overview here',
      challenge: 'Challenge here',
      solution: 'Solution here',
      impact: [],
      featured: true,
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800'
    }
  });

  await prisma.solution.create({
    data: {
      id: 'sol_1',
      titleAz: 'Brend Strategiyası',
      iconUrl: '⭐',
      order: 1,
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
      featured: true,
      descriptionAz: 'İstifadəçi təcrübəsini artıracaq məhsullar yaradırıq.'
    }
  });

  console.log('Seeding complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
