import { BaseAgent } from './base';
import { EditedArticle, PublishedArticle, PublishedArticleSchema } from '../types';

export class PublishAgent extends BaseAgent<EditedArticle, PublishedArticle> {
    name = "PublishAgent";
    modelConfig = {};
    outputSchema = PublishedArticleSchema;

    constructor() {
        super('publish.md');
    }

    async run(input: EditedArticle): Promise<PublishedArticle> {
        const response = await this.callLLM(JSON.stringify(input));
        return this.parse(response);
    }
}