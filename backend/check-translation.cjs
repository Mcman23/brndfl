const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$queryRawUnsafe('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'Translation\'').then(res => {
  console.log(res);
  process.exit(0);
}).catch(console.error);
