import {
  ContentBrief,
  ResearchPackage,
  ArticleOutline,
  ArticleDraft,
  EditedArticle,
  PublishedArticle,
  OrchestratorConfig,
  RunMetadata,
  Provider,
} from "./models/index.js";
import {
  BriefAgent,
  ResearchAgent,
  OutlineAgent,
  DraftAgent,
  EditorAgent,
  PublishAgent,
} from "./agents/index.js";
import { createAdapterForAgent } from "./adapters/index.js";
import {
  logger,
  generateRunId,
  createRunDirectory,
  saveAgentResult,
  saveRunMetadata,
} from "./utils/index.js";

/**
 * Orchestrator — the brain of ContentForge.
 *
 * Responsibilities:
 *  1. Instantiate all six agents with the correct LLM provider adapters
 *  2. Run the pipeline in sequence: Brief → Research → Outline → Draft → Editor → Publish
 *  3. Handle the editor critique loop (max 3 redrafts)
 *  4. Save all intermediate outputs and metadata to the run directory
 *  5. Generate the final summary table
 */
export class Orchestrator {
  private config: OrchestratorConfig;
  private runId: string;
  private runDir: string;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.runId  = generateRunId();
    this.runDir = createRunDirectory(this.runId);
  }

  // ─── Run Pipeline ─────────────────────────────────────────────────────────────

  async run(topic: string): Promise<void> {
    const pipelineStart = Date.now();

    logger.pipelineStart(topic, this.runId, this.config.defaultProvider);

    // Track which provider each agent used (for metadata)
    const agentProviders: Record<string, string> = {};

    // Track run summary rows (for final table)
    const summaryRows: Array<{
      agent:    string;
      provider: string;
      model:    string;
      duration: string;
      status:   string;
    }> = [];

    // Initialize metadata
    const metadata: RunMetadata = {
      run_id:          this.runId,
      topic,
      started_at:      new Date().toISOString(),
      provider_used:   this.config.defaultProvider,
      agent_providers: {},
      redraft_count:   0,
      success:         false,
    };

    try {
      // ─── 1. BriefAgent ──────────────────────────────────────────────────────────

      const briefAgent   = this.createAgent("BriefAgent") as BriefAgent;
      const briefResult  = await briefAgent.run(topic);
      const brief        = briefResult.output;

      saveAgentResult(this.runDir, briefResult);
      agentProviders.BriefAgent = briefResult.provider;
      summaryRows.push({
        agent:    "BriefAgent",
        provider: briefResult.provider,
        model:    briefResult.model,
        duration: `${(briefResult.durationMs / 1000).toFixed(1)}s`,
        status:   "✓",
      });

      // ─── 2. ResearchAgent ───────────────────────────────────────────────────────

      const researchAgent  = this.createAgent("ResearchAgent") as ResearchAgent;
      const researchResult = await researchAgent.run(brief);
      const research       = researchResult.output;

      saveAgentResult(this.runDir, researchResult);
      agentProviders.ResearchAgent = researchResult.provider;
      summaryRows.push({
        agent:    "ResearchAgent",
        provider: researchResult.provider,
        model:    researchResult.model,
        duration: `${(researchResult.durationMs / 1000).toFixed(1)}s`,
        status:   "✓",
      });

      // ─── 3. OutlineAgent ────────────────────────────────────────────────────────

      const outlineAgent  = this.createAgent("OutlineAgent") as OutlineAgent;
      const outlineResult = await outlineAgent.run(brief, research);
      const outline       = outlineResult.output;

      saveAgentResult(this.runDir, outlineResult);
      agentProviders.OutlineAgent = outlineResult.provider;
      summaryRows.push({
        agent:    "OutlineAgent",
        provider: outlineResult.provider,
        model:    outlineResult.model,
        duration: `${(outlineResult.durationMs / 1000).toFixed(1)}s`,
        status:   "✓",
      });

      // ─── 4. DraftAgent + Editor Critique Loop ───────────────────────────────────

      const draftAgent  = this.createAgent("DraftAgent") as DraftAgent;
      const editorAgent = this.createAgent("EditorAgent") as EditorAgent;

      let draft: ArticleDraft;
      let edited: EditedArticle;
      let draftVersion    = 1;
      let editorFeedback: string | undefined;

      const maxAttempts = this.config.maxRedraftAttempts;

      for (let attempt = 1; attempt <= maxAttempts + 1; attempt++) {
        // Draft
        const draftResult = await draftAgent.run(
          brief,
          research,
          outline,
          draftVersion,
          editorFeedback
        );
        draft = draftResult.output;

        saveAgentResult(this.runDir, {
          ...draftResult,
          agentName: `DraftAgent_v${draftVersion}`,
        });

        if (attempt === 1) {
          agentProviders.DraftAgent = draftResult.provider;
          summaryRows.push({
            agent:    `DraftAgent (v${draftVersion})`,
            provider: draftResult.provider,
            model:    draftResult.model,
            duration: `${(draftResult.durationMs / 1000).toFixed(1)}s`,
            status:   "✓",
          });
        } else {
          summaryRows.push({
            agent:    `DraftAgent (v${draftVersion})`,
            provider: draftResult.provider,
            model:    draftResult.model,
            duration: `${(draftResult.durationMs / 1000).toFixed(1)}s`,
            status:   "↻",
          });
        }

        // Editor
        const editorResult = await editorAgent.run(brief, draft);
        edited = editorResult.output;

        saveAgentResult(this.runDir, {
          ...editorResult,
          agentName: `EditorAgent_v${draftVersion}`,
        });

        if (attempt === 1) {
          agentProviders.EditorAgent = editorResult.provider;
        }

        summaryRows.push({
          agent:    `EditorAgent (v${draftVersion})`,
          provider: editorResult.provider,
          model:    editorResult.model,
          duration: `${(editorResult.durationMs / 1000).toFixed(1)}s`,
          status:   edited.passed_quality_threshold ? "✓" : "⚠",
        });

        // If passed or out of attempts, break
        if (edited.passed_quality_threshold || attempt > maxAttempts) {
          break;
        }

        // Redraft needed
        logger.redraft(attempt, maxAttempts);
        metadata.redraft_count++;
        draftVersion++;
        editorFeedback = edited.feedback_for_redraft;
      }

      // ─── 5. PublishAgent ────────────────────────────────────────────────────────

      const publishAgent  = this.createAgent("PublishAgent", this.runDir) as PublishAgent;
      const publishResult = await publishAgent.run(edited!);
      const published     = publishResult.output;

      saveAgentResult(this.runDir, publishResult);
      agentProviders.PublishAgent = publishResult.provider;
      summaryRows.push({
        agent:    "PublishAgent",
        provider: publishResult.provider,
        model:    publishResult.model,
        duration: `${(publishResult.durationMs / 1000).toFixed(1)}s`,
        status:   "✓",
      });

      // ─── Success ─────────────────────────────────────────────────────────────────

      const pipelineEnd = Date.now();

      metadata.completed_at    = new Date().toISOString();
      metadata.agent_providers = agentProviders;
      metadata.success         = true;

      saveRunMetadata(this.runDir, metadata);

      logger.summaryTable(summaryRows);
      logger.pipelineComplete(
        this.runId,
        pipelineEnd - pipelineStart,
        `output/${this.runId}/`
      );

    } catch (err) {
      metadata.success = false;
      metadata.error   = err instanceof Error ? err.message : String(err);
      saveRunMetadata(this.runDir, metadata);

      logger.pipelineError("Pipeline execution failed", err);
      throw err;
    }
  }

  // ─── Agent Instantiation ──────────────────────────────────────────────────────

  /**
   * Creates an agent instance with the correct LLM provider adapter.
   * The factory resolves which provider to use based on config + env.
   */
  private createAgent(
    agentName: string,
    ...args: unknown[]
  ): BriefAgent | ResearchAgent | OutlineAgent | DraftAgent | EditorAgent | PublishAgent {
    const adapter = createAdapterForAgent(agentName, this.config);
    const retryConfig = this.config.retryConfig;

    switch (agentName) {
      case "BriefAgent":
        return new BriefAgent(adapter, retryConfig);

      case "ResearchAgent":
        return new ResearchAgent(adapter, retryConfig);

      case "OutlineAgent":
        return new OutlineAgent(adapter, retryConfig);

      case "DraftAgent":
        return new DraftAgent(adapter, retryConfig);

      case "EditorAgent":
        return new EditorAgent(adapter, retryConfig);

      case "PublishAgent":
        // PublishAgent needs the runDir
        if (typeof args[0] !== "string") {
          throw new Error("PublishAgent requires runDir as first argument");
        }
        return new PublishAgent(adapter, retryConfig, args[0]);

      default:
        throw new Error(`Unknown agent: ${agentName}`);
    }
  }
}