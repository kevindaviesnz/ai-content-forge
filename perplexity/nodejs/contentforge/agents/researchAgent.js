import { BaseAgent } from './baseAgent.js';
import { ContentBrief } from '../models/contentBrief.js';
import { ResearchPackage } from '../models/researchPackage.js';

export class ResearchAgent extends BaseAgent {
  constructor() {
    super('researchAgent');
  }

  async run(briefData) {
    const brief = new ContentBrief(briefData);
    const systemPrompt = await this.loadPrompt();
    
    const userMessage = `Content Brief: ${JSON.stringify(brief.toJson(), null, 2)}\n\nGenerate ResearchPackage JSON.`;
    
    const response = await this.callLLM(systemPrompt, userMessage);
    const parsed = await this.parseJsonResponse(response);
    
    return new ResearchPackage({
      brief: brief.toJson(),
      ...parsed
    });
  }
}
