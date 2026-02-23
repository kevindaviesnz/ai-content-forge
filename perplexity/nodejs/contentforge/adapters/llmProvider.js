import OpenAIAdapter from './openaiAdapter.js';
import GeminiAdapter from './geminiAdapter.js';

export class LLMProvider {
  static providers = {
    openai: OpenAIAdapter,
    gemini: GeminiAdapter
  };

  constructor(provider = process.env.GLOBAL_PROVIDER || 'gemini') {
    const ProviderClass = LLMProvider.providers[provider.toLowerCase()];
    if (!ProviderClass) {
      throw new Error(`Provider "${provider}" not supported. Available: ${Object.keys(LLMProvider.providers).join(', ')}`);
    }
    this.adapter = new ProviderClass();
  }

  async call(systemPrompt, userMessage, config = {}) {
    return await this.adapter.call(systemPrompt, userMessage, config);
  }
}
