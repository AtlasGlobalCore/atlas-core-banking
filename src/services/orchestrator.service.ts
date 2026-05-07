import axios from 'axios';

export const PaymentOrchestrator = {
  async routePayment(store: any, methodType: string, paymentData: any) {
    
    // 1. Verificação de Tier/KYC do Merchant (Bloqueio de Segurança)
    const methods = store.allowedMethods as any;
    if (!methods || !methods[methodType]) {
      throw new Error(`O método ${methodType} não está ativo para a loja ${store.name}. Contacte a equipa AtlasOP.`);
    }

    let targetRoute = '';

    // 2. ROTEAMENTO ATLAS OP (Onde decidimos a rota da NexFlowX Proxy)
    // No futuro, isto pode ser lido de uma tabela "RoutingRules" na base de dados
    if (methodType === 'CREDIT_CARD' || methodType === 'STRIPE_ELEMENTS') {
      targetRoute = paymentData.currency === 'GBP' ? 'STRIPE_UK_001' : 'STRIPE_PT_001';
    } 
    else if (methodType === 'VIVA') {
      targetRoute = 'VIVA_PT_001';
    } 
    else if (methodType === 'PIX') {
      targetRoute = 'PIX_BR_001';
    } 
    else if (methodType === 'MBWAY') {
      // Podemos processar MBWay via Viva ou Stripe, a Proxy resolve.
      targetRoute = 'VIVA_PT_001'; 
    } 
    else if (methodType === 'STRIPE_CRYPTO') {
      targetRoute = 'STRIPE_CRYPTO';
    } 
    else if (methodType === 'SEPA_INSTANT') {
      targetRoute = 'STRIPE_PT_001'; 
    } 
    else {
      throw new Error(`Roteamento não configurado para o método: ${methodType}`);
    }

    // 3. O Payload Universal para a NexFlowX Proxy
    const proxyPayload = {
      client_id: process.env.PROXY_CLIENT_ID || 'ATLAS_CORE_MAIN',
      reference_id: paymentData.transactionId, // O nosso AtlasReference (Elo de ligação)
      amount: paymentData.amount,
      currency: paymentData.currency,
      target_route: targetRoute,
      customer: paymentData.customer
    };

    const PROXY_URL = process.env.PROXY_URL || 'http://localhost:8082';
    const PROXY_API_KEY = process.env.PROXY_API_KEY || '';

    try {
      // 4. A chamada cega à Proxy. A Proxy recebe, lê a target_route e executa.
      // Assumimos que a Proxy tem um endpoint de entrada unificado.
      const response = await axios.post(`${PROXY_URL}/api/v1/proxy/intake`, proxyPayload, {
        headers: { 
          'Authorization': `Bearer ${PROXY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('[AtlasOP Orchestrator] Falha de comunicação com a Proxy:', error?.response?.data || error.message);
      throw new Error('Serviço de Adquirência temporariamente indisponível.');
    }
  }
};
