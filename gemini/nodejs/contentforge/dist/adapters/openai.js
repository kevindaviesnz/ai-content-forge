"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
class OpenAIProvider {
    constructor() {
        this.name = 'openai';
    }
    async call(systemPrompt, userMessage, config) {
        const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey)
            throw new Error("Missing OPENAI_API_KEY");
        const model = config?.model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
        const response = await fetch('[https://api.openai.com/v1/chat/completions](https://api.openai.com/v1/chat/completions)', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: config?.temperature || 0.7,
                response_format: { type: "json_object" }
            })
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI API Error: ${err}`);
        }
        const data = await response.json();
        return data.choices[0].message.content;
    }
}
exports.OpenAIProvider = OpenAIProvider;
