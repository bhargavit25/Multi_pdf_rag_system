import { embeddingService } from '../embeddings/embeddingService.js';
import { getVectorStore } from '../vector/index.js';
import { llmService } from './llmService.js';
import { buildContextString, buildPromptWithContext } from './promptTemplates.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

/**
 * Execute the end-to-end Retrieval-Augmented Generation pipeline.
 *
 * @param {Object} params
 * @param {string} params.question - The user query
 * @param {string} params.userId - Authenticated user's ID
 * @param {Array<string>} [params.documentIds] - Optional specific documents to constrain search to
 * @param {Array<Object>} [params.conversationHistory] - Previous turns for multi-turn context
 * @param {Object} [params.userPreferences] - Optional user API keys/model preferences
 * @param {number} [params.topK] - Number of chunks to retrieve
 * @returns {Promise<{ answer: string, sources: Array<Object>, retrievedChunkCount: number }>}
 */
export async function executeRagPipeline({
  question,
  userId,
  documentIds = [],
  conversationHistory = [],
  userPreferences = {},
  topK = config.topK,
}) {
  logger.rag(`Processing RAG query for user ${userId}: "${question.slice(0, 80)}..."`);

  // Step 1: Generate embedding for user question
  const queryEmbedding = await embeddingService.generateEmbedding(question, userPreferences);

  // Step 2: Query vector store for topK relevant chunks
  const vectorStore = await getVectorStore();
  
  const searchFilter = { userId: String(userId) };
  if (documentIds && documentIds.length === 1) {
    searchFilter.documentId = String(documentIds[0]);
  }

  const rawChunks = await vectorStore.similaritySearch({
    queryEmbedding,
    queryText: question,
    topK: topK * (documentIds && documentIds.length > 1 ? 2 : 1), // Fetch slightly more if filtering across subset
    filter: searchFilter,
  });

  // If specific multiple documentIds were supplied, filter in-memory
  let relevantChunks = rawChunks;
  if (documentIds && documentIds.length > 1) {
    const docIdSet = new Set(documentIds.map((id) => String(id)));
    relevantChunks = rawChunks.filter((chunk) => docIdSet.has(String(chunk.metadata.documentId)));
  }

  // Deduplicate and trim to topK
  relevantChunks = relevantChunks.slice(0, topK);

  logger.rag(`Retrieved ${relevantChunks.length} relevant chunks for query`);

  // Step 3: If no chunks retrieved at all, return immediate friendly message
  if (relevantChunks.length === 0) {
    return {
      answer: "I couldn't find any relevant information in your uploaded documents. Please ensure you have uploaded documents and they have completed processing.",
      sources: [],
      retrievedChunkCount: 0,
    };
  }

  // Step 4: Construct context string and prompt
  const contextString = buildContextString(relevantChunks);
  const prompt = buildPromptWithContext(question, contextString, conversationHistory);

  // Step 5: Call LLM to synthesize answer
  const answer = await llmService.generateAnswer({
    prompt,
    chunks: relevantChunks,
    question,
    userPreferences,
  });

  // Step 6: Format source citations
  const seenSources = new Set();
  const sources = [];

  for (const chunk of relevantChunks) {
    const sourceKey = `${chunk.metadata.documentId}_${chunk.metadata.pageNumber}_${chunk.metadata.chunkId}`;
    if (!seenSources.has(sourceKey)) {
      seenSources.add(sourceKey);
      sources.push({
        documentId: chunk.metadata.documentId,
        filename: chunk.metadata.filename,
        pageNumber: Number(chunk.metadata.pageNumber),
        chunkId: chunk.metadata.chunkId,
        previewText: chunk.text.slice(0, 180) + (chunk.text.length > 180 ? '...' : ''),
        score: chunk.score,
      });
    }
  }

  return {
    answer,
    sources,
    retrievedChunkCount: relevantChunks.length,
  };
}
