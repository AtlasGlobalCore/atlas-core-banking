import prisma from '../lib/prisma';
import { Request, Response } from 'express';




export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    // 1. Autenticação via Header (Bearer Token ou x-api-key do Merchant)
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API Key não fornecida.' });
    }

    // Simplificação: Assumindo que a API Key pertence a uma Store (ou Organization)
    // Num cenário real, deve adicionar o campo 'apiKey' ao modelo Store no Prisma.
    // Para já, vamos procurar a loja pelo ID que fingiremos ser a chave para prova de conceito:
    const store = await prisma.store.findFirst({
      // where: { apiKey: apiKey } // O que faremos quando atualizar o Prisma
      where: { id: apiKey, status: 'ACTIVE' } 
    });

    if (!store) {
      return res.status(401).json({ error: 'Credenciais inválidas ou loja inativa.' });
    }

    // 2. Os dados que o Merchant nos enviou no POST
    const { 
      title, 
      amount, 
      currency, 
      reference,     // O ID da encomenda no sistema do Merchant
      successUrl,    // Para onde mandamos o cliente após pagar
      cancelUrl,     // Para onde mandamos o cliente se ele desistir
      webhookUrl     // Para onde disparamos a confirmação de pagamento
    } = req.body;

    // 3. Criar um Link de Pagamento Temporário (Uso Único)
    const session = await prisma.paymentLink.create({
      data: {
        storeId: store.id,
        userId: store.userId,
        title: title || `Ordem ${reference || 'Personalizada'}`,
        description: `Ref: ${reference}`,
        amount: amount,
        currency: currency,
        isReusable: false, // APENAS USO ÚNICO para faturas de e-commerce
        isActive: true,
        // Dica Arquitetural: Terá de adicionar estes 3 campos no Prisma no modelo PaymentLink
        // successUrl: successUrl,
        // cancelUrl: cancelUrl,
        // webhookUrl: webhookUrl, 
      }
    });

    // 4. Retornar a URL mágica que o Merchant deve abrir ao cliente
    const checkoutUrl = `https://pay.atlasglobal.digital/${store.slug}/${session.id}`;

    return res.status(200).json({
      id: session.id,
      checkoutUrl: checkoutUrl,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // Expira em 24h
    });

  } catch (error) {
    console.error('[Merchant API Error]:', error);
    return res.status(500).json({ error: 'Falha ao criar sessão de checkout.' });
  }
};
