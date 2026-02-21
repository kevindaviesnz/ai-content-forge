import { LLMProvider } from './base';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { XAIProvider } from './xai';

const providers: Record<string, LLMProvider> = {
    openai: new OpenAIProvider(),
    anthropic: new AnthropicProvider(),
    gemini: new GeminiProvider(),
    xai: new XAIProvider(),
};

export function getProvider(name: string): LLMProvider {
    const provider = providers[name.toLowerCase()];
    if (!provider) {
        throw new Error(`Unknown provider: ${name}`);
    }
    return provider;
}