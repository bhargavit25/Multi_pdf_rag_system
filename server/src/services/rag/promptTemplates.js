export const SYSTEM_RAG_PROMPT = `You are a document-based AI assistant.

Answer the user's question using only the provided document context below.

Rules:
1. Do not invent or hallucinate information.
2. If the answer is not available in the provided context, clearly state: "I could not find information about this in your uploaded documents."
3. Use the conversation history when answering follow-up questions.
4. Keep answers clear, well-structured, and concise. Use markdown formatting (bullet points, bold text) where appropriate.
5. In your answer, reference the sources where relevant (e.g., "[Doc: filename, Page: X]").
6. If multiple documents support the answer, synthesize the response and mention all relevant sources.`;

/**
 * Builds the formatted context string from retrieved chunks
 * @param {Array<{ id: string, text: string, metadata: Object, score: number }>} chunks
 * @returns {string}
 */
export function buildContextString(chunks) {
  if (!chunks || chunks.length === 0) {
    return 'No document context available.';
  }

  return chunks
    .map((chunk, index) => {
      const { filename, pageNumber, chunkId } = chunk.metadata;
      return `--- Context Source [${index + 1}] ---
Document: ${filename}
Page Number: ${pageNumber}
Chunk ID: ${chunkId}
Content:
${chunk.text}
`;
    })
    .join('\n');
}

/**
 * Builds user prompt combining context, conversation history, and current question
 */
export function buildPromptWithContext(question, contextString, conversationHistory = []) {
  let prompt = `DOCUMENT CONTEXT:
${contextString}

`;

  if (conversationHistory.length > 0) {
    prompt += `PREVIOUS CONVERSATION HISTORY:\n`;
    const recentHistory = conversationHistory.slice(-6); // last 3 turns
    for (const msg of recentHistory) {
      prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    }
    prompt += `\n`;
  }

  prompt += `CURRENT USER QUESTION:
${question}

Please answer the question accurately based ONLY on the document context provided above.`;

  return prompt;
}
