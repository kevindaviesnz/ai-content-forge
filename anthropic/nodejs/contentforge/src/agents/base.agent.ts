import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { LLMProvider, LLMConfig, AgentRunResult, Provider } from "../models/index.js";
import { withRetry, RetryConfig, logger } from "../utils/index.js";

/**
 * BaseAgent — shared foundation for all ContentForge agents.
 *
 * Responsibilities:
 *  - Load system prompt from /prompts/<agentName>.md
 *  - Call the injected LLMProvider with retry logic
 *  - Parse and validate the JSON response against a Zod schema
 *  - Wrap the result in an AgentRunResult with timing metadata
 *
 * Agents never import provider SDKs. All LLM access goes through
 * the injected LLMProvider interface.
 */
export abstract class BaseAgent {
  abstract readonly name: string;

  protected provider: LLMProvider;
  protected retryConfig: RetryConfig;

  constructor(provider: LLMProvider, retryConfig: RetryConfig) {
    this.provider    = provider;
    this.retryConfig = retryConfig;
  }

  get model(): string {
    return this.provider.modelName;
  }

  get providerName(): Provider {
    return this.provider.providerName;
  }

  // ─── Prompt Loading ──────────────────────────────────────────────────────────

  /**
   * Loads the agent's system prompt from /prompts/<name>.md.
   * The prompt filename matches the agent's name property (lowercase, hyphenated).
   * e.g. "BriefAgent" → prompts/brief-agent.md
   */
  async loadPrompt(): Promise<string> {
    const filename  = this.name
      .replace(/([A-Z])/g, (m, l, i) => (i === 0 ? l : `-${l}`))
      .toLowerCase() + ".md";

    const promptPath = path.resolve(process.cwd(), "prompts", filename);

    if (!fs.existsSync(promptPath)) {
      throw new Error(
        `System prompt not found for ${this.name}.\n` +
        `Expected: ${promptPath}`
      );
    }

    return fs.readFileSync(promptPath, "utf-8");
  }

  // ─── LLM Call ────────────────────────────────────────────────────────────────

  /**
   * Calls the LLM provider with retry logic.
   * Returns raw JSON string from the provider.
   */
  async call(
    userMessage: string,
    config?: Partial<LLMConfig>
  ): Promise<string> {
    const systemPrompt = await this.loadPrompt();

    return withRetry(
      this.name,
      () => this.provider.call(systemPrompt, userMessage, config),
      this.retryConfig
    );
  }

  // ─── JSON Parsing ────────────────────────────────────────────────────────────

  /**
   * Parses the raw LLM response text against a Zod schema.
   * Throws a descriptive error if validation fails.
   */
  parse<T>(responseText: string, schema: z.ZodSchema<T>): T {
    let parsed: unknown;

    try {
      parsed = JSON.parse(responseText);
    } catch {
      throw new Error(
        `[${this.name}] Failed to parse JSON response.\n` +
        `Response preview: ${responseText.slice(0, 300)}`
      );
    }

    const result = schema.safeParse(parsed);

    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  • ${i.path.join(".")} — ${i.message}`)
        .join("\n");
      throw new Error(
        `[${this.name}] Schema validation failed:\n${issues}\n` +
        `Response preview: ${responseText.slice(0, 300)}`
      );
    }

    return result.data;
  }

  // ─── Timed Run Wrapper ───────────────────────────────────────────────────────

  /**
   * Wraps an agent's run() execution with timing and logging.
   * Called by each agent's run() method via super.
   */
  protected async timed<TInput, TOutput>(
    input: TInput,
    fn: (input: TInput) => Promise<{ output: TOutput; rawResponse: string }>
  ): Promise<AgentRunResult<TOutput>> {
    logger.agentStart(this.name, this.providerName, this.model);
    const start = Date.now();

    const { output, rawResponse } = await fn(input);
    const durationMs = Date.now() - start;

    logger.agentComplete(this.name, durationMs, this.providerName, this.model);

    return {
      agentName:   this.name,
      provider:    this.providerName,
      model:       this.model,
      durationMs,
      output,
      rawResponse,
    };
  }
}