import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export class PayoutController {
  
  static async requestPayout(req: Request, res: Response) {
    try {
      const { wallet_reference, amount, currency, method, destination } = req.body;

      if (!wallet_reference || !amount || !currency || !method || !destination) {
        return res.status(400).json({ error: 'Payload incompleto. Verifique a documentação.' });
      }

      if (amount <= 0) {
        return res.status(400).json({ error: 'O montante deve ser superior a zero.' });
      }

      const wallet = await prisma.wallet.findUnique({
        where: { walletReference: wallet_reference },
        include: { user: { select: { id: true, nickname: true, email: true } } }
      });

      if (!wallet) return res.status(404).json({ error: 'Carteira não encontrada.' });

      if (wallet.balanceAvailable < amount) {
        return res.status(400).json({ 
          error: 'Saldo insuficiente.',
          details: { requested: amount, available: wallet.balanceAvailable }
        });
      }

      const isCrypto = method === 'CRYPTO';
      const feePercentage = isCrypto ? 0 : 0.03; 
      
      const feeAmount = Number((amount * feePercentage).toFixed(2));
      const netAmountSent = Number((amount - feeAmount).toFixed(2)); 

      // Construir o sumário para a coluna nativa 'description'
      const destInfo = destination.pix_key || destination.iban || destination.address || 'N/A';
      const holderInfo = destination.holder_name || 'N/A';
      const payoutDescription = `Saque via ${method} | Destino: ${destInfo} | Titular: ${holderInfo} | Valor Líquido: ${netAmountSent} ${currency}`;

      const result = await prisma.$transaction(async (tx) => {
        
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balanceAvailable: { decrement: amount },
            ...(isCrypto ? {} : { balancePending: { increment: amount } }) 
          }
        });

        const transaction = await tx.transaction.create({
          data: {
            wallet: { connect: { id: wallet.id } }, 
            user: { connect: { id: wallet.user.id } }, 
            type: 'PAYOUT' as any, // Forçamos o type-casting para evitar problemas de linting do Enum
            status: isCrypto ? 'PROCESSING' : ('PENDING' as any),
            amount: -amount, 
            currency: currency as any,
            feeApplied: feeAmount, // 🔗 Usando a coluna nativa do Schema!
            description: payoutDescription // 🔗 Usando a coluna nativa para detalhes!
          }
        });

        return { transaction, updatedWallet };
      });

      return res.status(200).json({
        success: true,
        message: isCrypto ? 'Saque automático iniciado.' : 'Ticket manual gerado na tesouraria.',
        data: {
          transaction_id: result.transaction.id,
          status: result.transaction.status,
          gross_amount_deducted: amount,
          net_amount_to_receive: netAmountSent,
          fee_charged: feeAmount,
          net_balance_remaining: result.updatedWallet.balanceAvailable
        }
      });

    } catch (error: any) {
      console.error('[ATLAS CORE] Erro no Payout:', error.message);
      return res.status(500).json({ error: 'Erro interno no motor de saques.' });
    }
  }
}
