import { BaseAgent } from './base';
import { ContentBrief, ResearchPackage, ArticleOutline, ArticleOutlineSchema } from '../types';

type Input = { brief: ContentBrief; research: ResearchPackage };

export class OutlineAgent extends BaseAgent<Input, ArticleOutline> {
    name = "OutlineAgent";
    modelConfig = {};
    outputSchema = ArticleOutlineSchema;

    constructor() {
        super('outline.md');
    }

    async run(input: Input): Promise<ArticleOutline> {
        const response = await this.callLLM(JSON.stringify(input));
        return this.parse(response);
    }
}