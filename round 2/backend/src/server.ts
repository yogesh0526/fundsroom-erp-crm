import app from './app';
import { config } from './config/env';
import { prisma } from './config/prisma';

const startServer = async () => {
  try {
    // Verify database connectivity
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database.');

    const server = app.listen(config.PORT, '0.0.0.0', () => {
      console.log(`🚀 ERP Server running at http://localhost:${config.PORT}`);
      console.log(`📚 Swagger API Docs available at http://localhost:${config.PORT}/api-docs`);
    });

    const shutdown = async () => {
      console.log('Shutting down server gracefully...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
