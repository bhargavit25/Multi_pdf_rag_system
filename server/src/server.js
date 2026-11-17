import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { getVectorStore } from './services/vector/index.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import summaryRoutes from './routes/summaryRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import flashcardRoutes from './routes/flashcardRoutes.js';
import { seedDatabase } from './utils/seed.js';

const app = express();

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or from clientUrl
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for local dev
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  if (req.path !== '/api/health') {
    logger.info(`${req.method} ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api', healthRoutes);

// 404 Route handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use(errorHandler);

let activeServer = null;

// Graceful shutdown helper
const handleShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down server gracefully...`);
  if (activeServer && typeof activeServer.close === 'function') {
    await new Promise((resolve) => activeServer.close(resolve));
  }
  try {
    const mongoose = await import('mongoose');
    await mongoose.default.disconnect();
  } catch {
    // silent disconnect
  }
  process.exit(0);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

// Start server
export function startServer(port = config.port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);

    server.once('listening', async () => {
      activeServer = server;
      logger.info(`🚀 Multi-PDF RAG Server running on port ${port}`);
      logger.info(`📡 API Health: http://localhost:${port}/api/health`);

      try {
        // 1. Connect MongoDB
        await connectDB();

        // 2. Initialize Vector Store
        try {
          await getVectorStore();
        } catch (vecErr) {
          logger.warn(`Vector store initialization warning: ${vecErr.message}`);
        }

        // 3. Auto-seed demo account & sample document if missing
        seedDatabase().catch((seedErr) => {
          logger.warn(`Auto-seed warning: ${seedErr.message}`);
        });

        resolve(server);
      } catch (startupErr) {
        logger.error(`Database or startup task failed: ${startupErr.message}`);
        server.close();
        reject(startupErr);
      }
    });

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(
          `Port ${port} is already in use (EADDRINUSE).\n` +
          `Another instance of Multi-PDF RAG Server or another process is already listening on port ${port}.\n` +
          `\n` +
          `To resolve this conflict:\n` +
          `  1. Stop the process occupying port ${port} manually:\n` +
          `     In PowerShell, run:\n` +
          `       Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force\n` +
          `     OR\n` +
          `  2. Specify a different port in your .env file:\n` +
          `       PORT=5001\n` +
          `     (and ensure client/vite.config.js proxy or VITE_BACKEND_URL points to the new port).`
        );
      } else {
        logger.error(`Server failed to start on port ${port}: ${error.message}`);
      }
      reject(error);
    });
  });
}

// Only start when directly run as main entrypoint
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('server.js') ||
  process.argv[1].endsWith('server')
);

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  startServer().catch((_err) => {
    process.exit(1);
  });
}

export { app };
export default app;
