import prisma from '../../backend/src/db.js';

async function check() {
  try {
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'SiteSettings'
      ORDER BY ordinal_position;
    `);
    console.log('SiteSettings columns in PostgreSQL:');
    console.table(cols);
    
    const hasTrailLogos = cols.some(c => c.column_name === 'trailLogos');
    console.log('Has trailLogos column?', hasTrailLogos);
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
