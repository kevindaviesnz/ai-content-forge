import chalk from "chalk";
import ora, { Ora } from "ora";

// ─── Log Levels ───────────────────────────────────────────────────────────────

export type LogLevel = "info" | "success" | "warn" | "error" | "debug";

// ─── Colour Palette ───────────────────────────────────────────────────────────

const colours = {
  info:    chalk.cyan,
  success: chalk.green,
  warn:    chalk.yellow,
  error:   chalk.red,
  debug:   chalk.gray,
  agent:   chalk.magenta.bold,
  label:   chalk.white.bold,
  dim:     chalk.dim,
  bold:    chalk.bold,
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const icons = {
  info:    "ℹ",
  success: "✓",
  warn:    "⚠",
  error:   "✗",
  debug:   "·",
  agent:   "◆",
  run:     "▶",
  time:    "⏱",
};

// ─── Timestamp ────────────────────────────────────────────────────────────────

function timestamp(): string {
  return colours.dim(new Date().toISOString().replace("T", " ").slice(0, 19));
}

// ─── Core Logger ──────────────────────────────────────────────────────────────

export const logger = {

  info(message: string): void {
    console.log(`${timestamp()} ${colours.info(icons.info)} ${message}`);
  },

  success(message: string): void {
    console.log(`${timestamp()} ${colours.success(icons.success)} ${colours.success(message)}`);
  },

  warn(message: string): void {
    console.warn(`${timestamp()} ${colours.warn(icons.warn)} ${colours.warn(message)}`);
  },

  error(message: string, err?: unknown): void {
    console.error(`${timestamp()} ${colours.error(icons.error)} ${colours.error(message)}`);
    if (err instanceof Error) {
      console.error(colours.dim(`  ${err.message}`));
      if (err.stack) {
        console.error(colours.dim(err.stack.split("\n").slice(1).join("\n")));
      }
    }
  },

  debug(message: string): void {
    if (process.env.DEBUG === "true") {
      console.log(`${timestamp()} ${colours.debug(icons.debug)} ${colours.debug(message)}`);
    }
  },

  // ─── Agent-Specific Logging ─────────────────────────────────────────────────

  /**
   * Logs a completed agent stage with timing.
   * Format: [AgentName] ✓ completed in 3.2s
   */
  agentComplete(agentName: string, durationMs: number, provider: string, model: string): void {
    const duration = (durationMs / 1000).toFixed(1);
    const agentLabel = colours.agent(`[${agentName}]`);
    const status    = colours.success(`${icons.success} completed`);
    const time      = colours.dim(`in ${duration}s`);
    const meta      = colours.dim(`(${provider} / ${model})`);
    console.log(`${timestamp()} ${agentLabel} ${status} ${time} ${meta}`);
  },

  agentStart(agentName: string, provider: string, model: string): void {
    const agentLabel = colours.agent(`[${agentName}]`);
    const meta       = colours.dim(`(${provider} / ${model})`);
    console.log(`${timestamp()} ${agentLabel} ${colours.info("starting...")} ${meta}`);
  },

  agentError(agentName: string, message: string): void {
    const agentLabel = colours.agent(`[${agentName}]`);
    console.error(`${timestamp()} ${agentLabel} ${colours.error(`${icons.error} ${message}`)}`);
  },

  agentRetry(agentName: string, attempt: number, maxRetries: number, delayMs: number): void {
    const agentLabel = colours.agent(`[${agentName}]`);
    const msg = colours.warn(
      `${icons.warn} retry ${attempt}/${maxRetries} — waiting ${(delayMs / 1000).toFixed(1)}s`
    );
    console.warn(`${timestamp()} ${agentLabel} ${msg}`);
  },

  redraft(attempt: number, maxAttempts: number): void {
    console.log(
      `${timestamp()} ${colours.warn("↩")} ` +
      colours.warn(`Quality threshold not met — redraft ${attempt}/${maxAttempts}`)
    );
  },

  // ─── Pipeline Header / Footer ───────────────────────────────────────────────

  pipelineStart(topic: string, runId: string, provider: string): void {
    const divider = colours.dim("─".repeat(60));
    console.log(`\n${divider}`);
    console.log(`  ${colours.bold("ContentForge")} ${colours.dim("·")} Multi-Agent Content Pipeline`);
    console.log(`  ${colours.label("Topic:")}    ${topic}`);
    console.log(`  ${colours.label("Run ID:")}   ${colours.dim(runId)}`);
    console.log(`  ${colours.label("Provider:")} ${provider}`);
    console.log(`${divider}\n`);
  },

  pipelineComplete(runId: string, durationMs: number, outputPath: string): void {
    const duration = (durationMs / 1000).toFixed(1);
    const divider  = colours.dim("─".repeat(60));
    console.log(`\n${divider}`);
    console.log(`  ${colours.success(`${icons.success} Pipeline complete`)} ${colours.dim(`in ${duration}s`)}`);
    console.log(`  ${colours.label("Run ID:")}  ${colours.dim(runId)}`);
    console.log(`  ${colours.label("Output:")}  ${outputPath}`);
    console.log(`${divider}\n`);
  },

  pipelineError(message: string, err?: unknown): void {
    const divider = colours.dim("─".repeat(60));
    console.error(`\n${divider}`);
    console.error(`  ${colours.error(`${icons.error} Pipeline failed`)}`);
    console.error(`  ${colours.error(message)}`);
    if (err instanceof Error) {
      console.error(`  ${colours.dim(err.message)}`);
    }
    console.error(`${divider}\n`);
  },

  // ─── Summary Table ───────────────────────────────────────────────────────────

  summaryTable(rows: Array<{ agent: string; provider: string; model: string; duration: string; status: string }>): void {
    console.log(`\n  ${colours.bold("Run Summary")}\n`);
    const header = [
      colours.label("Agent".padEnd(18)),
      colours.label("Provider".padEnd(12)),
      colours.label("Model".padEnd(30)),
      colours.label("Duration".padEnd(10)),
      colours.label("Status"),
    ].join("  ");
    console.log(`  ${header}`);
    console.log(`  ${colours.dim("─".repeat(80))}`);
    for (const row of rows) {
      const status = row.status === "✓"
        ? colours.success(row.status)
        : colours.error(row.status);
      const line = [
        colours.agent(row.agent.padEnd(18)),
        row.provider.padEnd(12),
        colours.dim(row.model.padEnd(30)),
        row.duration.padEnd(10),
        status,
      ].join("  ");
      console.log(`  ${line}`);
    }
    console.log();
  },

  // ─── Spinner ─────────────────────────────────────────────────────────────────

  spinner(text: string): Ora {
    return ora({
      text,
      spinner: "dots",
      color: "cyan",
    }).start();
  },
};