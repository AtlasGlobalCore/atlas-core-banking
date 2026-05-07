import prisma from '../lib/prisma';
import { Request, Response } from 'express';




export const proxyCallback = async (req: Request, res: Response) => {
  try {
    // A Proxy devolve o nosso AtlasReference no campo 'reference_id'
    const { reference_id, status, gateway_reference } = req.body;
    const transactionId = reference_id;

    if (!transactionId || !status) {
      return res.status(400).json({ error: 'Payload de webhook inválido. Faltam parâmetros S2S.' });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { wallet: true, paymentLink: true, customer: true },
    });

    if (!transaction) return res.status(404).json({ error: 'AtlasReference não encontrado no Ledger.' });
    if (transaction.status === 'COMPLETED') return res.status(200).json({ message: 'Transação já processada.' });

    // ============================================
    // A. LEDGER: ATUALIZAR SALDOS (Incoming)
    // ============================================
    if (status === 'PAID' || status === 'COMPLETED') {
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: transactionId },
          data: { status: 'COMPLETED', proxyReference: gateway_reference || null },
        }),
        prisma.wallet.update({
          where: { id: transaction.walletId },
          data: { balanceIncoming: { increment: transaction.amount } },
        }),
      ]);

      console.log(`[LEDGER] Pagamento da Proxy (Ref: ${transactionId}) liquidado em INCOMING.`);

      // ============================================
      // B. AVISAR O MERCHANT (Se houver Webhook configurado na Loja/Link)
      // ============================================
      if (transaction.paymentLink?.webhookUrl) {
        fetch(transaction.paymentLink.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'Atlas-Core-Webhook/1.0' },
          body: JSON.stringify({
            event: 'payment.success',
            data: {
              transactionId: transaction.id,
              reference: transaction.paymentLink.description,
              amount: transaction.amount,
              currency: transaction.currency,
              customer: transaction.customer ? { name: transaction.customer.name, email: transaction.customer.email } : null
            }
          })
        }).catch(err => console.error(`[WEBHOOK OUT] Falha ao notificar o Merchant.`));
      }

      return res.status(200).json({ success: true, message: 'Conciliação S2S concluída.' });
    }

    if (status === 'FAILED' || status === 'REJECTED') {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'FAILED', proxyReference: gateway_reference || null },
      });
      return res.status(200).json({ success: true, message: 'Falha registada no Ledger.' });
    }

    return res.status(200).json({ message: 'Status ignorado.' });

  } catch (error) {
    console.error('[Webhook Error]:', error);
    return res.status(500).json({ error: 'Falha interna ao processar o webhook.' });
  }
};
