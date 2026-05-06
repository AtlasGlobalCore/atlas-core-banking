import { Request, Response, NextFunction } from 'express';

export function requireProxySecret(req: Request, res: Response, next: NextFunction) {
  const proxySecret = req.headers['x-proxy-secret'];
  const internalSecret = process.env.PROXY_INTERNAL_SECRET;

  if (!proxySecret || proxySecret !== internalSecret) {
    console.warn(`[🚨 SEGURANÇA] Tentativa de injeção bloqueada. IP: ${req.ip}`);
    return res.status(403).json({ error: 'Acesso não autorizado ao Core Ledger' });
  }

  next();
}
