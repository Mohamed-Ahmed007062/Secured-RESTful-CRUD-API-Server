import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

async function bootstrap() {
  try {
    // 1. Establish and verify active SQL database connection
    await connectDatabase();

    // 2. Initialize Express application
    const app = createApp();

    // 3. Start listening
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
      console.log(`📑 Swagger Documentation available at: http://localhost:${env.PORT}/api-docs`);
      console.log(`🩺 Health Check endpoint available at: http://localhost:${env.PORT}/health`);
    });

    // 4. Graceful Shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Commencing graceful server shutdown...`);
      server.close(async () => {
        console.log('🔒 Closed HTTP server connections.');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown if taking too long
      setTimeout(() => {
        console.error('⚠️ Forcing server shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    process.on('unhandledRejection', (reason: Error) => {
      console.error('💥 Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error: Error) => {
      console.error('💥 Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
  } catch (error) {
    console.error('❌ Server startup failure:', error);
    process.exit(1);
  }
}

bootstrap();
