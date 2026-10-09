import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { GeminiEmbeddingProvider } from './providers/geminiProvider.js';
import { OpenAIEmbeddingProvider } from './providers/openaiProvider.js';
import { LocalEmbeddingProvider } from './providers/localProvider.js';

class EmbeddingService {
  constructor() {
    this.localProvider = new LocalEmbeddingProvider();
    this.activeProviderName = config.embeddingProvider;
  }

  getProvider(overrideSettings = {}) {
    const providerName = overrideSettings.embeddingProvider || config.embeddingProvider;
    const apiKey = overrideSettings.embeddingApiKey || config.embeddingApiKey;
    const model = overrideSettings.embeddingModel || config.embeddingModel;

    if (providerName === 'openai') {
      if (apiKey) {
        return new OpenAIEmbeddingProvider(apiKey, model || 'text-embedding-3-small');
      }
      logger.warn('OpenAI embedding requested but no API key configured. Using local provider.');
      return this.localProvider;
    }

    if (providerName === 'gemini') {
      if (apiKey) {
        return new GeminiEmbeddingProvider(apiKey, model || 'text-embedding-004');
      }
      logger.warn('Gemini embedding requested but no API key configured. Using local provider.');
      return this.localProvider;
    }

    return this.localProvider;
  }

  async generateEmbedding(text, overrideSettings = {}) {
    try {
      const provider = this.getProvider(overrideSettings);
      return await provider.getEmbedding(text);
    } catch (error) {
      logger.warn(`Primary embedding provider failed: ${error.message}. Falling back to local provider.`);
      return await this.localProvider.getEmbedding(text);
    }
  }

  async generateEmbeddings(texts, overrideSettings = {}) {
    if (!texts || texts.length === 0) return [];
    try {
      const provider = this.getProvider(overrideSettings);
      return await provider.getEmbeddings(texts);
    } catch (error) {
      logger.warn(`Primary embedding batch failed: ${error.message}. Falling back to local provider.`);
      return await this.localProvider.getEmbeddings(texts);
    }
  }
}

export const embeddingService = new EmbeddingService();
