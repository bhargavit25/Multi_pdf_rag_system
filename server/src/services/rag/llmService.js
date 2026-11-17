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
    const apiKey = (userPreferences.llmApiKey || config.llmApiKey || '').trim();
    const model = userPreferences.llmModel || config.llmModel;

    // 1. Try Gemini if configured and key is present
    if (provider === 'gemini' && apiKey) {
      try {
        const geminiAnswer = await this.callGemini(apiKey, model || 'gemini-1.5-flash', prompt);
        if (geminiAnswer && geminiAnswer.trim()) {
          return geminiAnswer.trim();
        }
      } catch (err) {
        logger.warn(`Gemini call failed: ${err.message}. Attempting fallback.`);
      }
    }

    // 2. Try OpenAI if configured and key is present
    if (provider === 'openai' && apiKey) {
      try {
        const openAiAnswer = await this.callOpenAI(apiKey, model || 'gpt-4o-mini', prompt);
        if (openAiAnswer && openAiAnswer.trim()) {
          return openAiAnswer.trim();
        }
      } catch (err) {
        logger.warn(`OpenAI call failed: ${err.message}. Attempting fallback.`);
      }
    }

    // 3. If primary failed or no user key was configured, try system-level key if available in env
    if (config.llmApiKey && config.llmApiKey !== apiKey) {
      try {
        if (config.llmProvider === 'openai') {
          const res = await this.callOpenAI(config.llmApiKey, config.llmModel, prompt);
          if (res && res.trim()) return res.trim();
        } else {
          const res = await this.callGemini(config.llmApiKey, config.llmModel, prompt);
          if (res && res.trim()) return res.trim();
        }
      } catch (fallbackErr) {
        logger.warn(`Secondary LLM call failed: ${fallbackErr.message}`);
      }
    }

    // 4. Intelligent contextual synthesis fallback (guarantees system is always functional)
    logger.info('Using contextual synthesizer fallback for answer generation.');
    return this.fallbackSynthesizeAnswer(question, chunks);
  }

  async callGemini(apiKey, modelName, prompt, systemInstruction = SYSTEM_RAG_PROMPT) {
    const ai = new GoogleGenerativeAI(apiKey);

    const tryModels = [
      modelName || 'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
    ];

    let lastError = null;

    for (const name of tryModels) {
      try {
        const model = ai.getGenerativeModel({
          model: name,
          ...(systemInstruction ? { systemInstruction } : {}),
        });

        // 25 second timeout safeguard
        const resultPromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API call timed out after 25 seconds')), 25000)
        );

        const result = await Promise.race([resultPromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();
        if (text) return text;
      } catch (err) {
        lastError = err;
        // If error is about model name or not found, try next candidate
        if (err.message && (err.message.includes('404') || err.message.includes('not found'))) {
          continue;
        }
        break; // Other error (e.g. invalid API key or quota), don't loop models
      }
    }

    throw lastError || new Error('Failed to generate response with Gemini');
  }

  async callOpenAI(apiKey, modelName, prompt, systemInstruction = SYSTEM_RAG_PROMPT, temperature = 0.2) {
    const client = new OpenAI({ apiKey, timeout: 25000 });
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const completion = await client.chat.completions.create({
      model: modelName || 'gpt-4o-mini',
      messages,
      temperature,
    });

    return completion.choices[0]?.message?.content || '';
  }

  /**
   * General text generation method for summaries, prompts, etc.
   */
  async generateText({ prompt, systemInstruction = '', userPreferences = {}, temperature = 0.3 }) {
    const provider = userPreferences.llmProvider || config.llmProvider;
    const apiKey = (userPreferences.llmApiKey || config.llmApiKey || '').trim();
    const model = userPreferences.llmModel || config.llmModel;

    if (provider === 'gemini' && apiKey) {
      try {
        return await this.callGemini(apiKey, model || 'gemini-1.5-flash', prompt, systemInstruction);
      } catch (err) {
        logger.warn(`Gemini generateText failed: ${err.message}`);
      }
    }

    if (provider === 'openai' && apiKey) {
      try {
        return await this.callOpenAI(apiKey, model || 'gpt-4o-mini', prompt, systemInstruction, temperature);
      } catch (err) {
        logger.warn(`OpenAI generateText failed: ${err.message}`);
      }
    }

    if (config.llmApiKey && config.llmApiKey !== apiKey) {
      try {
        if (config.llmProvider === 'openai') {
          return await this.callOpenAI(config.llmApiKey, config.llmModel, prompt, systemInstruction, temperature);
        } else {
          return await this.callGemini(config.llmApiKey, config.llmModel, prompt, systemInstruction);
        }
      } catch (fallbackErr) {
        logger.warn(`Secondary LLM generateText failed: ${fallbackErr.message}`);
      }
    }

    return null;
  }

  /**
   * Generates structured JSON output from LLM.
   */
  async generateJson({ prompt, systemInstruction = '', userPreferences = {} }) {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY a valid JSON object or array. Do NOT wrap in explanation or prose. Do NOT include markdown code blocks if possible, or if using markdown format, wrap strictly in \`\`\`json ... \`\`\`.`;
    const responseText = await this.generateText({
      prompt: jsonPrompt,
      systemInstruction: systemInstruction ? `${systemInstruction}\nYou MUST output valid JSON only.` : 'You are a JSON generator. You must output valid, syntactically correct JSON only.',
      userPreferences,
      temperature: 0.1,
    });

    if (!responseText) return null;

    try {
      let cleaned = responseText.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      }
      return JSON.parse(cleaned);
    } catch (parseErr) {
      logger.warn(`Failed to parse LLM JSON response: ${parseErr.message}\nResponse preview: ${responseText.slice(0, 200)}`);
      return null;
    }
  }

  /**
   * High quality extractive / summarization fallback when external LLM API key is not configured.
   */
  fallbackSynthesizeAnswer(question, chunks) {
    if (!chunks || chunks.length === 0) {
      return 'I could not find information about this in your uploaded documents.';
    }

    const stopWords = new Set([
      'what', 'when', 'where', 'which', 'who', 'how', 'does', 'explain', 'tell', 'about',
      'this', 'that', 'with', 'from', 'have', 'been', 'were', 'will', 'would', 'could',
      'should', 'their', 'there', 'they', 'them', 'these', 'those', 'also', 'some',
      'into', 'than', 'then', 'each', 'more', 'most', 'very', 'only', 'such'
    ]);

    const qTerms = (question || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    // Score sentences in retrieved chunks
    const sentencesWithSource = [];
    for (const chunk of chunks) {
      if (!chunk || !chunk.text) continue;
      const rawSentences = chunk.text.split(/(?<=[.?!])\s+/);
      for (const sent of rawSentences) {
        const clean = sent.trim();
        if (clean.length < 20) continue;

        let matchCount = 0;
        const lowerSent = clean.toLowerCase();
        for (const term of qTerms) {
          if (lowerSent.includes(term)) matchCount++;
        }

        if (matchCount > 0) {
          sentencesWithSource.push({
            sentence: clean,
            score: matchCount,
            filename: chunk.metadata?.filename || 'Document.pdf',
            pageNumber: chunk.metadata?.pageNumber || 1,
          });
        }
      }
    }

    // If query had terms and none matched any chunk sentences at all:
    if (sentencesWithSource.length === 0 && qTerms.length > 0) {
      return 'I could not find information about this in your uploaded documents.';
    }

    sentencesWithSource.sort((a, b) => b.score - a.score);
    const topSentences = sentencesWithSource.slice(0, 4);

    if (topSentences.length === 0) {
      const topChunk = chunks[0];
      if (topChunk && topChunk.text) {
        return `Based on **${topChunk.metadata?.filename || 'Uploaded Document'}** (Page ${topChunk.metadata?.pageNumber || 1}), here is the relevant excerpt found:\n\n> "${topChunk.text.slice(0, 350)}..."`;
      }
      return 'I could not find information about this in your uploaded documents.';
    }

    let answer = `Based on the uploaded documents, here is what was found regarding your question:\n\n`;
    for (const item of topSentences) {
      answer += `* ${item.sentence} *(from ${item.filename}, Page ${item.pageNumber})*\n\n`;
    }

    return answer.trim();
  }
}

export const llmService = new LLMService();
