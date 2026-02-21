import OpenAI from "openai";
import { LLMConfig } from "../models/index.js";
import { BaseAdapter } from "./base.adapter.js";

/**
 * OpenAI adapter (GPT-4o and compatible models).
 * System prompts are passed as the first message with role "system".
 */
export class OpenAIAdapter extends BaseAdapter {
  readonly providerName = "openai" as const;
  readonly modelName: string;

  private client: OpenAI;

  constructor(apiKey: string, model: string) {
    super();
    this.client = new OpenAI({ apiKey });
    this.modelName = model;
  }

  async call(
    systemPrompt: string,
    userMessage: string,
    config?: Partial<LLMConfig>
  ): Promise<string> {
    const model = config?.model ?? this.modelName;
    const maxTokens = config?.max_tokens ?? 4096;

    const response = await this.client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("[openai] Empty response content");
    }

    return this.ensureJSON(content);
  }
}