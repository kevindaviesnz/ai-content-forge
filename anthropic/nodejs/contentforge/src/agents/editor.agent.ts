import {
  ContentBrief,
  ArticleDraft,
  EditedArticle,
  EditedArticleSchema,
  AgentRunResult,
  LLMProvider,
} from "../models/index.js";
import { RetryConfig, countWords, logger } from "../utils/index.js";
import { BaseAgent } from "./base.agent.js";

/**
 * EditorAgent — fifth agent in the pipeline.
 *
 * Reviews the draft against the brief and scores it across four dimensions:
 *   - clarity     (1–10)
 *   - accuracy    (1–10)
 *   - tone_match  (1–10)
 *   - structure   (1–10)
 *
 * If ALL scores are >= 7:
 *   passed_quality_threshold = true  → rewrites/improves and passes forward
 *
 * If ANY score is < 7:
 *   passed_quality_threshold = false → returns with feedback_for_redraft
 *   The orchestrator will loop back to DraftAgent (max 3 times)
 */
export class EditorAgent extends BaseAgent {
  readonly name = "EditorAgent";

  constructor(provider: LLMProvider, retryConfig: RetryConfig) {
    super(provider, retryConfig);
  }

  async run(
    brief: ContentBrief,
    draft: ArticleDraft
  ): Promise<AgentRunResult<EditedArticle>> {
    return this.timed({ brief, draft }, async ({ brief: b, draft: d }) => {
      const userMessage = JSON.stringify({ brief: b, draft: d });
      const rawResponse = await this.call(userMessage);
      const edited      = this.parse(rawResponse, EditedArticleSchema);

      // Recompute word count from actual edited body
      const output: EditedArticle = {
        ...edited,
        word_count: countWords(edited.body),
      };

      // Log quality scores for visibility
      const { quality_scores, passed_quality_threshold } = output;
      const scoreStr = Object.entries(quality_scores)
        .map(([k, v]) => `${k}: ${v}/10`)
        .join(" · ");

      if (passed_quality_threshold) {
        logger.success(`[EditorAgent] Quality passed — ${scoreStr}`);
      } else {
        logger.warn(`[EditorAgent] Quality below threshold — ${scoreStr}`);
        if (output.feedback_for_redraft) {
          logger.info(`[EditorAgent] Feedback: ${output.feedback_for_redraft.slice(0, 120)}...`);
        }
      }

      return { output, rawResponse };
    });
  }
}