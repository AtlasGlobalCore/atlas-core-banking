async function gerarCheckoutStripe() {
  console.log("=========================================");
  console.log("🛡️ NEXFLOWX PROXY: GERADOR DE CHECKOUT LINK");
  console.log("=========================================\n");

  const proxyKey = 'sk_proxy_atlascore_84x91h2j7k4L2026';
  const provider = 'STRIPE_PT_001';
  
  // Como é um Universal Relay, apontamos para o endpoint oficial da Stripe: v1/checkout/sessions
  const endpoint = `https://proxy.nexflowx.tech/relay/${provider}/v1/checkout/sessions`;

  // Payload no formato que a Stripe exige para criar uma sessão
  const payload = {
    mode: 'payment',
    success_url: 'https://atlasglobal.digital/success',
    cancel_url: 'https://atlasglobal.digital/cancel',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          unit_amount: 100, // 1 EUR = 100 cêntimos
          product_data: {
            name: 'Teste Rápido Proxy - 1 Euro'
          }
        },
        quantity: 1
      }
    ]
  };

  console.log(`📡 Disparando para o Nó: ${provider}`);
  console.log(`🔗 Endpoint Relay: /v1/checkout/sessions\n`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-proxy-key': proxyKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    console.log(`🚦 Status HTTP: ${response.status} ${response.statusText}`);
    
    if (data.url) {
      console.log("\n✅ SUCESSO! Link de Pagamento Gerado:");
      console.log(`👉 ${data.url} 👈`);
      console.log("\nCopie e cole este link no browser para ver o ecrã da Stripe!");
    } else {
      console.log("\n🗄️ Resposta Bruta (Erro na Stripe/Proxy):");
      console.dir(data, { depth: null, colors: true });
    }

  } catch (error) {
    console.error("🚨 Falha de Rede:", error);
  }
}

gerarCheckoutStripe();
