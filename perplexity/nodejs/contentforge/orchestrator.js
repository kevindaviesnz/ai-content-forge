import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';

import { BriefAgent } from './agents/briefAgent.js';
import { ResearchAgent } from './agents/researchAgent.js';
import { OutlineAgent } from './agents/outlineAgent.js';
import { DraftAgent } from './agents/draftAgent.js';
import { EditorAgent } from './agents/editorAgent.js';
import { PublishAgent } from './agents/publishAgent.js';

dotenv.config();

async function logStage(agent, action, fn) {
  const spinner = ora(`${chalk.cyan(`[${agent}]`)} ${action}...`).start();
  const start = Date.now();
  try {
    const result = await fn();
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    spinner.succeed(`${chalk.green(`[${agent}]`)} ✓ ${action} in ${duration}s`);
    return result;
  } catch (err) {
    spinner.fail(`${chalk.red(`[${agent}]`)} ✗ ${action}: ${err.message}`);
    throw err;
  }
}

function saveJson(runDir, name, data) {
  const file = path.join(runDir, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export async function runPipeline(topic) {
  const runDir = path.join('./output', `run_${Date.now()}`);
  await fs.ensureDir(runDir);
  
  console.log(chalk.blue(`\n🚀 ContentForge: "${topic}"`));
  console.log(chalk.gray(`📁 ${runDir}`));

  let brief = await logStage('BriefAgent', 'briefing', () => {
    const agent = new BriefAgent();
    return agent.run(topic);
  });
  saveJson(runDir, '01_brief', brief);

  let research = await logStage('ResearchAgent', 'researching', () => {
    const agent = new ResearchAgent();
    return agent.run(brief);
  });
  saveJson(runDir, '02_research', research);

  let outline = await logStage('OutlineAgent', 'outlining', () => {
    const agent = new OutlineAgent();
    return agent.run(brief, research);
  });
  saveJson(runDir, '03_outline', outline);

  let edited, draft;
  let redraftCount = 0;
  const maxRedrafts = 3;

  do {
    draft = await logStage('DraftAgent', `drafting (v${draft?.draft_version + 1 || 1})`, () => {
      const agent = new DraftAgent();
      return agent.run(brief, research, outline, edited?.feedback_for_redraft);
    });
    saveJson(runDir, `04_draft_v${draft.draft_version}`, draft);

    edited = await logStage('EditorAgent', 'editing', () => {
      const agent = new EditorAgent();
      return agent.run(brief, draft);
    });
    saveJson(runDir, `05_edited_v${draft.draft_version}`, edited);

    if (edited.passed_quality_threshold || redraftCount >= maxRedrafts) break;
    console.log(chalk.yellow(`🔄 Redraft ${++redraftCount}/${maxRedrafts}: ${edited.feedback_for_redraft?.slice(0,80)}`));
  } while (redraftCount < maxRedrafts);

  const published = await logStage('PublishAgent', 'publishing', () => {
    const agent = new PublishAgent();
    const result = agent.run(edited);
    const mdPath = path.join(runDir, 'FINAL_ARTICLE.md');
    fs.writeFileSync(mdPath, result.markdown);
    console.log(chalk.green(`✨ ${mdPath}`));
    return result;
  });
  saveJson(runDir, '06_published', published);

  console.log(chalk.blue(`\n🎉 COMPLETE! ${published.word_count} words`));
  console.log(chalk.green(`📄 ${published.title}`));
  console.log(chalk.gray(`📂 ${runDir}`));
}

export async function testSingleAgent(agentName, topic) {
  console.log(chalk.cyan(`🧪 Testing ${agentName}: "${topic}"`));
  if (agentName.toLowerCase() === 'brief') {
    const agent = new (await import('./agents/briefAgent.js')).BriefAgent();
    console.log(JSON.stringify(await agent.run(topic), null, 2));
  }
}
