import OpenAI from "openai";
import { LLMConfig } from "../models/index.js";
import { BaseAdapter } from "./base.adapter.js";

/**
 * xAI Grok adapter.
 * Grok exposes an OpenAI-compatible API, so we reuse the OpenAI SDK
 * pointed at xAI's base URL. The interface contract is identical to
 * OpenAIAdapter — system prompt as role "system", user message as role "user".
 *
 * Note: Grok does not yet support response_format: json_object on all models,
 * so we rely on prompt-level enforcement + ensureJSON() cleanup instead.
 */
export class GrokAdapter extends BaseAdapter {
  readonly providerName = "grok" as const;
  readonly modelName: string;

  private client: OpenAI;

  constructor(apiKey: string, model: string) {
    super();
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://api.x.ai/v1",
    });
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
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("[grok] Empty response content");
    }

    return this.ensureJSON(content);
  }
}