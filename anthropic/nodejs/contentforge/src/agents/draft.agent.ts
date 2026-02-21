import {
  ContentBrief,
  ResearchPackage,
  ArticleOutline,
  ArticleDraft,
  ArticleDraftSchema,
  AgentRunResult,
  LLMProvider,
} from "../models/index.js";
import { RetryConfig, countWords, checkWordCountRange, logger } from "../utils/index.js";
import { BaseAgent } from "./base.agent.js";

/**
 * DraftAgent — fourth agent in the pipeline.
 *
 * Writes the full first draft in Markdown using the outline as its
 * skeleton and the research as its source material. Respects tone,
 * audience, and word count from the brief.
 *
 * Also handles redrafts when the EditorAgent returns
 * passed_quality_threshold: false, attaching editor feedback to
 * the user message so the model can address specific issues.
 */
export class DraftAgent extends BaseAgent {
  readonly name = "DraftAgent";

  constructor(provider: LLMProvider, retryConfig: RetryConfig) {
    super(provider, retryConfig);
  }

  // ─── First Draft ─────────────────────────────────────────────────────────────

  async run(
    brief: ContentBrief,
    research: ResearchPackage,
    outline: ArticleOutline,
    draftVersion: number = 1,
    editorFeedback?: string
  ): Promise<AgentRunResult<ArticleDraft>> {
    return this.timed(
      { brief, research, outline, draftVersion, editorFeedback },
      async (input) => {
        const userMessage = JSON.stringify({
          brief:           input.brief,
          research:        input.research,
          outline:         input.outline,
          draft_version:   input.draftVersion,
          editor_feedback: input.editorFeedback ?? null,
        });

        const rawResponse = await this.call(userMessage);
        const draft       = this.parse(rawResponse, ArticleDraftSchema);

        // Enforce draft_version matches what we passed in
        const output: ArticleDraft = {
          ...draft,
          draft_version: input.draftVersion,
          word_count:    countWords(draft.body),
        };

        // Flag word count violations
        const wordCountWarning = checkWordCountRange(
          output.word_count,
          input.brief.estimated_word_count
        );
        if (wordCountWarning) {
          logger.warn(`[DraftAgent] ${wordCountWarning}`);
        }

        return { output, rawResponse };
      }
    );
  }
}