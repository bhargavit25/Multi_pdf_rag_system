import OpenAI from 'openai';
import { logger } from '../../../utils/logger.js';

export class OpenAIEmbeddingProvider {
  constructor(apiKey, modelName = 'text-embedding-3-small') {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async getEmbedding(text) {
    const results = await this.getEmbeddings([text]);
    return results[0];
  }

  async getEmbeddings(texts) {
    if (!this.client) {
      throw new Error('OpenAI API key is not configured.');
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.modelName,
        input: texts,
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
      logger.error(`OpenAI embedding error: ${error.message}`);
      throw error;
    }
  }
}
