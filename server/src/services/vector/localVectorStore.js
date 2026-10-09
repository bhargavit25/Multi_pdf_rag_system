import fs from 'fs/promises';
import path from 'path';
import { VectorStoreInterface } from './vectorStoreInterface.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class LocalVectorStore extends VectorStoreInterface {
  constructor(options = {}) {
    super();
    this.storagePath = options.storagePath || path.join(config.vectorDbDir, 'vectors.json');
    this.vectors = new Map(); // id -> { id, embedding, document, metadata }
    this.isLoaded = false;
  }

  async initialize() {
    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      try {
        const data = await fs.readFile(this.storagePath, 'utf-8');
        const parsed = JSON.parse(data);
        this.vectors.clear();
        for (const item of parsed) {
          this.vectors.set(item.id, item);
        }
        logger.info(`LocalVectorStore loaded ${this.vectors.size} vectors from ${this.storagePath}`);
      } catch (err) {
        if (err.code === 'ENOENT') {
          // File does not exist yet
          await this.saveToFile();
          logger.info(`LocalVectorStore initialized new storage at ${this.storagePath}`);
        } else {
          logger.warn(`LocalVectorStore failed to read file: ${err.message}. Initializing empty store.`);
          this.vectors.clear();
        }
      }
      this.isLoaded = true;
      return true;
    } catch (error) {
      logger.error(`LocalVectorStore initialize error: ${error.message}`);
      throw error;
    }
  }

  async saveToFile() {
    try {
      const array = Array.from(this.vectors.values());
      const tempPath = `${this.storagePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(array, null, 2), 'utf-8');
      await fs.rename(tempPath, this.storagePath);
    } catch (error) {
      logger.error(`LocalVectorStore saveToFile failed: ${error.message}`);
    }
  }

  async addDocuments({ ids, embeddings, documents, metadatas }) {
    if (!this.isLoaded) await this.initialize();

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      this.vectors.set(id, {
        id,
        embedding: embeddings[i],
        document: documents[i],
        metadata: {
          documentId: String(metadatas[i].documentId),
          userId: String(metadatas[i].userId),
          filename: String(metadatas[i].filename),
          pageNumber: Number(metadatas[i].pageNumber),
          chunkId: String(metadatas[i].chunkId),
        },
      });
    }

    await this.saveToFile();
    logger.info(`LocalVectorStore: Stored ${ids.length} chunks (total: ${this.vectors.size})`);
    return true;
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return dot / denominator;
  }

  async similaritySearch({ queryEmbedding, queryText, topK = 5, filter = {} }) {
    if (!this.isLoaded) await this.initialize();

    const candidates = [];

    for (const item of this.vectors.values()) {
      // Filter by userId
      if (filter.userId && item.metadata.userId !== String(filter.userId)) {
        continue;
      }
      // Filter by documentId
      if (filter.documentId && item.metadata.documentId !== String(filter.documentId)) {
        continue;
      }

      // Calculate cosine similarity
      const score = this.cosineSimilarity(queryEmbedding, item.embedding);

      candidates.push({
        id: item.id,
        text: item.document,
        metadata: item.metadata,
        score: parseFloat(score.toFixed(4)),
      });
    }

    // Sort descending by similarity score
    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, topK);
  }

  async deleteDocumentVectors({ documentId, userId }) {
    if (!this.isLoaded) await this.initialize();

    let removed = 0;
    for (const [id, item] of this.vectors.entries()) {
      const matchDoc = item.metadata.documentId === String(documentId);
      const matchUser = !userId || item.metadata.userId === String(userId);

      if (matchDoc && matchUser) {
        this.vectors.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      await this.saveToFile();
    }

    logger.info(`LocalVectorStore: Removed ${removed} vectors for document ${documentId}`);
    return true;
  }

  async getStats(filter = {}) {
    if (!this.isLoaded) await this.initialize();

    let count = 0;
    for (const item of this.vectors.values()) {
      if (filter.userId && item.metadata.userId !== String(filter.userId)) continue;
      count++;
    }

    return { count, provider: 'LocalVectorStore', storagePath: this.storagePath };
  }
}
