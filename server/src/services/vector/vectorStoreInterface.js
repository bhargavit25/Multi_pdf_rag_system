/**
 * Base abstract interface for Vector Store implementations
 * Enables switching between ChromaDB, LocalVectorStore, Pinecone, etc.
 */
export class VectorStoreInterface {
  /**
   * Initializes connections and creates collections if needed.
   */
  async initialize() {
    throw new Error('Method initialize() must be implemented.');
  }

  /**
   * Adds or updates document chunks in the vector store.
   * @param {Object} params
   * @param {Array<string>} params.ids - Unique chunk IDs
   * @param {Array<Array<number>>} params.embeddings - Embedding vectors
   * @param {Array<string>} params.documents - Chunk text contents
   * @param {Array<Object>} params.metadatas - Metadata objects (documentId, userId, filename, pageNumber, chunkId)
   */
  async addDocuments({ ids, embeddings, documents, metadatas }) {
    throw new Error('Method addDocuments() must be implemented.');
  }

  /**
   * Searches for most similar chunks.
   * @param {Object} params
   * @param {Array<number>} params.queryEmbedding - The question embedding
   * @param {string} [params.queryText] - The raw question text
   * @param {number} [params.topK] - Number of results to return
   * @param {Object} [params.filter] - Metadata filter (e.g., { userId, documentId })
   * @returns {Promise<Array<{ id: string, text: string, metadata: Object, score: number }>>}
   */
  async similaritySearch({ queryEmbedding, queryText, topK, filter }) {
    throw new Error('Method similaritySearch() must be implemented.');
  }

  /**
   * Deletes all vectors belonging to a specific document.
   * @param {Object} params
   * @param {string} params.documentId
   * @param {string} params.userId
   */
  async deleteDocumentVectors({ documentId, userId }) {
    throw new Error('Method deleteDocumentVectors() must be implemented.');
  }

  /**
   * Gets stats about the vector store.
   */
  async getStats(filter = {}) {
    throw new Error('Method getStats() must be implemented.');
  }
}
