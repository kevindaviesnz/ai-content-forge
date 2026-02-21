"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvider = getProvider;
const openai_1 = require("./openai");
const anthropic_1 = require("./anthropic");
const gemini_1 = require("./gemini");
const xai_1 = require("./xai");
const providers = {
    openai: new openai_1.OpenAIProvider(),
    anthropic: new anthropic_1.AnthropicProvider(),
    gemini: new gemini_1.GeminiProvider(),
    xai: new xai_1.XAIProvider(),
};
function getProvider(name) {
    const provider = providers[name.toLowerCase()];
    if (!provider) {
        throw new Error(`Unknown provider: ${name}`);
    }
    return provider;
}
