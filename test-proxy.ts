async function testarProxy() {
  console.log("🚀 A iniciar teste de ligação: ATLAS CORE -> STRIPE (Via Universal Relay)...");

  try {
    const response = await fetch('https://proxy.nexflowx.tech/relay/STRIPE_PT_001/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-proxy-key': 'sk_proxy_atlascore_84x91h2j7k4L2026'
      },
      // Dialeto puro da Stripe!
      body: JSON.stringify({
        amount: 2500,
        currency: 'eur',
        source: 'tok_visa', 
        description: 'Pagamento Atlas Core Checkout',
        metadata: { test_id: 'CORE_TEST_001' }
      })
    });

    const data = await response.json();
    console.log(`\n📡 Status: ${response.status} ${response.statusText}`);
    console.log("📦 Resposta de Sucesso:");
    console.dir(data, { depth: null, colors: true });

  } catch (error) {
    console.error("🚨 FALHA:", error);
  }
}

testarProxy();
