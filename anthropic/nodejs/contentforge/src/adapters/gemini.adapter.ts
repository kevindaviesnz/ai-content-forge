import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMConfig } from "../models/index.js";
import { BaseAdapter } from "./base.adapter.js";

/**
 * Google Gemini adapter.
 * Gemini uses a `systemInstruction` field separate from the chat history,
 * which maps cleanly to our systemPrompt parameter.
 */
export class GeminiAdapter extends BaseAdapter {
  readonly providerName = "gemini" as const;
  readonly modelName: string;

  private client: GoogleGenerativeAI;

  constructor(apiKey: string, model: string) {
    super();
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = model;
  }

  async call(
    systemPrompt: string,
    userMessage: string,
    config?: Partial<LLMConfig>
  ): Promise<string> {
    const modelName = config?.model ?? this.modelName;
    const maxTokens = config?.max_tokens ?? 8192;

    const model = this.client.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(userMessage);
    const text = result.response.text();

    if (!text) {
      throw new Error("[gemini] Empty response text");
    }

    return this.ensureJSON(text);
  }
}