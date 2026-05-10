import { app } from './app';
import { env } from './config/environment';
import { prisma } from './config/database';

const startServer = async () => {
  try {
    await prisma.$connect();
    // eslint-disable-next-line no-console
    console.log('✅ Database connected successfully');

    app.listen(env.PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`🚀 Server running on port ${env.PORT}`);
      // eslint-disable-next-line no-console
      console.log(`📝 Environment: ${env.NODE_ENV}`);
      // eslint-disable-next-line no-console
      console.log(`🔗 API URL: http://localhost:${env.PORT}/api/v1`);
      // eslint-disable-next-line no-console
      console.log(`💚 Health check: http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async () => {
  // eslint-disable-next-line no-console
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startServer();
