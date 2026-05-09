async function testarGatewayVault() {
  console.log("=========================================");
  console.log("🏦 ATLAS CORE <-> 🛡️ NEXFLOWX PROXY TEST");
  console.log("=========================================\n");

  const proxyKey = 'sk_proxy_atlascore_84x91h2j7k4L2026';
  
  // Vamos testar o túnel da Stripe
  const provider = 'STRIPE_PT_001';
  const endpoint = `https://proxy.nexflowx.tech/relay/${provider}/charges`;

  const payload = {
    amount: 5000, // 50.00 EUR (Stripe exige cêntimos)
    currency: 'eur',
    source: 'tok_visa', // Token universal de teste da Stripe
    description: 'Teste de Infraestrutura Atlas -> Proxy',
    metadata: { test_type: 'engine_validation', architect: 'nexflowx' }
  };

  console.log(`📡 Alvo: ${endpoint}`);
  console.log("📦 Enviando Carga Útil (Dialeto Stripe)...");
  console.log(payload);

  try {
    const startTime = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-proxy-key': proxyKey
      },
      body: JSON.stringify(payload)
    });

    const endTime = Date.now();
    const data = await response.json();

    console.log(`\n⏱️ Latência do Túnel: ${endTime - startTime}ms`);
    console.log(`🚦 Status HTTP da Proxy: ${response.status} ${response.statusText}`);
    
    console.log("\n🗄️ Resposta Bruta do GatewayVault (Stripe):");
    console.dir(data, { depth: null, colors: true });

  } catch (error) {
    console.error("\n🚨 Falha Crítica de Rede (O túnel está quebrado):", error);
  }
}

testarGatewayVault();
