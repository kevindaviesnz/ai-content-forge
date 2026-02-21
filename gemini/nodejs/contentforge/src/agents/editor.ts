import { BaseAgent } from './base';
import { ContentBrief, ArticleDraft, EditedArticle, EditedArticleSchema } from '../types';

type Input = { brief: ContentBrief; draft: ArticleDraft };

export class EditorAgent extends BaseAgent<Input, EditedArticle> {
    name = "EditorAgent";
    modelConfig = {};
    outputSchema = EditedArticleSchema;

    constructor() {
        super('editor.md');
    }

    async run(input: Input): Promise<EditedArticle> {
        const response = await this.callLLM(JSON.stringify(input));
        return this.parse(response);
    }
}