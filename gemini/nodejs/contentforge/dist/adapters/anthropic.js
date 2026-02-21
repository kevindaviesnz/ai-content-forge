"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
class AnthropicProvider {
    constructor() {
        this.name = 'anthropic';
    }
    async call(systemPrompt, userMessage, config) {
        const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey)
            throw new Error("Missing ANTHROPIC_API_KEY");
        const model = config?.model || process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229';
        const response = await fetch('[https://api.anthropic.com/v1/messages](https://api.anthropic.com/v1/messages)', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model,
                system: systemPrompt,
                messages: [{ role: 'user', content: userMessage }],
                max_tokens: 4096,
                temperature: config?.temperature || 0.7
            })
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Anthropic API Error: ${err}`);
        }
        const data = await response.json();
        return data.content[0].text;
    }
}
exports.AnthropicProvider = AnthropicProvider;
