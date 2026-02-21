export interface LLMConfig {
    provider?: string;
    model?: string;
    apiKey?: string;
    temperature?: number;
}

export interface LLMProvider {
    name: string;
    call(systemPrompt: string, userMessage: string, config?: LLMConfig): Promise<string>;
}