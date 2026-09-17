import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_QPlBtLD6if5T@ep-blue-moon-a55dxwpe-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&schema=erp_round2',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-wholesale-erp-crm-2026-industrial-supply',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};
