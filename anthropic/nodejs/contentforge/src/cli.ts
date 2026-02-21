#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { Orchestrator } from "./orchestrator.js";
import { loadConfig } from "./adapters/index.js";
import { listRuns, loadRunOutputs, logger } from "./utils/index.js";

const program = new Command();

program
  .name("contentforge")
  .description("Multi-agent AI content creation pipeline")
  .version("1.0.0");

// ─── Run Command ──────────────────────────────────────────────────────────────

program
  .command("run")
  .description("Run the full content pipeline on a topic")
  .argument("<topic>", "The topic or subject for the article")
  .action(async (topic: string) => {
    try {
      const config = loadConfig();
      const orchestrator = new Orchestrator(config);
      await orchestrator.run(topic);
      process.exit(0);
    } catch (err) {
      logger.error("Run command failed", err);
      process.exit(1);
    }
  });

// ─── Agent Command ────────────────────────────────────────────────────────────

program
  .command("agent")
  .description("Run a single agent for testing (advanced)")
  .argument("<agentName>", "Agent to run (BriefAgent, ResearchAgent, etc.)")
  .argument("<input>", "Input as JSON string")
  .action(async (agentName: string, inputJson: string) => {
    logger.warn(
      "Single-agent mode is for testing only. " +
      "Outputs are not saved to the run directory."
    );

    try {
      const config = loadConfig();
      const { createAdapterForAgent } = await import("./adapters/index.js");
      const adapter = createAdapterForAgent(agentName, config);

      let agentClass;
      switch (agentName) {
        case "BriefAgent":
          agentClass = (await import("./agents/index.js")).BriefAgent;
          break;
        case "ResearchAgent":
          agentClass = (await import("./agents/index.js")).ResearchAgent;
          break;
        case "OutlineAgent":
          agentClass = (await import("./agents/index.js")).OutlineAgent;
          break;
        case "DraftAgent":
          agentClass = (await import("./agents/index.js")).DraftAgent;
          break;
        case "EditorAgent":
          agentClass = (await import("./agents/index.js")).EditorAgent;
          break;
        case "PublishAgent":
          logger.error("PublishAgent requires a run directory — use 'contentforge run' instead");
          process.exit(1);
        default:
          logger.error(`Unknown agent: ${agentName}`);
          process.exit(1);
      }

      const agent = new agentClass(adapter, config.retryConfig);
      const input = JSON.parse(inputJson);

      logger.info(`Running ${agentName} in standalone mode...`);
      const result = await (agent as any).run(...(Array.isArray(input) ? input : [input]));

      console.log("\n" + chalk.bold("Output:"));
      console.log(JSON.stringify(result.output, null, 2));

      process.exit(0);
    } catch (err) {
      logger.error("Agent command failed", err);
      process.exit(1);
    }
  });

// ─── Runs Command ─────────────────────────────────────────────────────────────

program
  .command("runs")
  .description("List all previous pipeline runs")
  .action(() => {
    try {
      const runs = listRuns();

      if (runs.length === 0) {
        console.log(chalk.dim("\nNo runs found. Use 'contentforge run <topic>' to create one.\n"));
        process.exit(0);
      }

      console.log(chalk.bold("\nPrevious Runs:\n"));

      const header = [
        chalk.bold("Run ID".padEnd(24)),
        chalk.bold("Topic".padEnd(50)),
        chalk.bold("Started".padEnd(20)),
        chalk.bold("Status"),
      ].join("  ");

      console.log(header);
      console.log(chalk.dim("─".repeat(110)));

      for (const run of runs) {
        const status = run.success
          ? chalk.green("✓ Success")
          : chalk.red("✗ Failed");

        const date = new Date(run.startedAt).toLocaleString();
        const topic = run.topic.length > 48
          ? run.topic.slice(0, 45) + "..."
          : run.topic;

        console.log(
          [
            chalk.cyan(run.runId.padEnd(24)),
            topic.padEnd(50),
            chalk.dim(date.padEnd(20)),
            status,
          ].join("  ")
        );
      }

      console.log();
      process.exit(0);
    } catch (err) {
      logger.error("Runs command failed", err);
      process.exit(1);
    }
  });

// ─── Show Command ─────────────────────────────────────────────────────────────

program
  .command("show")
  .description("Show details of a specific run")
  .argument("<runId>", "The run ID to inspect")
  .action((runId: string) => {
    try {
      const outputs = loadRunOutputs(runId);

      console.log(chalk.bold(`\nRun: ${runId}\n`));

      if (outputs.metadata) {
        const meta = outputs.metadata as any;
        console.log(chalk.bold("Metadata:"));
        console.log(`  Topic:     ${meta.topic}`);
        console.log(`  Started:   ${new Date(meta.started_at).toLocaleString()}`);
        console.log(`  Completed: ${meta.completed_at ? new Date(meta.completed_at).toLocaleString() : "—"}`);
        console.log(`  Provider:  ${meta.provider_used}`);
        console.log(`  Redrafts:  ${meta.redraft_count}`);
        console.log(`  Success:   ${meta.success ? chalk.green("✓") : chalk.red("✗")}`);
        if (meta.error) {
          console.log(`  Error:     ${chalk.red(meta.error)}`);
        }
        console.log();
      }

      console.log(chalk.bold("Agent Outputs:"));
      const agents = Object.keys(outputs).filter((k) => k !== "metadata");

      if (agents.length === 0) {
        console.log(chalk.dim("  No agent outputs found."));
      } else {
        for (const agentKey of agents) {
          console.log(`  ${chalk.cyan(agentKey)}`);
        }
      }

      console.log(
        chalk.dim(`\nRun directory: output/${runId}/\n`)
      );

      process.exit(0);
    } catch (err) {
      logger.error("Show command failed", err);
      process.exit(1);
    }
  });

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parse();