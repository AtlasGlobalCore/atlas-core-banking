import prisma from '../lib/prisma';
import { Request, Response } from 'express';




export const releaseFunds = async (req: Request, res: Response) => {
  try {
    const { walletId, amount, transactionIds } = req.body;
    // Opcional: receber o ID do operador que aprovou a liberação
    const operatorId = req.user?.id || 'SYSTEM'; 

    if (!walletId) {
      return res.status(400).json({ error: 'O ID da carteira (Wallet) é obrigatório.' });
    }

    // 1. Buscar a carteira atual para validação de saldo
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Carteira não encontrada.' });
    }

    let releaseAmount = 0;
    let createdBatch = null;

    // ========================================================
    // CENÁRIO A: Liberação Linha a Linha (IDs Específicos)
    // ========================================================
    if (transactionIds && Array.isArray(transactionIds) && transactionIds.length > 0) {
      // Procurar as transações que ainda não foram liquidadas (batchId nulo)
      const transactionsToSettle = await prisma.transaction.findMany({
        where: {
          id: { in: transactionIds },
          walletId: walletId,
          batchId: null, // Garante que não liquidamos a mesma linha duas vezes
          status: 'COMPLETED' 
        }
      });

      if (transactionsToSettle.length === 0) {
        return res.status(400).json({ error: 'Nenhuma transação elegível para liquidação.' });
      }

      // Somar o valor exato destas linhas
      releaseAmount = transactionsToSettle.reduce((sum, tx) => sum + Number(tx.amount), 0);

      // Usar uma transação do Prisma para garantir que as alterações ocorrem em bloco
      await prisma.$transaction(async (tx) => {
        // 1. Criar o Lote de Liquidação (Settlement Batch)
        createdBatch = await tx.settlementBatch.create({
          data: {
            batchNumber: `SET-${Date.now()}-${walletId.substring(0, 5)}`,
            totalAmount: releaseAmount,
            currency: wallet.currency,
          }
        });

        // 2. Associar as linhas específicas a este lote
        await tx.transaction.updateMany({
          where: { id: { in: transactionsToSettle.map(t => t.id) } },
          data: { batchId: createdBatch.id }
        });

        // 3. Atualizar os saldos da Wallet (Move de Incoming -> Available)
        await tx.wallet.update({
          where: { id: walletId },
          data: {
            balanceIncoming: { decrement: releaseAmount },
            balanceAvailable: { increment: releaseAmount },
          }
        });
        
        // 4. Registar o movimento de liquidação no Ledger
        await tx.transaction.create({
          data: {
            walletId,
            userId: wallet.userId,
            type: 'SETTLEMENT',
            status: 'COMPLETED',
            amount: releaseAmount,
            currency: wallet.currency,
            batchId: createdBatch.id,
            description: `Liquidação Linha a Linha (Batch: ${createdBatch.batchNumber})`
          }
        });
      });

    } 
    // ========================================================
    // CENÁRIO B: Liberação Parcial (Valor Fixo) ou Total
    // ========================================================
    else if (amount && amount > 0) {
      releaseAmount = Number(amount);

      if (releaseAmount > Number(wallet.balanceIncoming)) {
        return res.status(400).json({ error: 'Saldo Incoming insuficiente para esta liberação.' });
      }

      await prisma.$transaction(async (tx) => {
        // Mover o dinheiro nas contas virtuais
        await tx.wallet.update({
          where: { id: walletId },
          data: {
            balanceIncoming: { decrement: releaseAmount },
            balanceAvailable: { increment: releaseAmount },
          }
        });

        // Criar uma entrada no Ledger a explicar a movimentação manual
        await tx.transaction.create({
          data: {
            walletId,
            userId: wallet.userId,
            type: 'SETTLEMENT',
            status: 'COMPLETED',
            amount: releaseAmount,
            currency: wallet.currency,
            description: `Liquidação Manual Parcial/Total autorizada`
          }
        });
      });
    } else {
      return res.status(400).json({ error: 'Forneça um valor parcial ou uma lista de transactionIds.' });
    }

    return res.status(200).json({
      success: true,
      message: `Liquidação de ${releaseAmount} ${wallet.currency} concluída com sucesso.`,
      batch: createdBatch,
      releasedAmount: releaseAmount
    });

  } catch (error) {
    console.error('[Settlement Error]:', error);
    return res.status(500).json({ error: 'Falha interna ao processar a liquidação.' });
  }
};
