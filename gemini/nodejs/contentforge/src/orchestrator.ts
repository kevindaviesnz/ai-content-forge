import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { BriefAgent } from './agents/brief';
import { ResearchAgent } from './agents/research';
import { OutlineAgent } from './agents/outline';
import { DraftAgent } from './agents/draft';
import { EditorAgent } from './agents/editor';
import { PublishAgent } from './agents/publish';

export class Orchestrator {
    private runId: string;
    private logDir: string;

    constructor() {
        const now = new Date();
        this.runId = `run_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
        this.logDir = path.join(process.cwd(), 'output', this.runId);
    }

    private log(stage: string, data: any) {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        fs.writeFileSync(
            path.join(this.logDir, `${stage}.json`), 
            JSON.stringify(data, null, 2)
        );
    }

    async run(topic: string) {
        console.log(chalk.blue.bold(`\n🚀 ContentForge started. Run ID: ${this.runId}\n`));
        
        try {
            // 1. Brief
            const spinner = ora('Generating Brief...').start();
            const startBrief = Date.now();
            const briefAgent = new BriefAgent();
            const brief = await briefAgent.run(topic);
            spinner.succeed(`[BriefAgent] ✓ completed in ${((Date.now() - startBrief)/1000).toFixed(1)}s`);
            this.log('1_brief', brief);

            // 2. Research
            spinner.start('Conducting Research...');
            const startRes = Date.now();
            const researchAgent = new ResearchAgent();
            const research = await researchAgent.run(brief);
            spinner.succeed(`[ResearchAgent] ✓ completed in ${((Date.now() - startRes)/1000).toFixed(1)}s`);
            this.log('2_research', research);

            // 3. Outline
            spinner.start('Creating Outline...');
            const startOut = Date.now();
            const outlineAgent = new OutlineAgent();
            const outline = await outlineAgent.run({ brief, research });
            spinner.succeed(`[OutlineAgent] ✓ completed in ${((Date.now() - startOut)/1000).toFixed(1)}s`);
            this.log('3_outline', outline);

            // 4. Draft & Editor Loop
            let draftAgent = new DraftAgent();
            let editorAgent = new EditorAgent();
            
            // Initial Draft
            let draft = await this.runDraft(draftAgent, spinner, brief, research, outline);
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts <= maxAttempts) {
                spinner.start(`Editing (Attempt ${attempts + 1}/${maxAttempts + 1})...`);
                const startEdit = Date.now();
                
                // Run Editor
                const edited = await editorAgent.run({ brief, draft });
                spinner.succeed(`[EditorAgent] ✓ completed in ${((Date.now() - startEdit)/1000).toFixed(1)}s`);
                this.log(`4_edit_attempt_${attempts}`, edited);

                // Check Threshold
                if (edited.passed_quality_threshold) {
                    console.log(chalk.green(`  › Quality Threshold Met! Scores: Clarity ${edited.quality_scores.clarity}/10, Structure ${edited.quality_scores.structure}/10`));
                    
                    // 5. Publish
                    spinner.start('Publishing...');
                    const startPub = Date.now();
                    const publishAgent = new PublishAgent();
                    const published = await publishAgent.run(edited);
                    
                    const filename = `${published.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
                    fs.writeFileSync(path.join(process.cwd(), 'output', filename), published.markdown);
                    
                    spinner.succeed(`[PublishAgent] ✓ completed in ${((Date.now() - startPub)/1000).toFixed(1)}s`);
                    this.log('5_published', published);
                    
                    console.log(chalk.green.bold(`\n✨ Done! Saved to /output/${filename}`));
                    return;
                } else {
                    console.log(chalk.yellow(`  › Quality Check Failed. Feedback: ${edited.feedback_for_redraft?.substring(0, 50)}...`));
                    attempts++;
                    
                    if (attempts <= maxAttempts) {
                        // Pass feedback back into draft
                        // We attach the feedback to the draft object that acts as input context
                        draft.feedback_for_redraft = edited.feedback_for_redraft;
                        draft = await this.runDraft(draftAgent, spinner, brief, research, outline, draft);
                    } else {
                        console.log(chalk.red('\nMaximum redraft attempts reached. Proceeding with current version.'));
                        // Proceed to publish anyway
                        const publishAgent = new PublishAgent();
                        const published = await publishAgent.run(edited);
                        const filename = `${published.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
                        fs.writeFileSync(path.join(process.cwd(), 'output', filename), published.markdown);
                        this.log('5_published_forced', published);
                        return;
                    }
                }
            }

        } catch (error) {
            console.error(chalk.red('\nPipeline failed:'), error);
        }
    }

    private async runDraft(agent: DraftAgent, spinner: any, brief: any, research: any, outline: any, previousDraft?: any) {
        spinner.start(previousDraft ? 'Redrafting...' : 'Writing Draft...');
        const start = Date.now();
        // The DraftAgent expects { brief, research, outline } 
        // If it's a redraft, we pass the previous draft (which contains feedback) as well
        const input = previousDraft ? { brief, research, outline, previousDraft } : { brief, research, outline };
        const draft = await agent.run(input as any); 
        spinner.succeed(`[DraftAgent] ✓ completed in ${((Date.now() - start)/1000).toFixed(1)}s`);
        return draft;
    }
}