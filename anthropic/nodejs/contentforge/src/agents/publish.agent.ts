import * as path from "path";
import {
  EditedArticle,
  PublishedArticle,
  PublishedArticleSchema,
  AgentRunResult,
  LLMProvider,
} from "../models/index.js";
import {
  RetryConfig,
  countWords,
  estimateReadingTime,
  savePublishedArticle,
  logger,
} from "../utils/index.js";
import { BaseAgent } from "./base.agent.js";

/**
 * PublishAgent — sixth and final agent in the pipeline.
 *
 * Takes the edited article and formats it into a clean, publish-ready
 * Markdown document. Adds:
 *   - A frontmatter-style header (title, description, tags, reading time)
 *   - A meta description (SEO-friendly, 150–160 chars)
 *   - Taxonomy tags
 *   - Reading time estimate
 *
 * Writes the final .md file to /output/<runId>/<slug>.md
 */
export class PublishAgent extends BaseAgent {
  readonly name = "PublishAgent";

  private runDir: string;

  constructor(provider: LLMProvider, retryConfig: RetryConfig, runDir: string) {
    super(provider, retryConfig);
    this.runDir = runDir;
  }

  async run(
    editedArticle: EditedArticle
  ): Promise<AgentRunResult<PublishedArticle>> {
    return this.timed(editedArticle, async (article) => {
      const userMessage = JSON.stringify({ edited_article: article });
      const rawResponse = await this.call(userMessage);
      const published   = this.parse(rawResponse, PublishedArticleSchema);

      // Recompute metrics from actual content
      const wordCount      = countWords(published.markdown);
      const readingTime    = estimateReadingTime(wordCount);

      const output: PublishedArticle = {
        ...published,
        word_count:           wordCount,
        reading_time_minutes: readingTime,
      };

      // Write the final .md file to the run directory
      const filePath = savePublishedArticle(this.runDir, output);
      logger.success(`[PublishAgent] Article written → ${path.relative(process.cwd(), filePath)}`);

      return { output, rawResponse };
    });
  }
}