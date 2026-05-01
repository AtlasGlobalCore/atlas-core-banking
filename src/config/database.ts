import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuração do Connection Pool para aguentar tráfego institucional
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Exportamos uma única instância para todo o banco usar
export const prisma = new PrismaClient({ adapter });
