import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log('⏳ A preparar a Loja Walluxe para o User WILL...');
  
  try {
    // 1. Procurar o User existente pelo email
    const user = await prisma.user.findUnique({
      where: { email: 'testebr@cliente.com' }
    });

    if (!user) {
      throw new Error('❌ Utilizador WILL não encontrado na Base de Dados!');
    }

    // 2. Criar Carteira EUR para o WILL (se não existir)
    const wallet = await prisma.wallet.upsert({
      where: { userId_currency: { userId: user.id, currency: 'EUR' } },
      update: {},
      create: {
        userId: user.id,
        currency: 'EUR',
        walletReference: `W-EUR-${user.id.substring(0,6).toUpperCase()}`
      }
    });

    // 3. Criar a Loja Walluxe
    const store = await prisma.store.upsert({
      where: { slug: 'walluxe' },
      update: {
        apiKey: 'sk_live_atlas_walluxe_test_key_001',
        allowedMethods: { 'CREDIT_CARD': true, 'PIX': true, 'SEPA_INSTANT': true }
      },
      create: {
        userId: user.id,
        name: 'Walluxe Premium',
        slug: 'walluxe',
        apiKey: 'sk_live_atlas_walluxe_test_key_001',
        allowedMethods: { 'CREDIT_CARD': true, 'PIX': true, 'SEPA_INSTANT': true }
      }
    });

    // 4. Criar um Link de Pagamento de Teste (Ex: Ténis Exclusivos)
    const link = await prisma.paymentLink.create({
      data: {
        storeId: store.id,
        userId: user.id,
        title: 'Walluxe SmartWatch',
        description: 'Relógio de Luxo - Edição Limitada',
        amount: 250.00,
        currency: 'EUR',
        isActive: true,
        successUrl: 'https://walluxe.com/sucesso'
      }
    });

    console.log(`✅ SUCESSO! Ambiente Walluxe Criado.`);
    console.log(`=========================================`);
    console.log(`🏬 Loja: ${store.name}`);
    console.log(`🔑 API Key: ${store.apiKey}`);
    console.log(`🔗 Link ID: ${link.id}`);
    console.log(`🌐 URL de Teste para o Checkout: http://localhost:3000/${store.slug}/${link.id}`);
    console.log(`=========================================`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
