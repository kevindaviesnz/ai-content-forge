import { z } from "zod";
import {
  ContentBriefSchema,
  ResearchPackageSchema,
  ArticleOutlineSchema,
  ArticleDraftSchema,
  EditedArticleSchema,
  PublishedArticleSchema,
  QualityScoresSchema,
  OutlineSectionSchema,
  LLMConfigSchema,
  RunMetadataSchema,
  ClarificationSchema,
  ContentTypeEnum,
  ToneEnum,
  ProviderEnum,
} from "./schemas.js";

// ─── Inferred TypeScript Types ────────────────────────────────────────────────
// All types are derived directly from Zod schemas — single source of truth.

export type ContentType = z.infer<typeof ContentTypeEnum>;
export type Tone = z.infer<typeof ToneEnum>;
export type Provider = z.infer<typeof ProviderEnum>;

export type ContentBrief = z.infer<typeof ContentBriefSchema>;
export type ResearchPackage = z.infer<typeof ResearchPackageSchema>;
export type OutlineSection = z.infer<typeof OutlineSectionSchema>;
export type ArticleOutline = z.infer<typeof ArticleOutlineSchema>;
export type ArticleDraft = z.infer<typeof ArticleDraftSchema>;
export type QualityScores = z.infer<typeof QualityScoresSchema>;
export type EditedArticle = z.infer<typeof EditedArticleSchema>;
export type PublishedArticle = z.infer<typeof PublishedArticleSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type RunMetadata = z.infer<typeof RunMetadataSchema>;
export type Clarification = z.infer<typeof ClarificationSchema>;

// ─── LLM Adapter Interface ────────────────────────────────────────────────────
// All provider adapters must implement this interface.
// No provider-specific logic may leak outside of adapter implementations.

export interface LLMProvider {
  readonly providerName: Provider;
  readonly modelName: string;

  /**
   * Send a prompt to the LLM and return the raw text response.
   * @param systemPrompt  The agent's system prompt (loaded from /prompts/)
   * @param userMessage   The structured input message for this call
   * @param config        Per-call overrides for model, temperature, max_tokens
   */
  call(
    systemPrompt: string,
    userMessage: string,
    config?: Partial<LLMConfig>
  ): Promise<string>;
}

// ─── Base Agent Interface ─────────────────────────────────────────────────────

export interface IBaseAgent {
  readonly name: string;
  readonly model: string;

  /** Load this agent's system prompt from /prompts/<name>.md */
  loadPrompt(): Promise<string>;

  /** Send a message to the LLM using this agent's provider */
  call(inputMessage: string): Promise<string>;

  /** Parse the LLM's raw JSON response into a typed object */
  parse<T>(responseText: string, schema: z.ZodSchema<T>): T;
}

// ─── Agent Run Result ─────────────────────────────────────────────────────────
// Wraps each agent's output with timing and provider metadata for logging.

export interface AgentRunResult<T> {
  agentName: string;
  provider: Provider;
  model: string;
  durationMs: number;
  output: T;
  rawResponse: string;
}

// ─── Orchestrator Config ──────────────────────────────────────────────────────

export interface OrchestratorConfig {
  /** Default provider for all agents unless overridden */
  defaultProvider: Provider;

  /** Per-agent provider overrides (null = use defaultProvider) */
  agentProviders: Record<string, Provider | null>;

  /** Provider-to-model mapping */
  models: Record<Provider, string>;

  /** Maximum number of redraft cycles before proceeding regardless */
  maxRedraftAttempts: number;

  /** Retry configuration for API failures */
  retryConfig: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
}

// ─── Config File Shape ────────────────────────────────────────────────────────

export interface ConfigFile {
  defaultProvider: Provider;
  agentProviders: Record<string, Provider | null>;
  models: Record<string, string>;
  maxRedraftAttempts: number;
  retryConfig: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
}