export const logger = {
  info: (msg, ...args) => console.log(`[INFO]  [${new Date().toISOString()}] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN]  [${new Date().toISOString()}] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, ...args),
  rag: (msg, ...args) => console.log(`[RAG]   [${new Date().toISOString()}] ${msg}`, ...args),
};
