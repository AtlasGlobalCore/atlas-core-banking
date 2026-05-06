import { Request, Response } from 'express';
import { prisma } from '../config/database';

export class StatementController {
  static async getDailyStatements(req: Request, res: Response) {
    try {
      const { wallet_reference } = req.query;

      if (!wallet_reference) {
        return res.status(400).json({ error: 'Missing wallet_reference query parameter' });
      }

      // 1. Validar a Carteira e as suas permissões
      const wallet = await prisma.wallet.findUnique({
        where: { walletReference: String(wallet_reference) },
        include: { user: true }
      });

      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      // 2. A "Materialized View" Dinâmica: Agrupar por Dia, Tipo e Estado
      // Usamos $queryRaw para aceder ao poder total do PostgreSQL (DATE_TRUNC)
      const dailyStatements: any = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', "createdAt") as "date",
          "type",
          "status",
          SUM("amount") as "totalVolume",
          COUNT("id")::int as "transactionCount"
        FROM "Transaction"
        WHERE "walletId" = ${wallet.id}
        GROUP BY DATE_TRUNC('day', "createdAt"), "type", "status"
        ORDER BY "date" DESC
        LIMIT 30;
      `;

      // 3. Formatar a saída para o Frontend consumir facilmente
      const formattedStatements = dailyStatements.map((statement: any) => ({
        date: statement.date.toISOString().split('T')[0], // Retorna apenas YYYY-MM-DD
        type: statement.type,
        status: statement.status,
        total_volume: Number(statement.totalVolume).toFixed(2),
        transaction_count: statement.transactionCount,
        description: statement.type === 'PROXY_INCOMING' 
          ? `Lote de Depósitos (NEXOR)` 
          : `Lote de Saídas / Payouts`
      }));

      return res.status(200).json({
        success: true,
        wallet_reference: wallet.walletReference,
        currency: wallet.currency,
        tier: wallet.user.tier,
        statements: formattedStatements
      });

    } catch (error: any) {
      console.error('[ATLAS CORE] Erro ao gerar Statement:', error.message);
      return res.status(500).json({ error: 'Internal Banking Error', details: error.message });
    }
  }
}
