import { Currency, TransactionType, TransactionStatus, TierLevel } from '@prisma/client';
import { prisma } from '../config/database';

interface ProxyIncomingPayload {
  walletReference: string; // Ex: seller_123_USD
  currency: Currency;
  amount: number;
  proxyReference: string;
  method: string;
}

export class LedgerService {
  static async processProxyIncoming(payload: ProxyIncomingPayload) {
    const { walletReference, currency, amount, proxyReference, method } = payload;

    // 1. Tentar encontrar a Wallet (e o seu Utilizador)
    let wallet = await prisma.wallet.findUnique({
      where: { walletReference },
      include: { user: true }
    });

    // 2. SILENT ONBOARDING (Se o Seller não existir, o Banco cria-o no momento)
    if (!wallet) {
      console.log(`[ATLAS CORE] Nova Wallet detetada (${walletReference}). Iniciando Silent Onboarding...`);
      const newUser = await prisma.user.create({
        data: {
          tier: TierLevel.TIER_0_UNVERIFIED,
          wallets: {
            create: {
              walletReference,
              currency,
            }
          }
        },
        include: { wallets: true }
      });
      wallet = newUser.wallets[0] as any;
    }

    // 3. CONSULTA AO MOTOR DE TAXAS (Fee Engine)
    // Para depósitos da Proxy, por defeito a taxa é 0 para o Seller, mas o motor deve validar.
    const feeRule = await prisma.feeSchedule.findUnique({
      where: {
        tier_transactionType_currency: {
          tier: wallet.user.tier,
          transactionType: TransactionType.PROXY_INCOMING,
          currency: currency
        }
      }
    });

    let feeApplied = 0;
    if (feeRule) {
      feeApplied = Number(feeRule.fixedFee) + (amount * Number(feeRule.percentageFee));
    }
    
    const netAmount = amount - feeApplied;

    // 4. TRANSAÇÃO ATÓMICA (ACID) - O Ledger Inviolável
    const result = await prisma.$transaction(async (tx) => {
      
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          userId: wallet.userId,
          type: TransactionType.PROXY_INCOMING,
          status: TransactionStatus.INCOMING,
          amount: amount,
          feeApplied: feeApplied,
          currency: currency,
          proxyReference: proxyReference,
          description: `Liquidação Pendente Proxy - ${method.toUpperCase()}`
        }
      });

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceIncoming: {
            increment: netAmount
          }
        }
      });

      return { transaction, updatedWallet };
    });

    return result;
  }
}
