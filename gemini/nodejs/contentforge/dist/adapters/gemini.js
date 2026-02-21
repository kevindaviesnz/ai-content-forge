"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
class GeminiProvider {
    constructor() {
        this.name = 'gemini';
    }
    async call(systemPrompt, userMessage, config) {
        const apiKey = config?.apiKey || process.env.GOOGLE_API_KEY;
        if (!apiKey)
            throw new Error("Missing GOOGLE_API_KEY");
        const model = config?.model || process.env.GEMINI_MODEL || 'gemini-1.5-pro';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                        parts: [{ text: systemPrompt + "\n\nHuman: " + userMessage }]
                    }],
                generationConfig: {
                    temperature: config?.temperature || 0.7,
                    responseMimeType: "application/json"
                }
            })
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini API Error: ${err}`);
        }
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
}
exports.GeminiProvider = GeminiProvider;
