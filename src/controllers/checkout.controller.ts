import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { PaymentOrchestrator } from '../services/orchestrator.service';

// 1. Endpoint para o Frontend carregar os dados da Loja e do Link (Renderização)
export const getCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { storeSlug, linkId } = req.params;

    const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
    if (!store || store.status !== 'ACTIVE') return res.status(404).json({ error: 'Loja indisponível.' });

    const paymentLink = await prisma.paymentLink.findFirst({
      where: { id: linkId, storeId: store.id },
    });

    if (!paymentLink || !paymentLink.isActive) return res.status(404).json({ error: 'Link inativo.' });

    return res.status(200).json({
      store: { 
        name: store.name, 
        branding: store.branding,
        allowedMethods: store.allowedMethods // O Frontend vai usar isto para saber o que desenhar
      },
      link: {
        id: paymentLink.id,
        title: paymentLink.title,
        amount: paymentLink.amount,
        currency: paymentLink.currency,
        successUrl: paymentLink.successUrl,
        cancelUrl: paymentLink.cancelUrl
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao recuperar sessão.' });
  }
};

// 2. Endpoint para processar o pagamento via Orquestrador (AtlasOP)
export const processPayment = async (req: Request, res: Response) => {
  try {
    const { storeSlug, linkId } = req.params;
    const { customer, method } = req.body; 

    const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
    const paymentLink = await prisma.paymentLink.findFirst({ 
      where: { id: linkId, storeId: store?.id } 
    });

    if (!store || !paymentLink) return res.status(404).json({ error: 'Sessão inválida.' });

    // Mini-CRM: Guardar o Lead
    const storeCustomer = await prisma.customer.upsert({
      where: { storeId_email: { storeId: store.id, email: customer.email } },
      update: { name: customer.name, document: customer.document },
      create: { storeId: store.id, name: customer.name, email: customer.email, document: customer.document }
    });

    const merchantWallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId: store.userId, currency: paymentLink.currency } }
    });

    if (!merchantWallet) return res.status(400).json({ error: 'Merchant sem carteira ativa.' });

    // Criar Transação Interna
    const transaction = await prisma.transaction.create({
      data: {
        walletId: merchantWallet.id,
        userId: store.userId,
        type: 'PROXY_INCOMING',
        status: 'PENDING',
        amount: paymentLink.amount,
        currency: paymentLink.currency,
        paymentLinkId: paymentLink.id,
        customerId: storeCustomer.id,
        description: `Checkout: ${paymentLink.title}`
      }
    });

    // Delegar para a NeXFlowX Proxy via AtlasOP
    try {
      const proxyResponse = await PaymentOrchestrator.routePayment(store, method.type, {
        transactionId: transaction.id,
        amount: Number(paymentLink.amount),
        currency: paymentLink.currency,
        customer: customer
      });

      return res.status(200).json({
        transactionId: transaction.id,
        gatewayResponse: proxyResponse
      });

    } catch (orchestratorError: any) {
      return res.status(403).json({ error: orchestratorError.message });
    }

  } catch (error) {
    console.error('[Process Payment Error]:', error);
    return res.status(500).json({ error: 'Falha crítica no processamento.' });
  }
};
