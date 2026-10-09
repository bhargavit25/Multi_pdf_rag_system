import crypto from 'crypto';

/**
 * High-performance deterministic dense embedding provider (384-dimensional)
 * for offline, demo, and zero-external-dependency fallback environments.
 * Uses subword tokenization, hashed feature mapping, and L2 normalization.
 */
export class LocalEmbeddingProvider {
  constructor(dimensions = 384) {
    this.dimensions = dimensions;
  }

  async getEmbedding(text) {
    return this.generateVector(text);
  }

  async getEmbeddings(texts) {
    return texts.map((t) => this.generateVector(t));
  }

  generateVector(text) {
    const vector = new Float32Array(this.dimensions).fill(0);
    const cleaned = (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const tokens = cleaned.split(/\s+/).filter((t) => t.length > 1);

    if (tokens.length === 0) {
      return Array.from(vector);
    }

    // Unigrams and Bigrams
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      this.hashAndAccumulate(vector, token, 1.0);

      // Character n-grams for typo & morphology tolerance
      if (token.length > 3) {
        for (let j = 0; j <= token.length - 3; j++) {
          this.hashAndAccumulate(vector, token.slice(j, j + 3), 0.3);
        }
      }

      // Word bigrams for local context
      if (i < tokens.length - 1) {
        const bigram = `${token}_${tokens[i + 1]}`;
        this.hashAndAccumulate(vector, bigram, 1.5);
      }
    }

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < this.dimensions; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    return Array.from(vector);
  }

  hashAndAccumulate(vector, str, weight) {
    const hash = crypto.createHash('md5').update(str).digest();
    const index = Math.abs(hash.readInt32LE(0)) % this.dimensions;
    const sign = hash[4] % 2 === 0 ? 1 : -1;
    vector[index] += sign * weight;
  }
}
