#!/usr/bin/env node
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { Orchestrator } from './orchestrator';
import { BriefAgent } from './agents/brief';
import chalk from 'chalk';

dotenv.config();

const program = new Command();

program
  .name('contentforge')
  .description('AI Content Generation Pipeline')
  .version('1.0.0');

program
  .command('run')
  .description('Run the full content generation pipeline')
  .argument('<topic>', 'The raw topic or idea')
  .action(async (topic) => {
    const orchestrator = new Orchestrator();
    await orchestrator.run(topic);
  });

program
  .command('agent')
  .description('Run a specific agent for testing')
  .argument('<agent>', 'Agent name (brief, research, etc.)')
  .argument('<input>', 'Input string (for brief) or file path (for others)')
  .action(async (agentName, input) => {
    // Simplified CLI for testing single agents
    // In a full implementation, this would load previous JSON outputs for inputs
    if (agentName === 'brief') {
        const agent = new BriefAgent();
        const result = await agent.run(input);
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log(chalk.yellow('Single agent testing for downstream agents requires JSON input piping. Please use the full run command for this demo.'));
    }
  });

program.parse(process.argv);