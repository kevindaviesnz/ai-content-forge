import {
  ContentBrief,
  ResearchPackage,
  ResearchPackageSchema,
  AgentRunResult,
  LLMProvider,
} from "../models/index.js";
import { RetryConfig } from "../utils/index.js";
import { BaseAgent } from "./base.agent.js";

/**
 * ResearchAgent — second agent in the pipeline.
 *
 * Receives a ContentBrief and generates a rich ResearchPackage:
 * key facts, answered questions, examples, counterarguments, and sources.
 * Does not fetch live URLs — produces thorough synthesised research.
 */
export class ResearchAgent extends BaseAgent {
  readonly name = "ResearchAgent";

  constructor(provider: LLMProvider, retryConfig: RetryConfig) {
    super(provider, retryConfig);
  }

  async run(brief: ContentBrief): Promise<AgentRunResult<ResearchPackage>> {
    return this.timed(brief, async (b) => {
      const userMessage = JSON.stringify({ brief: b });
      const rawResponse = await this.call(userMessage);
      const output      = this.parse(rawResponse, ResearchPackageSchema);
      return { output, rawResponse };
    });
  }
}