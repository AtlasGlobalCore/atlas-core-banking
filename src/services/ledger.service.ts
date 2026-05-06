import { PrismaClient, TransactionType, TransactionStatus, TierLevel } from '@prisma/client';

const prisma = new PrismaClient();

export class LedgerService {
  /**
   * Processa a injeção de fundos da Proxy para uma carteira específica.
   */
  static async injectIncomingFunds(
    walletReference: string, 
    amountCents: number, 
    currency: any, 
    proxyTxId: string, 
    role: string
  ) {
    // 1. Converter cêntimos para formato Decimal (ex: 1845 -> 18.45)
    const amountDecimal = amountCents / 100;

    // Transação ACID Prisma: Tudo ou Nada
    return await prisma.$transaction(async (tx) => {
      
      // 2. Silent Onboarding: Procura a carteira. Se não existir, cria o Utilizador Fantasma e a Carteira.
      let wallet = await tx.wallet.findUnique({
        where: { walletReference },
        include: { user: true }
      });

      if (!wallet) {
        console.log(`[👻 SILENT ONBOARDING] A criar conta fantasma para referência: ${walletReference}`);
        const ghostUser = await tx.user.create({
          data: {
            nickname: `GHOST_${walletReference}`,
            tier: TierLevel.TIER_0_UNVERIFIED,
          }
        });

        wallet = await tx.wallet.create({
          data: {
            walletReference,
            currency: currency,
            userId: ghostUser.id
          },
          include: { user: true }
        });
      }

      // 3. Verifica se a transação já foi processada (Idempotência)
      const existingTx = await tx.transaction.findUnique({
        where: { proxyReference: proxyTxId }
      });

      if (existingTx) {
        throw new Error('Transação duplicada. Ignorando injeção.');
      }

      // 4. Regista o movimento no Ledger (INCOMING por defeito vindo da Proxy)
      const ledgerEntry = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          userId: wallet.userId,
          type: TransactionType.PROXY_INCOMING,
          status: TransactionStatus.INCOMING,
          amount: amountDecimal,
          currency: currency,
          proxyReference: proxyTxId,
          description: `Depósito Proxy [${role}]`
        }
      });

      // 5. Atualiza o saldo da Carteira (Apenas o saldo cativo/Incoming)
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceIncoming: { increment: amountDecimal }
        }
      });

      return ledgerEntry;
    });
  }
}
