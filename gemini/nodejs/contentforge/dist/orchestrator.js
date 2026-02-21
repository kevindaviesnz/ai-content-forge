"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orchestrator = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const brief_1 = require("./agents/brief");
const research_1 = require("./agents/research");
const outline_1 = require("./agents/outline");
const draft_1 = require("./agents/draft");
const editor_1 = require("./agents/editor");
const publish_1 = require("./agents/publish");
class Orchestrator {
    constructor() {
        const now = new Date();
        this.runId = `run_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        this.logDir = path.join(process.cwd(), 'output', this.runId);
    }
    log(stage, data) {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        fs.writeFileSync(path.join(this.logDir, `${stage}.json`), JSON.stringify(data, null, 2));
    }
    async run(topic) {
        console.log(chalk_1.default.blue.bold(`\n🚀 ContentForge started. Run ID: ${this.runId}\n`));
        try {
            // 1. Brief
            const spinner = (0, ora_1.default)('Generating Brief...').start();
            const startBrief = Date.now();
            const briefAgent = new brief_1.BriefAgent();
            const brief = await briefAgent.run(topic);
            spinner.succeed(`[BriefAgent] ✓ completed in ${((Date.now() - startBrief) / 1000).toFixed(1)}s`);
            this.log('1_brief', brief);
            // 2. Research
            spinner.start('Conducting Research...');
            const startRes = Date.now();
            const researchAgent = new research_1.ResearchAgent();
            const research = await researchAgent.run(brief);
            spinner.succeed(`[ResearchAgent] ✓ completed in ${((Date.now() - startRes) / 1000).toFixed(1)}s`);
            this.log('2_research', research);
            // 3. Outline
            spinner.start('Creating Outline...');
            const startOut = Date.now();
            const outlineAgent = new outline_1.OutlineAgent();
            const outline = await outlineAgent.run({ brief, research });
            spinner.succeed(`[OutlineAgent] ✓ completed in ${((Date.now() - startOut) / 1000).toFixed(1)}s`);
            this.log('3_outline', outline);
            // 4. Draft & Editor Loop
            let draftAgent = new draft_1.DraftAgent();
            let editorAgent = new editor_1.EditorAgent();
            // Initial Draft
            let draft = await this.runDraft(draftAgent, spinner, brief, research, outline);
            let attempts = 0;
            const maxAttempts = 3;
            while (attempts <= maxAttempts) {
                spinner.start(`Editing (Attempt ${attempts + 1}/${maxAttempts + 1})...`);
                const startEdit = Date.now();
                // Run Editor
                const edited = await editorAgent.run({ brief, draft });
                spinner.succeed(`[EditorAgent] ✓ completed in ${((Date.now() - startEdit) / 1000).toFixed(1)}s`);
                this.log(`4_edit_attempt_${attempts}`, edited);
                // Check Threshold
                if (edited.passed_quality_threshold) {
                    console.log(chalk_1.default.green(`  › Quality Threshold Met! Scores: Clarity ${edited.quality_scores.clarity}/10, Structure ${edited.quality_scores.structure}/10`));
                    // 5. Publish
                    spinner.start('Publishing...');
                    const startPub = Date.now();
                    const publishAgent = new publish_1.PublishAgent();
                    const published = await publishAgent.run(edited);
                    const filename = `${published.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
                    fs.writeFileSync(path.join(process.cwd(), 'output', filename), published.markdown);
                    spinner.succeed(`[PublishAgent] ✓ completed in ${((Date.now() - startPub) / 1000).toFixed(1)}s`);
                    this.log('5_published', published);
                    console.log(chalk_1.default.green.bold(`\n✨ Done! Saved to /output/${filename}`));
                    return;
                }
                else {
                    console.log(chalk_1.default.yellow(`  › Quality Check Failed. Feedback: ${edited.feedback_for_redraft?.substring(0, 50)}...`));
                    attempts++;
                    if (attempts <= maxAttempts) {
                        // Pass feedback back into draft
                        // We attach the feedback to the draft object that acts as input context
                        draft.feedback_for_redraft = edited.feedback_for_redraft;
                        draft = await this.runDraft(draftAgent, spinner, brief, research, outline, draft);
                    }
                    else {
                        console.log(chalk_1.default.red('\nMaximum redraft attempts reached. Proceeding with current version.'));
                        // Proceed to publish anyway
                        const publishAgent = new publish_1.PublishAgent();
                        const published = await publishAgent.run(edited);
                        const filename = `${published.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
                        fs.writeFileSync(path.join(process.cwd(), 'output', filename), published.markdown);
                        this.log('5_published_forced', published);
                        return;
                    }
                }
            }
        }
        catch (error) {
            console.error(chalk_1.default.red('\nPipeline failed:'), error);
        }
    }
    async runDraft(agent, spinner, brief, research, outline, previousDraft) {
        spinner.start(previousDraft ? 'Redrafting...' : 'Writing Draft...');
        const start = Date.now();
        // The DraftAgent expects { brief, research, outline } 
        // If it's a redraft, we pass the previous draft (which contains feedback) as well
        const input = previousDraft ? { brief, research, outline, previousDraft } : { brief, research, outline };
        const draft = await agent.run(input);
        spinner.succeed(`[DraftAgent] ✓ completed in ${((Date.now() - start) / 1000).toFixed(1)}s`);
        return draft;
    }
}
exports.Orchestrator = Orchestrator;
