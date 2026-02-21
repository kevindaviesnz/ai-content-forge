import { BaseAgent } from './base';
import { ContentBrief, ContentBriefSchema } from '../types';

export class BriefAgent extends BaseAgent<string, ContentBrief> {
    name = "BriefAgent";
    modelConfig = {}; 
    outputSchema = ContentBriefSchema;

    constructor() {
        super('brief.md');
    }

    async run(input: string): Promise<ContentBrief> {
        // We pass the raw topic wrapped in a simple JSON structure to the LLM
        const response = await this.callLLM(JSON.stringify({ topic: input }));
        return this.parse(response);
    }
}