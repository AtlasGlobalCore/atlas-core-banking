import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export class AuthController {
  
  static async login(req: Request, res: Response) {
    try {
      // Recebemos o valor do input (pode ser email ou nickname do WillBW)
      const { email, password } = req.body;
      const loginIdentifier = email; 

      if (!loginIdentifier || !password) {
        return res.status(400).json({ error: 'Credenciais são obrigatórias.' });
      }

      // 1. Procurar por Email ou Nickname (Acomoda o WillBW)
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: loginIdentifier },
            { nickname: loginIdentifier }
          ]
        }
      });

      // God Mode
      if (!user && loginIdentifier === 'admin@atlas.com') {
        return res.status(200).json({
          token: 'atlas_master_token_2026',
          user: {
            id: 'master-admin',
            email: 'admin@atlas.com',
            name: 'Atlas Admin',
            role: 'admin' // CORRIGIDO: admin (para o menu aparecer)
          }
        });
      }

      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas. Utilizador não encontrado.' });
      }

      return res.status(200).json({
        token: `mock_jwt_token_for_${user.id}`, 
        user: {
          id: user.id,
          email: user.email,
          name: user.fullName || user.nickname || 'Utilizador', // Adaptação ao schema
          role: 'merchant', // Assumimos merchant por defeito
          tier: user.tier || 'TIER_1'
        }
      });

    } catch (error: any) {
      console.error('[ATLAS CORE] Erro no Login:', error.message);
      return res.status(500).json({ error: 'Erro interno no motor.' });
    }
  }

  static async register(req: Request, res: Response) { return res.status(200).json({ message: 'OK' }); }
  static async verifyEmail(req: Request, res: Response) { return res.status(200).json({ message: 'OK' }); }
  
  static async getCurrentUser(req: Request, res: Response) {
    return res.status(200).json({
      user: { id: 'current-session', email: 'admin@atlas.com', name: 'Atlas Admin', role: 'admin' }
    });
  }
}
