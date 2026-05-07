import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    tier: string;
    organizationId?: string;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Não autorizado', 
      details: 'Token JWT ausente no cabeçalho Authorization.' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.ATLAS_JWT_SECRET;
    if (!secret) {
      throw new Error('ATLAS_JWT_SECRET não configurado no servidor.');
    }

    const decoded = jwt.verify(token, secret) as any;

    req.user = {
      id: decoded.id,
      role: decoded.role || 'CUSTOMER',
      tier: decoded.tier || 'TIER_0_UNVERIFIED',
      organizationId: decoded.organizationId
    };

    next();
  } catch (error) {
    return res.status(403).json({ 
      error: 'Acesso Negado', 
      details: 'Token JWT inválido ou expirado. Faça login novamente.' 
    });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acesso Negado', 
        details: 'O seu perfil não tem permissões para esta operação.' 
      });
    }
    next();
  };
};
