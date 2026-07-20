const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('Password123', salt);
  const result = await prisma.user.updateMany({
    data: {
      passwordHash: hash
    }
  });
  console.log(`Updated passwords for ${result.count} users.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
