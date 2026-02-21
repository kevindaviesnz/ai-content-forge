import * as readline from "readline";
import {
  ContentBrief,
  ContentBriefSchema,
  ClarificationSchema,
  AgentRunResult,
  LLMProvider,
} from "../models/index.js";
import { RetryConfig, logger } from "../utils/index.js";
import { BaseAgent } from "./base.agent.js";

/**
 * BriefAgent — first agent in the pipeline.
 *
 * Takes a raw topic string and produces a structured ContentBrief.
 * If the topic is vague, asks up to 3 clarifying questions before
 * producing the brief. If the topic is clear, produces immediately.
 */
export class BriefAgent extends BaseAgent {
  readonly name = "BriefAgent";

  constructor(provider: LLMProvider, retryConfig: RetryConfig) {
    super(provider, retryConfig);
  }

  // ─── Run ─────────────────────────────────────────────────────────────────────

  async run(topic: string): Promise<AgentRunResult<ContentBrief>> {
    return this.timed(topic, async (t) => {
      const userMessage = JSON.stringify({ topic: t });
      const rawResponse = await this.call(userMessage);
      const clarification = this.parse(rawResponse, ClarificationSchema);

      // If the model says it needs clarification, enter the Q&A loop
      if (clarification.needs_clarification && clarification.questions?.length) {
        const answers = await this.askClarifyingQuestions(
          clarification.questions
        );

        // Second call with the original topic + answers
        const followUpMessage = JSON.stringify({
          topic: t,
          clarifications: answers,
        });

        const followUpResponse = await this.call(followUpMessage);
        const finalClarification = this.parse(
          followUpResponse,
          ClarificationSchema
        );

        if (!finalClarification.brief) {
          throw new Error(
            `[BriefAgent] Did not produce a brief after clarification.`
          );
        }

        const brief = this.parse(
          JSON.stringify(finalClarification.brief),
          ContentBriefSchema
        );

        return { output: brief, rawResponse: followUpResponse };
      }

      // Topic was clear — brief is ready immediately
      if (!clarification.brief) {
        throw new Error(
          `[BriefAgent] needs_clarification is false but no brief was returned.`
        );
      }

      const brief = this.parse(
        JSON.stringify(clarification.brief),
        ContentBriefSchema
      );

      return { output: brief, rawResponse };
    });
  }

  // ─── Clarifying Questions ─────────────────────────────────────────────────

  /**
   * Presents each clarifying question to the user via stdin and collects answers.
   * Returns an array of { question, answer } pairs.
   */
  private async askClarifyingQuestions(
    questions: string[]
  ): Promise<Array<{ question: string; answer: string }>> {
    const rl = readline.createInterface({
      input:  process.stdin,
      output: process.stdout,
    });

    const ask = (question: string): Promise<string> =>
      new Promise((resolve) => rl.question(question, resolve));

    console.log();
    logger.info("BriefAgent has a few questions to sharpen the brief:\n");

    const answers: Array<{ question: string; answer: string }> = [];

    for (let i = 0; i < questions.length; i++) {
      const q      = questions[i];
      const prompt = `  ${i + 1}. ${q}\n  › `;
      const answer = await ask(prompt);
      answers.push({ question: q, answer: answer.trim() });
      console.log();
    }

    rl.close();
    return answers;
  }
}