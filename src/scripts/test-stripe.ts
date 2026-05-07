import prisma from '../lib/prisma';

import axios from 'axios';


const CORE_API_URL = 'http://localhost:8083/api/public'; // Porta do Atlas Core

async function run() {
  console.log('⏳ [1/3] A preparar o ambiente de teste no Prisma...');
  
  try {
    // A. Criar um utilizador e uma carteira EUR (se não existir)
    const user = await prisma.user.upsert({
      where: { email: 'merchant@atlas.test' },
      update: {},
      create: {
        email: 'merchant@atlas.test',
        fullName: 'Test Merchant',
        tier: 'TIER_2_VERIFIED',
        wallets: {
          create: { currency: 'EUR', walletReference: 'W-EUR-TEST-001' }
        }
      }
    });

    // B. Criar uma Loja com STRIPE autorizado
    const store = await prisma.store.upsert({
      where: { slug: 'loja-teste' },
      update: { allowedMethods: { 'CREDIT_CARD': true, 'PIX': true } },
      create: {
        userId: user.id,
        name: 'Loja de Demonstração',
        slug: 'loja-teste',
        allowedMethods: { 'CREDIT_CARD': true, 'PIX': true }
      }
    });

    // C. Criar um Link de Pagamento (50 EUR)
    const link = await prisma.paymentLink.create({
      data: {
        storeId: store.id,
        userId: user.id,
        title: 'Mentoria Premium (Stripe Test)',
        amount: 50.00,
        currency: 'EUR',
      }
    });

    console.log(`✅ Ambiente pronto! Loja: ${store.slug} | Link: ${link.id}`);
    console.log('🚀 [2/3] A simular o Frontend a pedir o pagamento...');

    // D. Simular a submissão do Frontend
    const payload = {
      customer: {
        name: 'Cliente VIP',
        email: 'cliente@vip.com'
      },
      method: {
        provider: 'STRIPE',
        type: 'CREDIT_CARD' // Em EUR, o Orquestrador vai mandar para STRIPE_PT_001
      }
    };

    const response = await axios.post(`${CORE_API_URL}/checkout/${store.slug}/${link.id}/pay`, payload);

    console.log('\n🎯 [3/3] SUCESSO! Resposta final do Atlas Core (com os dados da Proxy):');
    console.dir(response.data, { depth: null, colors: true });

  } catch (error: any) {
    console.error('\n❌ Falha no Teste S2S:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

run();
