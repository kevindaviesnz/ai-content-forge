import { LLMConfig, LLMProvider, Provider } from "../models/index.js";

/**
 * Abstract base class for all LLM provider adapters.
 * Enforces the LLMProvider interface and provides shared retry logic.
 * No provider-specific SDK code lives outside a concrete subclass.
 */
export abstract class BaseAdapter implements LLMProvider {
  abstract readonly providerName: Provider;
  abstract readonly modelName: string;

  /**
   * Core call method — each provider implements this.
   * All retry logic is handled by the orchestrator's withRetry utility.
   */
  abstract call(
    systemPrompt: string,
    userMessage: string,
    config?: Partial<LLMConfig>
  ): Promise<string>;

  /**
   * Strip markdown fences from a response in case the model
   * wraps JSON in ```json ... ``` despite being told not to.
   */
  protected stripMarkdownFences(text: string): string {
    return text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
  }

  /**
   * Validate that a response string is parseable JSON.
   * Throws a descriptive error if not.
   */
  protected ensureJSON(text: string): string {
    const cleaned = this.stripMarkdownFences(text);
    try {
      JSON.parse(cleaned);
      return cleaned;
    } catch {
      throw new Error(
        `[${this.providerName}] Response is not valid JSON.\n` +
        `First 200 chars: ${cleaned.slice(0, 200)}`
      );
    }
  }
}