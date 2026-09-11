import app from './app';
import { ENV } from './config/env';
import prisma from './config/prisma';

const startServer = async () => {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL Database successfully');

    app.listen(ENV.PORT, () => {
      console.log(`🚀 ERP + CRM Backend Server running on http://localhost:${ENV.PORT}`);
      console.log(`📚 API Documentation available at http://localhost:${ENV.PORT}/api/docs`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
