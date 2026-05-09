import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import internalRoutes from './routes/internal.routes';
import publicRoutes from './routes/public.routes';
import webhookRoutes from './routes/webhook.routes';
import checkoutRoutes from './routes/checkout.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8083;

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
app.use('/api/checkout', checkoutRoutes);
app.use('/api/checkout', checkoutRoutes);
// ==========================================
app.use('/api/internal', internalRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/checkout', checkoutRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏦 Atlas Core Banking ON (Port ${PORT})`);
});
