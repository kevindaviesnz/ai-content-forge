import { BaseAgent } from './baseAgent.js';

export class BriefAgent extends BaseAgent {
  constructor() {
    super('briefAgent');
  }

  async run(rawTopic) {
    const systemPrompt = await this.loadPrompt();
    
    const userMessage = `Raw topic: "${rawTopic}"\n\nGenerate the ContentBrief JSON now.`;
    
    const response = await this.callLLM(systemPrompt, userMessage);
    const parsed = await this.parseJsonResponse(response);
    
    // Validate basic structure
    if (!parsed.topic) {
      throw new Error('BriefAgent failed to generate valid topic');
    }
    
    return {
      topic: parsed.topic || rawTopic,
      working_title: parsed.working_title || `Understanding ${rawTopic}`,
      target_audience: parsed.target_audience || 'general readers',
      purpose: parsed.purpose || 'educate',
      angle: parsed.angle || 'comprehensive overview',
      content_type: parsed.content_type || 'blog_post',
      tone: parsed.tone || ['informative', 'professional'],
      key_points: parsed.key_points || [`Key fact about ${rawTopic}`],
      what_to_avoid: parsed.what_to_avoid || ['jargon', 'bias'],
      estimated_word_count: parsed.estimated_word_count || 1200,
      success_criteria: parsed.success_criteria || ['clear', 'actionable']
    };
  }
}
