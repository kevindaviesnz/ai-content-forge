import { BaseAgent } from './baseAgent.js';
import { ContentBrief } from '../models/contentBrief.js';
import { ResearchPackage } from '../models/researchPackage.js';

export class OutlineAgent extends BaseAgent {
  constructor() {
    super('outlineAgent');
  }

  async run(briefData, researchData) {
    const brief = new ContentBrief(briefData);
    const research = new ResearchPackage(researchData);
    
    const systemPrompt = await this.loadPrompt();
    const userMessage = `Brief: ${JSON.stringify(brief.toJson())}\nResearch: ${JSON.stringify(research)}\n\nGenerate ArticleOutline JSON.`;
    
    const response = await this.callLLM(systemPrompt, userMessage);
    const parsed = await this.parseJsonResponse(response);
    
    return parsed;
  }
}
