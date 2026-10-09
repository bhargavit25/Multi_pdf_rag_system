import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { ChromaVectorStore } from './chromaVectorStore.js';
import { LocalVectorStore } from './localVectorStore.js';

let vectorStoreInstance = null;

export async function getVectorStore() {
  if (vectorStoreInstance) {
    return vectorStoreInstance;
  }

  const provider = config.vectorStoreProvider;
  logger.info(`Initializing vector store with provider config: "${provider}"`);

  if (provider === 'chroma') {
    const chroma = new ChromaVectorStore();
    try {
      await chroma.initialize();
      vectorStoreInstance = chroma;
      return vectorStoreInstance;
    } catch (error) {
      logger.error(`ChromaDB was explicitly configured but failed to connect: ${error.message}`);
      throw error;
    }
  }

  if (provider === 'chroma-fallback') {
    const chroma = new ChromaVectorStore();
    try {
      await chroma.initialize();
      logger.info('Connected to ChromaDB as primary vector store.');
      vectorStoreInstance = chroma;
      return vectorStoreInstance;
    } catch (error) {
      logger.warn(`ChromaDB is not reachable at ${config.chromaUrl} (${error.message}). Falling back to built-in LocalVectorStore.`);
      const local = new LocalVectorStore();
      await local.initialize();
      vectorStoreInstance = local;
      return vectorStoreInstance;
    }
  }

  // Default: local
  const local = new LocalVectorStore();
  await local.initialize();
  vectorStoreInstance = local;
  return vectorStoreInstance;
}
