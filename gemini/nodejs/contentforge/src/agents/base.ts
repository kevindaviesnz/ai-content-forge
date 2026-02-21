import * as fs from 'fs';
import * as path from 'path';
import { ZodSchema } from 'zod';
import { getProvider } from '../adapters';
import { LLMConfig } from '../adapters/base';

export abstract class BaseAgent<TInput, TOutput> {
    abstract name: string;
    abstract modelConfig: LLMConfig;
    abstract outputSchema: ZodSchema<TOutput>;

    protected promptPath: string;

    constructor(promptFileName: string) {
        this.promptPath = path.join(__dirname, '../../src/prompts', promptFileName);
    }

    protected loadPrompt(): string {
        try {
            return fs.readFileSync(this.promptPath, 'utf-8');
        } catch (e) {
            throw new Error(`Could not load prompt file: ${this.promptPath}`);
        }
    }

    protected async callLLM(userMessage: string): Promise<string> {
        const systemPrompt = this.loadPrompt();
        const providerName = this.modelConfig.provider || process.env.DEFAULT_PROVIDER || 'openai';
        const provider = getProvider(providerName);
        
        // Exponential backoff retry logic
        let retries = 0;
        const maxRetries = 3;
        
        while (retries <= maxRetries) {
            try {
                return await provider.call(systemPrompt, userMessage, this.modelConfig);
            } catch (error) {
                retries++;
                if (retries > maxRetries) throw error;
                await new Promise(res => setTimeout(res, Math.pow(2, retries) * 1000));
            }
        }
        return "";
    }

    protected parse(jsonString: string): TOutput {
        try {
            // Clean markdown fences if present
            const cleaned = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            return this.outputSchema.parse(parsed);
        } catch (e) {
            console.error(`Error parsing JSON from ${this.name}:`, jsonString);
            throw new Error(`Failed to parse JSON from ${this.name}: ${e}`);
        }
    }

    abstract run(input: TInput): Promise<TOutput>;
}