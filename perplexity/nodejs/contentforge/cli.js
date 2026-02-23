#!/usr/bin/env node
import { runPipeline } from './orchestrator.js';
import fs from 'fs-extra';
import chalk from 'chalk';

const [, , command, ...args] = process.argv;

async function main() {
  switch (command) {
    case 'run': {
      const topic = args.join(' ');
      if (!topic) {
        console.error(chalk.red('Error: No topic provided.'));
        process.exit(1);
      }
      await runPipeline(topic);
      break;
    }

    case 'agent': {
      const [agentName, ...topicParts] = args;
      const topic = topicParts.join(' ');
      if (!agentName || !topic) {
        console.error(chalk.red('Usage: contentforge agent <agentName> "Topic"'));
        process.exit(1);
      }
      const { testSingleAgent } = await import('./orchestrator.js');
      await testSingleAgent(agentName, topic);
      break;
    }

    case 'runs': {
      const outputDir = './output';
      if (!fs.existsSync(outputDir)) {
        console.log(chalk.yellow('No previous runs found.'));
        return;
      }
      fs.readdirSync(outputDir)
        .filter(f => f.startsWith('run_'))
        .forEach(f => console.log(chalk.green(f)));
      break;
    }

    case 'show': {
      const [runName] = args;
      if (!runName) {
        console.error(chalk.red('Usage: contentforge show <run_name>'));
        process.exit(1);
      }
      const runPath = `./output/${runName}`;
      if (!fs.existsSync(runPath)) {
        console.error(chalk.red('Run not found.'));
        process.exit(1);
      }
      const files = fs.readdirSync(runPath);
      for (const f of files) console.log(chalk.cyan(`- ${f}`));
      break;
    }

    default:
      console.log(chalk.blue('ContentForge CLI'));
      console.log(chalk.yellow(`
Commands:
  contentforge run "Topic"       Run full pipeline
  contentforge agent brief "..." Test a single agent
  contentforge runs              List previous runs
  contentforge show <run_name>   Show outputs from a run
      `));
  }
}

main();
