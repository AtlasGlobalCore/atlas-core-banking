import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getCheckoutSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pk } = req.query;
    if (!pk) {
      res.status(400).json({ error: 'Publishable key is required' });
      return;
    }

    const store = await prisma.store.findUnique({
      where: { publishableKey: String(pk) },
      include: { user: true }
    });

    if (!store) {
      res.status(404).json({ error: 'Merchant not found' });
      return;
    }

    res.json({
      storeName: store.name,
      branding: store.branding,
      allowedMethods: store.allowedMethods,
      currency: (store.allowedMethods as any)?.defaultCurrency || 'EUR'
    });
  } catch (error) {
    console.error('🚨 Session Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const processCheckoutPay = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pk, amount, currency, method, token, email, document } = req.body;

    const store = await prisma.store.findUnique({
      where: { publishableKey: pk }
    });

    if (!store) {
      res.status(401).json({ error: 'Invalid Store Key' });
      return;
    }

    const allowedConfig: any = store.allowedMethods || {};
    const providers = allowedConfig.providers || {};
    const providerId = Object.keys(providers).length > 0 ? Object.keys(providers)[0] : 'STRIPE_PT_001';
    const storeCurrency = allowedConfig.defaultCurrency || 'EUR';

    // ==========================================
    // 🧠 O TRADUTOR: Gateway Routing Engine
    // ==========================================
    let proxyEndpoint = `https://proxy.nexflowx.tech/relay/${providerId}/payments`;
    let proxyPayload: any = {};

    if (providerId.includes('STRIPE')) {
      // 🇺🇸 Dialeto Stripe (Relay para /charges)
      proxyEndpoint = `https://proxy.nexflowx.tech/relay/${providerId}/charges`;
      proxyPayload = {
        amount: amount, // Stripe usa cêntimos (ex: 2500 = 25.00)
        currency: (currency || storeCurrency).toLowerCase(),
        source: token,
        description: `Pagamento Atlas Core - Lojista: ${store.name}`,
        metadata: { store_id: store.id, customer_email: email }
      };
    } else if (providerId.includes('MP')) {
      // 🇧🇷 Dialeto Mercado Pago (Relay para /payments)
      proxyEndpoint = `https://proxy.nexflowx.tech/relay/${providerId}/payments`;
      proxyPayload = {
        transaction_amount: amount / 100, // MP espera decimal (ex: 50.00)
        token: token,
        description: `Pagamento Atlas Core - Lojista: ${store.name}`,
        installments: 1,
        payer: {
          email: email,
          identification: {
            type: "CPF",
            number: document || "00000000000"
          }
        },
        metadata: { store_id: store.id }
      };
    } else {
      // 🌐 Dialeto Agnóstico (Outros / PIX)
      proxyPayload = { amount, currency: storeCurrency, method, token, payer: { email, document } };
    }

    console.log(`\n🚀 Disparando para ${providerId} via Proxy...`);
    
    const proxyResponse = await fetch(proxyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-proxy-key': process.env.ATLAS_PROXY_SECRET || 'sk_proxy_atlascore_84x91h2j7k4L2026'
      },
      body: JSON.stringify(proxyPayload)
    });

    const data = await proxyResponse.json();
    console.dir(data, { depth: null, colors: true });

    res.status(proxyResponse.status).json(data);
  } catch (error: any) {
    console.error('🚨 Proxy Route Error:', error.message);
    res.status(500).json({ error: 'Gateway Error', details: error.message });
  }
};
