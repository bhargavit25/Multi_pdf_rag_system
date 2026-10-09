import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../../../utils/logger.js';

export class GeminiEmbeddingProvider {
  constructor(apiKey, modelName = 'text-embedding-004') {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  async getEmbedding(text) {
    if (!this.client) {
      throw new Error('Gemini API key is not configured.');
    }

    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      logger.error(`Gemini embedding error: ${error.message}`);
      throw error;
    }
  }

  async getEmbeddings(texts) {
    if (!this.client) {
      throw new Error('Gemini API key is not configured.');
    }

    const embeddings = [];
    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map((t) => this.getEmbedding(t));
      const batchResults = await Promise.all(batchPromises);
      embeddings.push(...batchResults);
    }
    return embeddings;
  }
}
