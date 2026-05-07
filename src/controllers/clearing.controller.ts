import prisma from '../lib/prisma';
import { Request, Response } from 'express';
import { TransactionType, TransactionStatus, Currency } from '@prisma/client';
import { prisma } from '../config/database';

export class ClearingController {
  static async settleWallet(req: Request, res: Response) {
    try {
      const { wallet_reference } = req.body;

      if (!wallet_reference) {
        return res.status(400).json({ error: 'Missing wallet_reference' });
      }

      await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({
          where: { walletReference: wallet_reference }
        });

        if (!wallet) throw new Error('Wallet not found');
        if (wallet.balanceIncoming.lte(0)) throw new Error('No pending incoming funds to clear');

        const amountToClear = wallet.balanceIncoming;

        // 1. Zera o Cativo e move para o Disponível
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balanceIncoming: 0,
            balanceAvailable: { increment: amountToClear }
          }
        });

        // 2. Regista o Movimento Interno de Clearing
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            userId: wallet.userId,
            type: TransactionType.SETTLEMENT,
            status: TransactionStatus.COMPLETED,
            amount: amountToClear,
            currency: wallet.currency,
            description: `Manual Clearing: Moved ${amountToClear} ${wallet.currency} from Incoming to Available`
          }
        });
      });

      return res.status(200).json({ success: true, message: `Funds successfully cleared for ${wallet_reference}` });

    } catch (error: any) {
      return res.status(500).json({ error: 'Clearing failed', details: error.message });
    }
  }
}
