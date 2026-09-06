import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const initialTranslations = {
  navWork: {
    az: "İşlərimiz",
    en: "Our Work",
    ru: "Наши работы"
  },
  navSolutions: {
    az: "Həllər",
    en: "Solutions",
    ru: "Решения"
  },
  navApproach: {
    az: "Yanaşma",
    en: "Approach",
    ru: "Подход"
  },
  navCompany: {
    az: "Haqqımızda",
    en: "About Us",
    ru: "О нас"
  },
  navIdeas: {
    az: "Fikirlər",
    en: "Ideas",
    ru: "Идеи"
  },
  navCareers: {
    az: "Karyera",
    en: "Careers",
    ru: "Карьера"
  },
  navContactBtn: {
    az: "Bizimlə danışın",
    en: "Talk to us",
    ru: "Свяжитесь с нами"
  },
  navMenu: {
    az: "Menyu",
    en: "Menu",
    ru: "Меню"
  },
  readMore: {
    az: "Layihəyə bax ↗",
    en: "View Project ↗",
    ru: "Смотреть проект ↗"
  },
  applyBtn: {
    az: "Müraciət Et",
    en: "Apply Now",
    ru: "Подать заявку"
  },
  heroScroll: {
    az: "Aşağı sürüşdürün",
    en: "Scroll down",
    ru: "Прокрутите вниз"
  },
  homeStatement: {
    az: "Əhəmiyyətli işlər yaradırıq <span class=\"word-scroller\"><span class=\"scrolling-words\"><span class=\"word\">bizneslər üçün.</span><span class=\"word\">brendlər üçün.</span><span class=\"word\">insanlar üçün.</span><span class=\"word\">komandalar üçün.</span><span class=\"word\">bizneslər üçün.</span></span></span>",
    en: "We create meaningful work <span class=\"word-scroller\"><span class=\"scrolling-words\"><span class=\"word\">for businesses.</span><span class=\"word\">for brands.</span><span class=\"word\">for people.</span><span class=\"word\">for teams.</span><span class=\"word\">for businesses.</span></span></span>",
    ru: "Мы создаем значимую работу <span class=\"word-scroller\"><span class=\"scrolling-words\"><span class=\"word\">для бизнеса.</span><span class=\"word\">для брендов.</span><span class=\"word\">для людей.</span><span class=\"word\">для команд.</span><span class=\"word\">для бизнеса.</span></span></span>"
  },
  homeSubStatement: {
    az: "<span>Hər</span> <span>kəs</span> <span>nəsə</span> <span>yarada</span> <span>bilər.</span> <span>Lakin</span> <span class=\"color-primary\">mədəniyyət</span> <span class=\"color-primary\">və</span> <span class=\"color-primary\">bizneslə</span> <span>rezonans</span> <span>doğuran</span> <span>təcrübələr</span> <span>yaratmaq</span> <span>çətin</span> <span>tərəfdir.</span> <span>Bu,</span> <span>dizayn,</span> <span>texnologiya</span> <span>və</span> <span>insan</span> <span>zəkası</span> <span>tələb</span> <span>edir.</span>",
    en: "<span>Anyone</span> <span>can</span> <span>create</span> <span>something.</span> <span>But</span> <span>creating</span> <span>experiences</span> <span>that</span> <span>resonate</span> <span>with</span> <span class=\"color-primary\">culture</span> <span class=\"color-primary\">and</span> <span class=\"color-primary\">business</span> <span>is</span> <span>the</span> <span>hard</span> <span>part.</span> <span>It</span> <span>requires</span> <span>design,</span> <span>technology,</span> <span>and</span> <span>human</span> <span>intelligence.</span>",
    ru: "<span>Любой</span> <span>может</span> <span>что-то</span> <span>создать.</span> <span>Но</span> <span>создать</span> <span>опыт,</span> <span>который</span> <span>резонирует</span> <span>с</span> <span class=\"color-primary\">культурой</span> <span class=\"color-primary\">и</span> <span class=\"color-primary\">бизнесом,</span> <span>—</span> <span>самое</span> <span>сложное.</span> <span>Это</span> <span>требует</span> <span>дизайна,</span> <span>технологий</span> <span>и</span> <span>человеческого</span> <span>интеллекта.</span>"
  },
  homeWorkTitle: {
    az: "İşlərimiz<span class=\"color-primary\">.</span>",
    en: "Our Work<span class=\"color-primary\">.</span>",
    ru: "Наши работы<span class=\"color-primary\">.</span>"
  },
  homeSolutionsTitle: {
    az: "Həllərimiz<span class=\"color-primary\">.</span>",
    en: "Solutions<span class=\"color-primary\">.</span>",
    ru: "Наши решения<span class=\"color-primary\">.</span>"
  },
  homeSeeWork: {
    az: "Son işlərimizə baxın<span class=\"color-primary\">.</span>",
    en: "View our recent work<span class=\"color-primary\">.</span>",
    ru: "Посмотрите наши работы<span class=\"color-primary\">.</span>"
  },
  homeReadyTalk: {
    az: "Danışmağa hazırsınız<span class=\"color-primary\">?</span>",
    en: "Ready to talk<span class=\"color-primary\">?</span>",
    ru: "Готовы к разговору<span class=\"color-primary\">?</span>"
  },
  exploreBtn: {
    az: "Kəşf edin &rarr;",
    en: "Discover &rarr;",
    ru: "Узнать больше &rarr;"
  },
  contactLinkBtn: {
    az: "Bizimlə əlaqə &rarr;",
    en: "Contact Us &rarr;",
    ru: "Связаться с нами &rarr;"
  }
};

async function seed() {
  console.log('Seeding initial translations...');
  for (const [key, val] of Object.entries(initialTranslations)) {
    await prisma.translation.upsert({
      where: { key },
      update: val,
      create: {
        key,
        az: val.az,
        en: val.en,
        ru: val.ru
      }
    });
  }
  console.log('Translations seeded successfully.');
}

seed()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
