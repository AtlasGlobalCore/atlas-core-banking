import { Request, Response } from 'express';
import { PrismaClient, Currency, TransactionType, TransactionStatus, TierLevel, AccountStatus } from '@prisma/client';
import { prisma } from '../config/database';

export class WebhookController {
  static async handleProxyIncoming(req: Request, res: Response) {
    try {
      const payload = req.body;

      if (payload.event_type !== 'wallet.incoming' || payload.currency !== 'USDT') {
        return res.status(400).json({ error: 'Ignored: Invalid event type or currency' });
      }

      if (!payload.settlements || !Array.isArray(payload.settlements)) {
        return res.status(400).json({ error: 'Missing critical ledger fields (settlements array)' });
      }

      await prisma.$transaction(async (tx) => {
        let index = 0;
        for (const settlement of payload.settlements) {
          index++;
          
          // A Referência Única do Movimento (A sua nexor_reference)
          const movementReference = `${payload.proxy_transaction_id}_${settlement.role}_${index}`;
          const amountDecimal = settlement.amount_usdt_cents / 100;

          // 🛡️ ESCUDO DE IDEMPOTÊNCIA: Verifica se este pagamento exato já foi processado hoje, ontem ou no ano passado
          const existingTransaction = await tx.transaction.findUnique({
            where: { proxyReference: movementReference }
          });

          if (existingTransaction) {
            console.log(`[♻️ IDEMPOTÊNCIA] O movimento ${movementReference} já foi liquidado. Ignorando duplicado.`);
            continue; // Pula este settlement específico sem dar erro e sem duplicar o dinheiro
          }

          // Busca ou Cria a Carteira (A Referência Única do Beneficiário)
          let wallet = await tx.wallet.findUnique({
            where: { walletReference: settlement.wallet_reference }
          });

          if (!wallet) {
            console.log(`[🏦 ATLAS CORE] Criando novo Seller para: ${settlement.wallet_reference}`);
            
            let org = await tx.organization.findUnique({ where: { name: 'NEXOR' } });
            if (!org) {
              org = await tx.organization.create({ data: { name: 'NEXOR' } });
            }

            const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const genNickname = `NeXor_${randomCode}`;
            const genPassword = `NeX-${randomCode.toLowerCase()}@2026`;

            const newUser = await tx.user.create({
              data: {
                nickname: genNickname,
                passwordHash: genPassword,
                organizationId: org.id,
                tier: TierLevel.TIER_0_UNVERIFIED,
                status: AccountStatus.ACTIVE,
                requiresPasswordChange: true
              }
            });

            wallet = await tx.wallet.create({
              data: {
                walletReference: settlement.wallet_reference,
                userId: newUser.id,
                currency: Currency.USDT,
                balanceIncoming: 0,
                balancePending: 0,
                balanceAvailable: 0,
                balanceBlocked: 0
              }
            });
            console.log(`[🔑 CREDENCIAIS GERADAS] ID: ${genNickname} | Senha: ${genPassword}`);
          }

          // A. Registo na Tabela de Transações
          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              userId: wallet.userId,
              type: TransactionType.PROXY_INCOMING,
              status: TransactionStatus.INCOMING,
              amount: amountDecimal,
              currency: Currency.USDT,
              proxyReference: movementReference, // O carimbo que impede futuras duplicações
              description: `Incoming via Proxy (${settlement.role}) - Aguarda Clearing Manual`
            }
          });

          // B. Atualização Atómica do Cofre
          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              balanceIncoming: {
                increment: amountDecimal
              }
            }
          });
        }
      });

      console.log(`[💰 ATLAS CORE] Ingestão Concluída (USDT). Tx: ${payload.proxy_transaction_id}`);

      return res.status(201).json({
        success: true,
        message: 'Ledger updated safely (Idempotency Guaranteed)',
        proxy_transaction_id: payload.proxy_transaction_id
      });

    } catch (error: any) {
      console.error('[ATLAS CORE] Ledger Error:', error.message);
      return res.status(500).json({ error: 'Internal Banking Error', details: error.message });
    }
  }
}
