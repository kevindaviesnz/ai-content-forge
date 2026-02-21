"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const adapters_1 = require("../adapters");
class BaseAgent {
    constructor(promptFileName) {
        this.promptPath = path.join(__dirname, '../../src/prompts', promptFileName);
    }
    loadPrompt() {
        try {
            return fs.readFileSync(this.promptPath, 'utf-8');
        }
        catch (e) {
            throw new Error(`Could not load prompt file: ${this.promptPath}`);
        }
    }
    async callLLM(userMessage) {
        const systemPrompt = this.loadPrompt();
        const providerName = this.modelConfig.provider || process.env.DEFAULT_PROVIDER || 'openai';
        const provider = (0, adapters_1.getProvider)(providerName);
        // Exponential backoff retry logic
        let retries = 0;
        const maxRetries = 3;
        while (retries <= maxRetries) {
            try {
                return await provider.call(systemPrompt, userMessage, this.modelConfig);
            }
            catch (error) {
                retries++;
                if (retries > maxRetries)
                    throw error;
                await new Promise(res => setTimeout(res, Math.pow(2, retries) * 1000));
            }
        }
        return "";
    }
    parse(jsonString) {
        try {
            // Clean markdown fences if present
            const cleaned = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            return this.outputSchema.parse(parsed);
        }
        catch (e) {
            console.error(`Error parsing JSON from ${this.name}:`, jsonString);
            throw new Error(`Failed to parse JSON from ${this.name}: ${e}`);
        }
    }
}
exports.BaseAgent = BaseAgent;
