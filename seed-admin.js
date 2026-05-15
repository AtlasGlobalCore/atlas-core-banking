require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@atlasglobal.digital';
  const password = 'AtlasAdmin2026!';

  console.log(`⏳ A carregar variáveis... DB: ${process.env.DATABASE_URL ? 'OK' : 'FALHA'}`);
  
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    console.log('✅ Admin já existe!');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      email: email,
      passwordHash: hashedPassword,
      name: 'Atlas Administrator',
      role: 'ADMIN',
      tier: 'TIER_0_UNVERIFIED',
      status: 'ACTIVE'
    }
  });

  console.log(`🚀 Master Admin criado com sucesso: ${admin.email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("❌ Erro na criação:", e);
    prisma.$disconnect();
  });
