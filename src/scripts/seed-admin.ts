import dotenv from 'dotenv';
// Carrega o .env antes de tudo
dotenv.config();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Injeta o URL diretamente para o Prisma não se queixar de opções vazias
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  const email = 'admin@atlasglobal.digital';
  const password = 'AtlasAdmin2026!';

  console.log(`⏳ A carregar variáveis... DB: ${process.env.DATABASE_URL ? 'OK' : 'FALHA'}`);
  console.log(`⏳ A verificar se ${email} existe...`);
  
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    console.log('✅ Admin já existe!');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      name: 'Atlas Administrator',
      role: 'ADMIN' as any,
      tier: 'TIER_0_UNVERIFIED' as any,
      status: 'ACTIVE' as any
    }
  });

  console.log(`🚀 Master Admin criado com sucesso: ${admin.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Erro na criação:", e);
    await prisma.$disconnect();
  });
