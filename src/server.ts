import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import internalRoutes from './routes/internal.routes';
import publicRoutes from './routes/public.routes';
import webhookRoutes from './routes/webhook.routes';
import checkoutRoutes from './routes/checkout.routes';
import dashboardRoutes from './routes/dashboard.routes';
import authRoutes from './routes/auth.routes'; // ✨ Importamos as novas rotas de Auth

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
    else callback(new Error('CORS Blocked by Atlas Policy'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-proxy-secret'],
  credentials: true
}));

app.use(express.json());

// Endpoint de Health Check (v2.5.0)
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'Atlas Global Core Engine',
    version: '2.5.0',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 🛣️ MAPEAMENTO DE ROTAS (Padrão v1)
// ==========================================
app.use('/api/v1/auth', authRoutes);         // 🔐 Agora /api/v1/auth/login vai funcionar!
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/internal', internalRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏦 Atlas Global Core ON (Port ${PORT})`);
});
