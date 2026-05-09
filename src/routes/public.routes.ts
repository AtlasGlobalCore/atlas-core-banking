import { Router } from 'express';

const router = Router();

// As rotas de checkout foram migradas para o módulo dedicado checkout.routes.ts
// Este router fica disponível para futuras rotas públicas gerais do Atlas (ex: status, catálogos)

router.get('/status', (req, res) => {
  res.json({ message: 'Public API is running' });
});

export default router;
