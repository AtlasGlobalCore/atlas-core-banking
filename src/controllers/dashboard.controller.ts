import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export class DashboardController {
  
  static async getWallets(req: Request, res: Response) {
    try {
      const wallets = await prisma.wallet.findMany({
        // Correção do campo para fullName de acordo com o Schema
        include: { user: { select: { email: true, fullName: true, tier: true } } }
      });
      return res.status(200).json({ success: true, data: wallets });
    } catch (error: any) {
      console.error('[ATLAS CORE] Erro GET /wallets:', error.message);
      return res.status(500).json({ error: 'Erro ao ler carteiras' });
    }
  }

  static async getTransactions(req: Request, res: Response) {
    try {
      const transactions = await prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { wallet: { select: { currency: true, walletReference: true } } }
      });
      return res.status(200).json({ success: true, data: transactions });
    } catch (error: any) {
      console.error('[ATLAS CORE] Erro GET /transactions:', error.message);
      return res.status(500).json({ error: 'Erro ao ler transações' });
    }
  }
}
