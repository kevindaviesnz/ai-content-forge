import { LLMProvider, LLMConfig } from './base';

export class OpenAIProvider implements LLMProvider {
    name = 'openai';

    async call(systemPrompt: string, userMessage: string, config?: LLMConfig): Promise<string> {
        const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
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