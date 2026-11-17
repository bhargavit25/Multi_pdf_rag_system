import { embeddingService } from '../embeddings/embeddingService.js';
import { getVectorStore } from '../vector/index.js';
import { llmService } from './llmService.js';
import { buildContextString, buildPromptWithContext } from './promptTemplates.js';
import { Document } from '../../models/Document.js';
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

  // Step 0: Check if user has uploaded documents
  const userDocCount = await Document.countDocuments({
    userId,
    status: 'Ready',
  });

  if (userDocCount === 0) {
    logger.rag(`User ${userId} has 0 Ready documents in library`);
    return {
      answer: "You haven't uploaded any PDF documents yet (or they are still processing). Please upload a PDF document first using the 'Upload PDF' button to start asking questions.",
      sources: [],
      retrievedChunkCount: 0,
    };
  }

  // Step 1: Generate embedding for user question
  const queryEmbedding = await embeddingService.generateEmbedding(question, userPreferences);

  // Step 2: Query vector store for topK relevant chunks
  const vectorStore = await getVectorStore();

  const sanitizedDocIds = (Array.isArray(documentIds) ? documentIds : [])
    .map((id) => String(id).trim())
    .filter((id) => id && id !== 'undefined' && id !== 'null');

  const searchFilter = { userId: String(userId) };
  if (sanitizedDocIds.length === 1) {
    searchFilter.documentId = sanitizedDocIds[0];
  }

  const rawChunks = await vectorStore.similaritySearch({
    queryEmbedding,
    queryText: question,
    topK: Math.max(1, topK * (sanitizedDocIds.length > 1 ? 2 : 1)),
    filter: searchFilter,
  });

  // If specific multiple documentIds were supplied, filter in-memory
  let relevantChunks = Array.isArray(rawChunks) ? rawChunks : [];
  if (sanitizedDocIds.length > 1) {
    const docIdSet = new Set(sanitizedDocIds);
    relevantChunks = relevantChunks.filter((chunk) =>
      docIdSet.has(String(chunk.metadata?.documentId))
    );
  }

  // Deduplicate and trim to topK
  relevantChunks = relevantChunks.slice(0, topK);

  logger.rag(`Retrieved ${relevantChunks.length} relevant chunks for query`);

  // Step 3: If no chunks retrieved at all, return clear not-found message
  if (relevantChunks.length === 0) {
    return {
      answer: "I could not find information about this in your uploaded documents. Please try rephrasing your question or check that your documents contain relevant content.",
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

  // Step 6: Format source citations safely
  const seenSources = new Set();
  const sources = [];

  for (const chunk of relevantChunks) {
    const meta = chunk.metadata || {};
    const docId = String(meta.documentId || 'unknown');
    const pageNum = Number(meta.pageNumber) || 1;
    const chkId = String(meta.chunkId || `chunk_${Date.now()}`);
    const sourceKey = `${docId}_${pageNum}_${chkId}`;

    if (!seenSources.has(sourceKey)) {
      seenSources.add(sourceKey);
      sources.push({
        documentId: docId,
        filename: String(meta.filename || 'Document.pdf'),
        pageNumber: pageNum,
        chunkId: chkId,
        previewText: chunk.text
          ? chunk.text.slice(0, 180) + (chunk.text.length > 180 ? '...' : '')
          : '',
        score: typeof chunk.score === 'number' ? chunk.score : 0,
      });
    }
  }

  return {
    answer: answer || "I could not find information about this in your uploaded documents.",
    sources,
    retrievedChunkCount: relevantChunks.length,
  };
}
