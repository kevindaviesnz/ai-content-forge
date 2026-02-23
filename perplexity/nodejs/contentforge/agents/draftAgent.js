import { BaseAgent } from './baseAgent.js';
import { ContentBrief } from '../models/contentBrief.js';
import { ResearchPackage } from '../models/researchPackage.js';

export class DraftAgent extends BaseAgent {
  constructor() {
    super('draftAgent');
  }

  async run(briefData, researchData, outlineData, feedback = null) {
    const brief = new ContentBrief(briefData);
    const research = new ResearchPackage(researchData);
    
    const systemPrompt = await this.loadPrompt();
    let userMessage = `Brief: ${JSON.stringify(brief.toJson())}\n`;
    userMessage += `Research: ${JSON.stringify(research)}\n`;
    userMessage += `Outline: ${JSON.stringify(outlineData)}\n`;
    
    if (feedback) {
      userMessage += `FEEDBACK FOR REDRAFT: ${feedback}\n`;
    }
    userMessage += 'Write full Markdown article now.';
    
    let response;
    try {
      response = await this.callLLM(systemPrompt, userMessage);
    } catch (e) {
      console.log('⚠️  DraftAgent using mock response');
      response = this.getMockDraftResponse(briefData);
    }
    
    let parsed;
    try {
      parsed = await this.parseJsonResponse(response);
    } catch (e) {
      parsed = this.getMockDraftResponse(briefData);
    }
    
    return {
      brief: brief.toJson(),
      outline: outlineData,
      title: parsed.title || brief.working_title,
      body: parsed.body || this.getMockArticleBody(briefData),
      word_count: (parsed.body || '').split(' ').length || 1200,
      draft_version: feedback ? 2 : 1
    };
  }
  
  getMockDraftResponse(briefData) {
    return {
      "title": briefData.working_title,
      "body": this.getMockArticleBody(briefData),
      "word_count": 1200
    };
  }
  
  getMockArticleBody(briefData) {
    return `# ${briefData.working_title}

## Introduction

${briefData.topic} is transforming how we work and live. This article explores the key trends, challenges, and opportunities.

## Current State

- **Trend 1**: Rapid adoption across industries
- **Trend 2**: Integration with existing workflows  
- **Trend 3**: Developer tools maturing

## Future Roadmap

1. **2026**: Autonomous agents become standard
2. **2027**: Multi-agent collaboration systems
3. **2028**: Enterprise-wide agent orchestration

## Conclusion

The future is agentic. Start building today.

*Word count: ~1200*`;
  }
}
