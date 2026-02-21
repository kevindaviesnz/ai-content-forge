import * as fs   from "fs";
import * as path from "path";
import { logger } from "./logger.js";
import {
  RunMetadata,
  PublishedArticle,
  AgentRunResult,
} from "../models/index.js";

// ─── Run Directory ────────────────────────────────────────────────────────────

/**
 * Generates a unique run ID based on the current timestamp.
 * Format: run_20240315_142301
 */
export function generateRunId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toTimeString().slice(0, 8).replace(/:/g, "");
  return `run_${date}_${time}`;
}

/**
 * Resolves and creates the output directory for a run.
 * Always at: <cwd>/output/<runId>/
 */
export function createRunDirectory(runId: string): string {
  const dir = path.resolve(process.cwd(), "output", runId);
  fs.mkdirSync(dir, { recursive: true });
  logger.debug(`Run directory created: ${dir}`);
  return dir;
}

/**
 * Returns the run directory path without creating it.
 */
export function getRunDirectory(runId: string): string {
  return path.resolve(process.cwd(), "output", runId);
}

// ─── JSON Persistence ─────────────────────────────────────────────────────────

/**
 * Saves any serialisable value as a pretty-printed JSON file.
 */
export function saveJSON(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  logger.debug(`Saved JSON: ${filePath}`);
}

/**
 * Reads and parses a JSON file. Returns null if the file does not exist.
 */
export function readJSON<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

// ─── Agent Output Persistence ─────────────────────────────────────────────────

/**
 * Saves an agent's run result to the run directory.
 * Files are named: <agentName>.json (e.g. BriefAgent.json)
 * Also saves the raw LLM response as <agentName>.raw.txt for debugging.
 */
export function saveAgentResult<T>(
  runDir: string,
  result: AgentRunResult<T>
): void {
  const baseName = result.agentName.replace(/\s+/g, "_");

  // Structured output
  saveJSON(path.join(runDir, `${baseName}.json`), {
    agentName:   result.agentName,
    provider:    result.provider,
    model:       result.model,
    durationMs:  result.durationMs,
    output:      result.output,
  });

  // Raw LLM response (useful for debugging prompt issues)
  fs.writeFileSync(
    path.join(runDir, `${baseName}.raw.txt`),
    result.rawResponse,
    "utf-8"
  );
}

// ─── Run Metadata ─────────────────────────────────────────────────────────────

/**
 * Saves the run metadata file (metadata.json) to the run directory.
 * This is written at the start and updated at the end of each run.
 */
export function saveRunMetadata(runDir: string, metadata: RunMetadata): void {
  saveJSON(path.join(runDir, "metadata.json"), metadata);
}

// ─── Published Article Output ─────────────────────────────────────────────────

/**
 * Writes the final published article as a clean .md file.
 * Filename is derived from the article title (slugified).
 * Returns the path to the written file.
 */
export function savePublishedArticle(
  runDir: string,
  article: PublishedArticle
): string {
  const slug = slugify(article.title);
  const filename = `${slug}.md`;
  const filePath = path.join(runDir, filename);
  fs.writeFileSync(filePath, article.markdown, "utf-8");
  logger.debug(`Published article saved: ${filePath}`);
  return filePath;
}

// ─── Run Listing ──────────────────────────────────────────────────────────────

export interface RunSummary {
  runId:     string;
  topic:     string;
  startedAt: string;
  success:   boolean;
  provider:  string;
}

/**
 * Lists all previous runs by scanning the output directory.
 * Returns an array of run summaries, sorted newest-first.
 */
export function listRuns(): RunSummary[] {
  const outputDir = path.resolve(process.cwd(), "output");

  if (!fs.existsSync(outputDir)) return [];

  const entries = fs.readdirSync(outputDir, { withFileTypes: true });
  const runs: RunSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("run_")) continue;

    const metaPath = path.join(outputDir, entry.name, "metadata.json");
    const meta = readJSON<RunMetadata>(metaPath);

    if (meta) {
      runs.push({
        runId:     meta.run_id,
        topic:     meta.topic,
        startedAt: meta.started_at,
        success:   meta.success,
        provider:  meta.provider_used,
      });
    }
  }

  return runs.sort((a, b) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

/**
 * Loads all agent outputs for a specific run, for display or inspection.
 */
export function loadRunOutputs(runId: string): Record<string, unknown> {
  const runDir = getRunDirectory(runId);

  if (!fs.existsSync(runDir)) {
    throw new Error(`Run not found: ${runId}`);
  }

  const files  = fs.readdirSync(runDir);
  const result: Record<string, unknown> = {};

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const key  = file.replace(".json", "");
    result[key] = readJSON(path.join(runDir, file));
  }

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a title string into a URL-safe slug.
 * "The Impact of Sleep Deprivation" → "the-impact-of-sleep-deprivation"
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/**
 * Counts words in a string (splits on whitespace).
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Calculates reading time in minutes, assuming 200 words per minute.
 */
export function estimateReadingTime(wordCount: number): number {
  return Math.max(0.5, Math.round((wordCount / 200) * 10) / 10);
}

/**
 * Checks whether a draft word count is within the acceptable range
 * (±20% of the brief's target). Returns a warning string or null.
 */
export function checkWordCountRange(
  actual: number,
  target: number
): string | null {
  const low  = target * 0.8;
  const high = target * 1.2;

  if (actual < low) {
    return `Word count ${actual} is ${Math.round(((target - actual) / target) * 100)}% below target (${target})`;
  }
  if (actual > high) {
    return `Word count ${actual} is ${Math.round(((actual - target) / target) * 100)}% above target (${target})`;
  }
  return null;
}