import { Request, Response, NextFunction } from 'express';

export const requireProxySecret = (req: Request, res: Response, next: NextFunction) => {
  const proxySecret = req.headers['x-proxy-secret'];
  
  if (!proxySecret || proxySecret !== process.env.INTERNAL_PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing Proxy Secret' });
  }
  
  next();
};
