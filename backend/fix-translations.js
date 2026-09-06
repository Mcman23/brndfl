import { PrismaClient } from '@prisma/client';
import translate from 'google-translate-api-x';

const prisma = new PrismaClient();

async function main() {
  const translations = await prisma.translation.findMany();
  
  for (const t of translations) {
    if (t.az && t.az === t.en && t.az.length > 3) {
      console.log(`Translating: ${t.key} - ${t.az}`);
      try {
        const enRes = await translate(t.az, { from: 'az', to: 'en' });
        const ruRes = await translate(t.az, { from: 'az', to: 'ru' });
        
        await prisma.translation.update({
          where: { key: t.key },
          data: { en: enRes.text, ru: ruRes.text }
        });
        
        console.log(`  -> EN: ${enRes.text}`);
        console.log(`  -> RU: ${ruRes.text}`);
      } catch (err) {
        console.error(`Failed to translate ${t.key}:`, err.message);
      }
      
      // Delay to avoid rate limits
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
