import {
  ContentBrief,
  ResearchPackage,
  ArticleOutline,
  ArticleOutlineSchema,
  AgentRunResult,
  LLMProvider,
} from "../models/index.js";
import { RetryConfig } from "../utils/index.js";
import { BaseAgent } from "./base.agent.js";

/**
 * OutlineAgent — third agent in the pipeline.
 *
 * Receives both the ContentBrief and ResearchPackage and produces
 * a structured ArticleOutline with section headings, bullet points,
 * word count estimates, an intro hook, and a conclusion CTA.
 */
export class OutlineAgent extends BaseAgent {
  readonly name = "OutlineAgent";

  constructor(provider: LLMProvider, retryConfig: RetryConfig) {
    super(provider, retryConfig);
  }

  async run(
    brief: ContentBrief,
    research: ResearchPackage
  ): Promise<AgentRunResult<ArticleOutline>> {
    return this.timed({ brief, research }, async ({ brief: b, research: r }) => {
      const userMessage = JSON.stringify({ brief: b, research: r });
      const rawResponse = await this.call(userMessage);
      const output      = this.parse(rawResponse, ArticleOutlineSchema);
      return { output, rawResponse };
    });
  }
}