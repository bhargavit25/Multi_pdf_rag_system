import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { SYSTEM_RAG_PROMPT } from './promptTemplates.js';

class LLMService {
  /**
   * Generates a completion from the configured LLM provider.
   * @param {Object} params
   * @param {string} params.prompt - Combined prompt with context & history
   * @param {Array} [params.chunks] - Retrieved chunks for fallback synthesis
   * @param {string} [params.question] - User question
   * @param {Object} [params.userPreferences] - Optional user override keys
   * @returns {Promise<string>}
   */
  async generateAnswer({ prompt, chunks = [], question = '', userPreferences = {} }) {
    const provider = userPreferences.llmProvider || config.llmProvider;
    const apiKey = userPreferences.llmApiKey || config.llmApiKey;
    const model = userPreferences.llmModel || config.llmModel;

    // 1. Try Gemini if configured and key is present
    if (provider === 'gemini' && apiKey) {
      try {
        return await this.callGemini(apiKey, model || 'gemini-1.5-flash', prompt);
      } catch (err) {
        logger.warn(`Gemini call failed: ${err.message}. Attempting fallback.`);
      }
    }

    // 2. Try OpenAI if configured and key is present
    if (provider === 'openai' && apiKey) {
      try {
        return await this.callOpenAI(apiKey, model || 'gpt-4o-mini', prompt);
      } catch (err) {
        logger.warn(`OpenAI call failed: ${err.message}. Attempting fallback.`);
      }
    }

    // 3. If primary failed or no API key was configured, try other key if available in env
    if (config.llmApiKey && config.llmApiKey !== apiKey) {
      try {
        if (config.llmProvider === 'openai') {
          return await this.callOpenAI(config.llmApiKey, config.llmModel, prompt);
        } else {
          return await this.callGemini(config.llmApiKey, config.llmModel, prompt);
        }
      } catch (fallbackErr) {
        logger.warn(`Secondary LLM call failed: ${fallbackErr.message}`);
      }
    }

    // 4. Intelligent contextual synthesis fallback (guarantees system is always functional)
    logger.info('Using contextual synthesizer fallback for answer generation.');
    return this.fallbackSynthesizeAnswer(question, chunks);
  }

  async callGemini(apiKey, modelName, prompt) {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_RAG_PROMPT,
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  async callOpenAI(apiKey, modelName, prompt) {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: SYSTEM_RAG_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    });

    return completion.choices[0].message.content;
  }

  /**
   * High quality extractive / summarization fallback when external LLM API key is not configured.
   */
  fallbackSynthesizeAnswer(question, chunks) {
    if (!chunks || chunks.length === 0) {
      return 'I could not find information about this in your uploaded documents.';
    }

    const qTerms = (question || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['what', 'when', 'where', 'which', 'who', 'how', 'does', 'explain', 'tell', 'about'].includes(w));

    // Score sentences in retrieved chunks
    const sentencesWithSource = [];
    for (const chunk of chunks) {
      const rawSentences = chunk.text.split(/(?<=[.?!])\s+/);
      for (const sent of rawSentences) {
        const clean = sent.trim();
        if (clean.length < 25) continue;

        let matchCount = 0;
        const lowerSent = clean.toLowerCase();
        for (const term of qTerms) {
          if (lowerSent.includes(term)) matchCount++;
        }

        if (matchCount > 0 || chunks.length === 1) {
          sentencesWithSource.push({
            sentence: clean,
            score: matchCount,
            filename: chunk.metadata.filename,
            pageNumber: chunk.metadata.pageNumber,
          });
        }
      }
    }

    sentencesWithSource.sort((a, b) => b.score - a.score);
    const topSentences = sentencesWithSource.slice(0, 4);

    if (topSentences.length === 0) {
      const topChunk = chunks[0];
      return `Based on **${topChunk.metadata.filename}** (Page ${topChunk.metadata.pageNumber}), here is the relevant excerpt found:\n\n> "${topChunk.text.slice(0, 350)}..."\n\n*(Note: Configure your LLM_API_KEY in Settings or .env for full generative AI responses.)*`;
    }

    let answer = `Based on the uploaded documents, here is what was found regarding your question:\n\n`;
    for (const item of topSentences) {
      answer += `* ${item.sentence} *(from ${item.filename}, Page ${item.pageNumber})*\n\n`;
    }

    return answer.trim();
  }
}

export const llmService = new LLMService();
