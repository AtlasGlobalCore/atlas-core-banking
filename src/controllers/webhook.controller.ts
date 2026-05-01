import { Request, Response } from 'express';
import { LedgerService } from '../services/ledger.service';
import { Currency } from '@prisma/client';

export class WebhookController {
  static async handleProxyIncoming(req: Request, res: Response) {
    try {
      const payload = req.body;

      if (payload.status !== 'PAID') {
        return res.status(200).json({ message: 'Ignored: Status is not PAID' });
      }

      // Validação rigorosa dos campos enviados pela NEXOR Proxy
      if (!payload.wallet_reference || !payload.currency || !payload.amount) {
        return res.status(400).json({ error: 'Missing critical ledger fields (wallet_reference, amount, currency)' });
      }

      const result = await LedgerService.processProxyIncoming({
        walletReference: payload.wallet_reference,
        currency: payload.currency as Currency,
        amount: parseFloat(payload.amount),
        proxyReference: payload.reference,
        method: payload.method || 'unknown'
      });

      return res.status(201).json({ 
        success: true, 
        message: 'Ledger updated: Funds marked as INCOMING',
        wallet: result.updatedWallet.walletReference,
        newIncomingBalance: result.updatedWallet.balanceIncoming
      });

    } catch (error: any) {
      console.error('[ATLAS CORE] Ledger Error:', error.message);
      return res.status(500).json({ error: 'Internal Banking Error', details: error.message });
    }
  }
}
