import { Request, Response } from 'express';
import { LedgerService } from '../services/ledger.service';

export class WebhookController {
  static async handleProxyWebhook(req: Request, res: Response) {
    try {
      const { event_type, currency, proxy_transaction_id, settlements } = req.body;

      if (event_type !== 'wallet.incoming') {
        return res.status(400).json({ error: 'Evento não suportado' });
      }

      console.log(`\n[📥 ATLAS CORE RECEBEU] ProxyTxID: ${proxy_transaction_id}`);

      const results = [];

      // Processar cada "settlement"
      for (const settlement of settlements) {
        try {
          const tx = await LedgerService.injectIncomingFunds(
            settlement.wallet_reference,
            settlement.amount_usdt_cents,
            currency,
            `${proxy_transaction_id}_${settlement.role}`, // Sufixo para unicidade
            settlement.role
          );
          results.push({ role: settlement.role, status: 'SUCCESS', transaction_id: tx.id });
          console.log(`[✅ SUCESSO] Injetado ${settlement.amount_usdt_cents / 100} ${currency} na wallet ${settlement.wallet_reference}`);
        } catch (err: any) {
          console.error(`[⚠️ IGNORADO] Erro na wallet ${settlement.wallet_reference}:`, err.message);
          results.push({ role: settlement.role, status: 'SKIPPED', reason: err.message });
        }
      }

      return res.status(200).json({ status: 'ACKNOWLEDGED', results });

    } catch (error: any) {
      console.error('[🚨 ERRO CRÍTICO WEBHOOK]', error);
      return res.status(500).json({ error: 'Falha no processamento interno do Ledger' });
    }
  }
}
