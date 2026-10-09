import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory first, fallback to root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/multi_pdf_rag',
  jwtSecret: process.env.JWT_SECRET || 'multi_pdf_rag_jwt_secret_key_2025_secure_default',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // LLM Configuration
  llmProvider: process.env.LLM_PROVIDER || 'gemini', // 'gemini' | 'openai' | 'groq' | 'local'
  llmApiKey: process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'gemini-1.5-flash',
  
  // Embedding Configuration
  embeddingProvider: process.env.EMBEDDING_PROVIDER || 'gemini', // 'gemini' | 'openai' | 'local'
  embeddingApiKey: process.env.EMBEDDING_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '',
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-004',
  
  // Vector DB Configuration
  vectorStoreProvider: process.env.VECTOR_STORE_PROVIDER || 'chroma-fallback', // 'chroma' | 'local' | 'chroma-fallback'
  chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
  chromaCollection: process.env.CHROMA_COLLECTION || 'pdf_documents',
  
  // CORS & Client
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  
  // RAG and File Parameters
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '20971520', 10), // 20 MB
  chunkSize: parseInt(process.env.CHUNK_SIZE || '1000', 10),
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '150', 10),
  topK: parseInt(process.env.TOP_K || '5', 10),
  
  // Directory Paths
  uploadsDir: path.resolve(__dirname, '../../../uploads'),
  vectorDbDir: path.resolve(__dirname, '../../../vector_db'),
};
