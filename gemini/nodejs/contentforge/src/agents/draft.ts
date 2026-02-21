import { BaseAgent } from './base';
import { ContentBrief, ResearchPackage, ArticleOutline, ArticleDraft, ArticleDraftSchema } from '../types';

type Input = { 
    brief: ContentBrief; 
    research: ResearchPackage; 
    outline: ArticleOutline; 
    previousDraft?: ArticleDraft 
};

export class DraftAgent extends BaseAgent<Input, ArticleDraft> {
    name = "DraftAgent";
    modelConfig = {};
    outputSchema = ArticleDraftSchema;

    constructor() {
        super('draft.md');
    }

    async run(input: Input): Promise<ArticleDraft> {
        const response = await this.callLLM(JSON.stringify(input));
        return this.parse(response);
    }
}