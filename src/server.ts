import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import internalRoutes from './routes/internal.routes';
import publicRoutes from './routes/public.routes';
import webhookRoutes from './routes/webhook.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8083;

// Adicionamos os domínios de Checkout à lista de permissões
const allowedOrigins = [
  'https://api.atlasglobal.digital',
  'https://dashboard.atlasglobal.digital',
  'https://wallet.atlasglobal.digital',
  'https://pay.atlasglobal.digital',
  'https://pay.nexflowx.tech',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sem origin (como Postman/Webhooks) ou que estejam na lista
    if (!origin || allowedOrigins.includes(origin)) callback(null, origin || '*');
    else callback(new Error('Acesso bloqueado pela Política de CORS do Atlas Core'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-proxy-secret'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'Atlas Core Banking Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 🛣️ REGISTO MODULAR DE ROTAS
// ==========================================
app.use('/api/internal', internalRoutes); // Tráfego da Proxy
app.use('/api/public', publicRoutes);     // Tráfego Público (Checkout Headless API)
app.use('/api/webhooks', webhookRoutes);  // Callbacks de Pagamento (Mistic, Stripe, etc.)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏦 Atlas Core Banking ON (Port ${PORT})`);
});
