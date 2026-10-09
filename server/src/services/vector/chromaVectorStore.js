import { ChromaClient } from 'chromadb';
import { VectorStoreInterface } from './vectorStoreInterface.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class ChromaVectorStore extends VectorStoreInterface {
  constructor(options = {}) {
    super();
    this.url = options.url || config.chromaUrl;
    this.collectionName = options.collectionName || config.chromaCollection;
    this.client = null;
    this.collection = null;
    this.isReady = false;
  }

  async initialize() {
    try {
      this.client = new ChromaClient({ path: this.url });
      // Test heartbeat / connection
      await this.client.heartbeat();
      
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { 'hnsw:space': 'cosine' },
      });

      this.isReady = true;
      logger.info(`ChromaVectorStore connected successfully at ${this.url}, collection: ${this.collectionName}`);
      return true;
    } catch (error) {
      this.isReady = false;
      logger.warn(`ChromaVectorStore connection failed at ${this.url}: ${error.message}`);
      throw error;
    }
  }

  async addDocuments({ ids, embeddings, documents, metadatas }) {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      // Chroma requires metadata values to be string, number, or boolean
      const cleanMetadatas = metadatas.map((m) => ({
        documentId: String(m.documentId),
        userId: String(m.userId),
        filename: String(m.filename),
        pageNumber: Number(m.pageNumber),
        chunkId: String(m.chunkId),
      }));

      await this.collection.upsert({
        ids,
        embeddings,
        documents,
        metadatas: cleanMetadatas,
      });

      logger.info(`ChromaVectorStore: Upserted ${ids.length} chunks`);
      return true;
    } catch (error) {
      logger.error(`ChromaVectorStore addDocuments failed: ${error.message}`);
      throw error;
    }
  }

  async similaritySearch({ queryEmbedding, queryText, topK = 5, filter = {} }) {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      const where = {};
      if (filter.userId) {
        where.userId = String(filter.userId);
      }
      if (filter.documentId) {
        where.documentId = String(filter.documentId);
      }

      const queryParams = {
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
      };

      if (Object.keys(where).length > 0) {
        queryParams.where = where;
      }

      const response = await this.collection.query(queryParams);

      const results = [];
      const ids = response.ids[0] || [];
      const documents = response.documents[0] || [];
      const metadatas = response.metadatas[0] || [];
      const distances = response.distances ? response.distances[0] || [] : [];

      for (let i = 0; i < ids.length; i++) {
        // Distance in cosine space is (1 - cosine_similarity), convert to similarity score
        const distance = distances[i] !== undefined ? distances[i] : 1;
        const score = Math.max(0, 1 - distance);

        results.push({
          id: ids[i],
          text: documents[i],
          metadata: metadatas[i],
          score: parseFloat(score.toFixed(4)),
        });
      }

      return results;
    } catch (error) {
      logger.error(`ChromaVectorStore similaritySearch failed: ${error.message}`);
      throw error;
    }
  }

  async deleteDocumentVectors({ documentId, userId }) {
    if (!this.collection) {
      await this.initialize();
    }

    try {
      const where = { documentId: String(documentId) };
      if (userId) {
        where.userId = String(userId);
      }

      await this.collection.delete({ where });
      logger.info(`ChromaVectorStore: Deleted vectors for document ${documentId}`);
      return true;
    } catch (error) {
      logger.error(`ChromaVectorStore deleteDocumentVectors failed: ${error.message}`);
      throw error;
    }
  }

  async getStats(filter = {}) {
    if (!this.collection) {
      await this.initialize();
    }
    const count = await this.collection.count();
    return { count, provider: 'ChromaDB', url: this.url };
  }
}
