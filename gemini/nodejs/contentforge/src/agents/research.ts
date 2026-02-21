import { BaseAgent } from './base';
import { ContentBrief, ResearchPackage, ResearchPackageSchema } from '../types';

export class ResearchAgent extends BaseAgent<ContentBrief, ResearchPackage> {
    name = "ResearchAgent";
    modelConfig = {}; 
    outputSchema = ResearchPackageSchema;

    constructor() {
        super('research.md');
    }

    async run(input: ContentBrief): Promise<ResearchPackage> {
        const response = await this.callLLM(JSON.stringify(input));
        return this.parse(response);
    }
}