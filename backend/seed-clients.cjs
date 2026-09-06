const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.client.createMany({
    data: [
      { id: 'client_1', name: 'Google', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg', active: true },
      { id: 'client_2', name: 'Apple', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', active: true },
      { id: 'client_3', name: 'Microsoft', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg', active: true },
      { id: 'client_4', name: 'Amazon', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', active: true },
      { id: 'client_5', name: 'Spotify', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Spotify_logo_with_text.svg', active: true }
    ]
  });
  console.log('Seeded clients');
}

main().catch(console.error).finally(() => prisma.$disconnect());
