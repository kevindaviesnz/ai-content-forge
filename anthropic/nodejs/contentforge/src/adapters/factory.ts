import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { Provider, LLMProvider, ConfigFile, OrchestratorConfig } from "../models/index.js";
import { AnthropicAdapter } from "./anthropic.adapter";
import { OpenAIAdapter } from "./openai.adapter";
import { GeminiAdapter } from "./gemini.adapter";
import { GrokAdapter } from "./grok.adapter";

dotenv.config();

/**
 * Reads config.json and merges with environment variable overrides.
 * Environment variables always win over config.json values.
 */
export function loadConfig(): OrchestratorConfig {
  const configPath = path.resolve(process.cwd(), "config.json");

  if (!fs.existsSync(configPath)) {
    throw new Error(`config.json not found at ${configPath}`);
  }

  const raw: ConfigFile = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  // ENV overrides for default provider
  const defaultProvider = (
    process.env.LLM_PROVIDER ?? raw.defaultProvider
  ) as Provider;

  // ENV overrides for per-agent providers
  const agentProviders: Record<string, Provider | null> = {
    ...raw.agentProviders,
    ...(process.env.BRIEF_AGENT_PROVIDER
      ? { BriefAgent: process.env.BRIEF_AGENT_PROVIDER as Provider }
      : {}),
    ...(process.env.RESEARCH_AGENT_PROVIDER
      ? { ResearchAgent: process.env.RESEARCH_AGENT_PROVIDER as Provider }
      : {}),
    ...(process.env.OUTLINE_AGENT_PROVIDER
      ? { OutlineAgent: process.env.OUTLINE_AGENT_PROVIDER as Provider }
      : {}),
    ...(process.env.DRAFT_AGENT_PROVIDER
      ? { DraftAgent: process.env.DRAFT_AGENT_PROVIDER as Provider }
      : {}),
    ...(process.env.EDITOR_AGENT_PROVIDER
      ? { EditorAgent: process.env.EDITOR_AGENT_PROVIDER as Provider }
      : {}),
    ...(process.env.PUBLISH_AGENT_PROVIDER
      ? { PublishAgent: process.env.PUBLISH_AGENT_PROVIDER as Provider }
      : {}),
  };

  // ENV overrides for model names
  const models: Record<Provider, string> = {
    anthropic: process.env.ANTHROPIC_MODEL ?? raw.models["anthropic"] ?? "claude-sonnet-4-5-20250929",
    openai:    process.env.OPENAI_MODEL    ?? raw.models["openai"]    ?? "gpt-4o",
    gemini:    process.env.GEMINI_MODEL    ?? raw.models["gemini"]    ?? "gemini-1.5-pro",
    grok:      process.env.GROK_MODEL      ?? raw.models["grok"]      ?? "grok-beta",
  };

  return {
    defaultProvider,
    agentProviders,
    models,
    maxRedraftAttempts: raw.maxRedraftAttempts ?? 3,
    retryConfig: raw.retryConfig ?? {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
    },
  };
}

/**
 * Resolves which provider an agent should use:
 *   1. Per-agent override in config/env
 *   2. Global default provider
 */
export function resolveProviderForAgent(
  agentName: string,
  config: OrchestratorConfig
): Provider {
  return config.agentProviders[agentName] ?? config.defaultProvider;
}

/**
 * Factory function — instantiates the correct adapter for a given provider.
 * This is the only place in the codebase that imports concrete adapter classes.
 * Agent code never calls this directly — the orchestrator does.
 */
export function createAdapter(
  provider: Provider,
  config: OrchestratorConfig
): LLMProvider {
  const model = config.models[provider];

  switch (provider) {
    case "anthropic": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
      return new AnthropicAdapter(apiKey, model);
    }

    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
      return new OpenAIAdapter(apiKey, model);
    }

    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
      return new GeminiAdapter(apiKey, model);
    }

    case "grok": {
      const apiKey = process.env.GROK_API_KEY;
      if (!apiKey) throw new Error("GROK_API_KEY is not set");
      return new GrokAdapter(apiKey, model);
    }

    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown provider: ${_exhaustive}`);
    }
  }
}

/**
 * Convenience: create the right adapter for a named agent,
 * using the full config to resolve provider + model.
 */
export function createAdapterForAgent(
  agentName: string,
  config: OrchestratorConfig
): LLMProvider {
  const provider = resolveProviderForAgent(agentName, config);
  return createAdapter(provider, config);
}