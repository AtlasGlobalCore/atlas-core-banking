import { defineConfig } from '@prisma/config';
import { config } from 'dotenv';

// Força a leitura das variáveis do ficheiro .env
config();

export default defineConfig({
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
