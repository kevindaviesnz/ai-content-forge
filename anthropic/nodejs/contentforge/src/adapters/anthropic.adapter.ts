import Anthropic from "@anthropic-ai/sdk";
import { LLMConfig } from "../models/index.js";
import { BaseAdapter } from "./base.adapter.js";

/**
 * Anthropic Claude adapter.
 * Translates the generic LLMProvider interface into Anthropic SDK calls.
 * System prompts are passed via the dedicated `system` parameter.
 */
export class AnthropicAdapter extends BaseAdapter {
  readonly providerName = "anthropic" as const;
  readonly modelName: string;

  private client: Anthropic;

  constructor(apiKey: string, model: string) {
    super();
    this.client = new Anthropic({ apiKey });
    this.modelName = model;
  }

  async call(
    systemPrompt: string,
    userMessage: string,
    config?: Partial<LLMConfig>
  ): Promise<string> {
    const model = config?.model ?? this.modelName;
    const maxTokens = config?.max_tokens ?? 4096;

    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const block = response.content[0];
    if (!block || block.type !== "text") {
      throw new Error("[anthropic] Unexpected response content type");
    }

    return this.ensureJSON(block.text);
  }
}