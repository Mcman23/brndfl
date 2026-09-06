import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial Site Blocks...');

  await prisma.siteBlock.deleteMany({});

  const blocks = [
    {
      pageId: 'home',
      type: 'hero_dark',
      order: 1,
      titleAz: 'Salam.',
      subtitleAz: 'Xoş gəlmisiniz. Biznesinizi gələcəyə daşımağa hazırıq.',
      mediaUrl: 'https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/blt248c176a03654ddd/6a905376a594511f0962c3ec/Hs_Poster.jpg?auto=webp'
    },
    {
      pageId: 'home',
      type: 'statement',
      order: 2,
      titleAz: 'Təxəyyülü<br>təcrübəyə çeviririk.'
    },
    {
      pageId: 'home',
      type: 'split_hero',
      order: 3,
      titleAz: 'Veb saytlar, mobil tətbiqlər, rəqəmsal məhsullar və markalar üçün yaradıcı, insan yönümlü təcrübələr və süni intellekt həlləri dizayn edirik.'
    },
    {
      pageId: 'home',
      type: 'marquee',
      order: 4,
      titleAz: 'YARADICILIQ STRATEGİYA İLƏ GÖRÜŞÜR'
    },
    {
      pageId: 'home',
      type: 'dynamic_services',
      order: 5,
      titleAz: 'Həllər və Xidmətlər.'
    },
    {
      pageId: 'home',
      type: 'dynamic_work',
      order: 6,
      titleAz: 'Seçilmiş İşlər.'
    },
    {
      pageId: 'home',
      type: 'dynamic_clients',
      order: 7,
      titleAz: 'Birlikdə işlədiyimiz bəzi markalar.'
    },
    {
      pageId: 'home',
      type: 'contact_cta',
      order: 8,
      titleAz: 'Böyük bir ideyanız var?',
      subtitleAz: 'Gəlin bu barədə danışaq və onu gerçəyə çevirək.'
    }
  ];

  for (const b of blocks) {
    await prisma.siteBlock.create({ data: b });
  }

  console.log('Blocks seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
