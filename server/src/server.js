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

// Start server
async function startServer() {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Initialize Vector Store
    try {
      await getVectorStore();
    } catch (vecErr) {
      logger.warn(`Vector store initialization warning: ${vecErr.message}`);
    }

    // 3. Listen on Port
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Multi-PDF RAG Server running on port ${config.port}`);
      logger.info(`📡 API Health: http://localhost:${config.port}/api/health`);
    });

    return server;
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Only start when directly run
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
