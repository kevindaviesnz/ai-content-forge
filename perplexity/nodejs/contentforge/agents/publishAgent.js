import { BaseAgent } from './baseAgent.js';

export class PublishAgent extends BaseAgent {
  constructor() {
    super('publishAgent');
  }

  async run(editedData) {
    let parsed;
    
    try {
      const systemPrompt = await this.loadPrompt();
      const response = await this.callLLM(systemPrompt, JSON.stringify(editedData));
      parsed = await this.parseJsonResponse(response);
    } catch (e) {
      console.log('⚠️  PublishAgent using mock response');
      parsed = this.getMockPublishResponse(editedData);
    }
    
    const result = {
      title: parsed.title || editedData.title,
      description: parsed.description || `${editedData.title.slice(0, 140)}...`,
      tags: parsed.tags || ['AI', 'technology', 'future'],
      markdown: parsed.markdown || editedData.body,
      word_count: parsed.word_count || editedData.word_count,
      reading_time_minutes: Math.ceil((parsed.word_count || 1200) / 200)
    };
    
    return result;
  }
  
  getMockPublishResponse(editedData) {
    return {
      title: editedData.title,
      description: "Comprehensive guide to the future of AI agents and autonomous systems.",
      tags: ["AI", "agents", "2026", "technology", "future"],
      markdown: editedData.body,
      word_count: editedData.word_count
    };
  }
}
