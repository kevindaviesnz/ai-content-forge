"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XAIProvider = void 0;
class XAIProvider {
    constructor() {
        this.name = 'xai';
    }
    async call(systemPrompt, userMessage, config) {
        const apiKey = config?.apiKey || process.env.XAI_API_KEY;
        if (!apiKey)
            throw new Error("Missing XAI_API_KEY");
        // Use grok-beta or grok-2 as default
        const model = config?.model || process.env.XAI_MODEL || 'grok-beta';
        const response = await fetch('[https://api.x.ai/v1/chat/completions](https://api.x.ai/v1/chat/completions)', {
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
                stream: false
            })
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`xAI API Error: ${err}`);
        }
        const data = await response.json();
        return data.choices[0].message.content;
    }
}
exports.XAIProvider = XAIProvider;
