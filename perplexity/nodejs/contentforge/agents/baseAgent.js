import fs from 'fs';
import path from 'path';
import { LLMProvider } from '../adapters/llmProvider.js';

export class BaseAgent {
  constructor(name, model = 'default') {
    this.name = name;
    this.model = model;
    this.promptPath = path.join(process.cwd(), 'prompts', `${name}.md`);
    this.provider = new LLMProvider();
  }

  async loadPrompt() {
    if (!fs.existsSync(this.promptPath)) {
      throw new Error(`Prompt file missing: ${this.promptPath}`);
    }
    return fs.readFileSync(this.promptPath, 'utf8');
  }

  async callLLM(systemPrompt, userMessage, config = {}) {
    try {
      return await this.provider.call(systemPrompt, userMessage, config);
    } catch (error) {
      console.error(`LLM Error in ${this.name}:`, error.message);
      throw error;
    }
  }

  async parseJsonResponse(responseText) {
    try {
      // Extract JSON from response (handles markdown fences, etc.)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`JSON parse error in ${this.name}: ${error.message}\nRaw: ${responseText.slice(0, 200)}...`);
    }
  }

  async run(input) {
    throw new Error('run() must be implemented by subclass');
  }
}
