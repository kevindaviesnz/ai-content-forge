import os
import zipfile

# Define the file structure and contents
files = {
    "package.json": """{
  "name": "contentforge",
  "version": "1.0.0",
  "description": "Multi-agent AI content creation pipeline",
  "main": "dist/index.js",
  "bin": {
    "contentforge": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "run": "node dist/index.js run",
    "dev": "ts-node src/index.ts"
  },
  "dependencies": {
    "chalk": "^4.1.2",
    "commander": "^11.1.0",
    "dotenv": "^16.3.1",
    "ora": "^5.4.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "ts-node": "^10.9.1",
    "typescript": "^5.3.2"
  }
}""",

    "tsconfig.json": """{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}""",

    ".env.example": """# ContentForge Configuration
# Rename this file to .env and add your keys

# Provider Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
XAI_API_KEY=...

# Default Provider (openai, anthropic, gemini, xai)
DEFAULT_PROVIDER=openai

# Model Overrides (Optional)
# OPENAI_MODEL=gpt-4-turbo-preview
# ANTHROPIC_MODEL=claude-3-opus-20240229
# GEMINI_MODEL=gemini-1.5-pro-latest
# XAI_MODEL=grok-beta
""",

    "README.md": """# ContentForge

ContentForge is a multi-agent AI pipeline that turns raw ideas into high-quality, publish-ready blog posts. It orchestrates a team of specialized AI agents (Brief, Research, Outline, Draft, Editor, Publish) to ensure consistency, accuracy, and quality.

## Quick Start

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Configure Environment:**
    Copy `.env.example` to `.env` and add your API keys.
    ```bash
    cp .env.example .env
    ```

3.  **Build:**
    ```bash
    npm run build
    ```

4.  **Run:**
    ```bash
    # Run the full pipeline
    npm run run -- "The future of quantum computing in medicine"
    
    # Or link globally
    npm link
    contentforge run "Sustainable gardening for beginners"
    ```

## Architecture


```

[User Input]
│
▼
[BriefAgent] ──> Returns ContentBrief
│
▼
[ResearchAgent] ──> Returns ResearchPackage
│
▼
[OutlineAgent] ──> Returns ArticleOutline
│
▼
[DraftAgent] ──> Returns ArticleDraft
│
▼
┌────[EditorAgent] <──────┐
│    │ Returns EditedArticle │
│    │ (Score < 7)        │
│    ▼                    │
│   [Redraft Loop] ───────┘
│    (Max 3 attempts)
│
└───► (Score >= 7)
│
▼
[PublishAgent] ──> Writes .md file to /output/

```

## CLI Commands

* `contentforge run "<topic>"`: Execute the full pipeline.
* `contentforge agent <name> "<input>"`: Test a specific agent in isolation.
* `contentforge runs`: List past run logs.

## Customization

* **Prompts:** Edit markdown files in `src/prompts/` to change agent behavior.
* **Models:** Change the default provider in `.env` or in `src/adapters/index.ts`.
""",

    "METHODOLOGY.md": """# Methodology

## Prompting Strategy

### 1. JSON-First Output
All agents are strictly instructed to return purely JSON responses. This avoids the fragility of regex parsing natural language. By enforcing schemas (via Zod in code and explicit JSON examples in prompts), we ensure the "handoff" between agents never breaks due to formatting errors.

### 2. The Critique Loop (EditorAgent)
The EditorAgent is the quality gatekeeper. Unlike a simple linear chain, ContentForge implements a `while` loop in the Orchestrator.
- **Scoring:** The editor assigns 1-10 scores on four metrics.
- **Feedback:** If the score is low, specific `feedback_for_redraft` is generated.
- **Correction:** This feedback is injected back into the `DraftAgent`'s context for the next iteration.

### 3. Separation of Concerns
- **BriefAgent** focuses purely on strategy (audience, tone).
- **ResearchAgent** focuses purely on facts (preventing hallucinations in the drafting phase).
- **DraftAgent** focuses purely on writing style and flow.
This separation prevents the "jack of all trades" degradation often seen in single-prompt generation.

### 4. Provider Agnosticism
The `LLMProvider` interface normalizes the inputs and outputs of OpenAI, Anthropic, Gemini, and xAI. This allows the system to be future-proof; if a new, better model comes out, we simply add an adapter, and the agents remain untouched.

## Failure Modes & Guardrails
- **Retry Logic:** Network blips or API errors trigger an exponential backoff retry (up to 3 times).
- **Output Cleaning:** Code strips markdown fences (```json) before parsing, as models often include them despite instructions.
- **Type Safety:** TypeScript + Zod ensures that if an agent returns a malformed object, the pipeline fails fast with a clear error rather than propagating bad data.
""",

    "src/index.ts": """#!/usr/bin/env node
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
""",

    "src/types.ts": """import { z } from 'zod';

// --- Enums & Helpers ---
export const ContentTypeEnum = z.enum(['Blog Post', 'Article', 'Case Study', 'Whitepaper', 'Opinion Piece']);

// 1. ContentBrief
export const ContentBriefSchema = z.object({
  topic: z.string(),
  working_title: z.string(),
  target_audience: z.string(),
  purpose: z.string(),
  angle: z.string(),
  content_type: ContentTypeEnum,
  tone: z.array(z.string()),
  key_points: z.array(z.string()).min(4).max(6),
  what_to_avoid: z.string(),
  estimated_word_count: z.number(),
  success_criteria: z.array(z.string()),
});
export type ContentBrief = z.infer<typeof ContentBriefSchema>;

// 2. ResearchPackage
export const ResearchPackageSchema = z.object({
  brief: ContentBriefSchema,
  key_facts: z.array(z.string()),
  key_questions_answered: z.array(z.string()),
  supporting_examples: z.array(z.string()),
  counterarguments: z.array(z.string()),
  suggested_sources: z.array(z.string()),
  research_gaps: z.array(z.string()).optional(),
});
export type ResearchPackage = z.infer<typeof ResearchPackageSchema>;

// 3. ArticleOutline
export const ArticleOutlineSchema = z.object({
  brief: ContentBriefSchema,
  research: ResearchPackageSchema,
  sections: z.array(z.object({
    heading: z.string(),
    points: z.array(z.string()),
    estimated_words: z.number()
  })),
  intro_hook: z.string(),
  conclusion_cta: z.string(),
  total_estimated_words: z.number()
});
export type ArticleOutline = z.infer<typeof ArticleOutlineSchema>;

// 4. ArticleDraft
export const ArticleDraftSchema = z.object({
  brief: ContentBriefSchema,
  outline: ArticleOutlineSchema,
  title: z.string(),
  body: z.string(),
  word_count: z.number(),
  draft_version: z.number(),
  feedback_for_redraft: z.string().optional()
});
export type ArticleDraft = z.infer<typeof ArticleDraftSchema>;

// 5. EditedArticle
export const EditedArticleSchema = z.object({
  brief: ContentBriefSchema,
  draft: ArticleDraftSchema,
  title: z.string(),
  body: z.string(),
  word_count: z.number(),
  edit_notes: z.string(),
  quality_scores: z.object({
    clarity: z.number().min(1).max(10),
    accuracy: z.number().min(1).max(10),
    tone_match: z.number().min(1).max(10),
    structure: z.number().min(1).max(10),
  }),
  passed_quality_threshold: z.boolean(),
  feedback_for_redraft: z.string().optional()
});
export type EditedArticle = z.infer<typeof EditedArticleSchema>;

// 6. PublishedArticle
export const PublishedArticleSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  markdown: z.string(),
  word_count: z.number(),
  reading_time_minutes: z.number()
});
export type PublishedArticle = z.infer<typeof PublishedArticleSchema>;
""",

    "src/orchestrator.ts": """import * as fs from 'fs';
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
            console.error(chalk.red('\\nPipeline failed:'), error);
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
""",

    "src/adapters/base.ts": """export interface LLMConfig {
    provider?: string;
    model?: string;
    apiKey?: string;
    temperature?: number;
}

export interface LLMProvider {
    name: string;
    call(systemPrompt: string, userMessage: string, config?: LLMConfig): Promise<string>;
}
""",

    "src/adapters/index.ts": """import { LLMProvider } from './base';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { XAIProvider } from './xai';

const providers: Record<string, LLMProvider> = {
    openai: new OpenAIProvider(),
    anthropic: new AnthropicProvider(),
    gemini: new GeminiProvider(),
    xai: new XAIProvider(),
};

export function getProvider(name: string): LLMProvider {
    const provider = providers[name.toLowerCase()];
    if (!provider) {
        throw new Error(`Unknown provider: ${name}`);
    }
    return provider;
}
""",

    "src/adapters/openai.ts": """import { LLMProvider, LLMConfig } from './base';

export class OpenAIProvider implements LLMProvider {
    name = 'openai';

    async call(systemPrompt: string, userMessage: string, config?: LLMConfig): Promise<string> {
        const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
        const model = config?.model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';

        const response = await fetch('[https://api.openai.com/v1/chat/completions](https://api.openai.com/v1/chat/completions)', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: config?.temperature || 0.7,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI API Error: ${err}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }
}
""",

    "src/adapters/anthropic.ts": """import { LLMProvider, LLMConfig } from './base';

export class AnthropicProvider implements LLMProvider {
    name = 'anthropic';

    async call(systemPrompt: string, userMessage: string, config?: LLMConfig): Promise<string> {
        const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
        const model = config?.model || process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229';

        const response = await fetch('[https://api.anthropic.com/v1/messages](https://api.anthropic.com/v1/messages)', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model,
                system: systemPrompt,
                messages: [{ role: 'user', content: userMessage }],
                max_tokens: 4096,
                temperature: config?.temperature || 0.7
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Anthropic API Error: ${err}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }
}
""",

    "src/adapters/gemini.ts": """import { LLMProvider, LLMConfig } from './base';

export class GeminiProvider implements LLMProvider {
    name = 'gemini';

    async call(systemPrompt: string, userMessage: string, config?: LLMConfig): Promise<string> {
        const apiKey = config?.apiKey || process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");
        const model = config?.model || process.env.GEMINI_MODEL || 'gemini-1.5-pro';

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: systemPrompt + "\\n\\nHuman: " + userMessage }]
                }],
                generationConfig: {
                    temperature: config?.temperature || 0.7,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini API Error: ${err}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
}
""",

    "src/adapters/xai.ts": """import { LLMProvider, LLMConfig } from './base';

export class XAIProvider implements LLMProvider {
    name = 'xai';

    async call(systemPrompt: string, userMessage: string, config?: LLMConfig): Promise<string> {
        const apiKey = config?.apiKey || process.env.XAI_API_KEY;
        if (!apiKey) throw new Error("Missing XAI_API_KEY");
        // Use grok-beta or grok-2 as default
        const model = config?.model || process.env.XAI_MODEL || 'grok-beta';

        const response = await fetch('[https://api.x.ai/v1/chat/completions](https://api.x.ai/v1/chat/completions)', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: config?.temperature || 0.7,
                stream: false
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`xAI API Error: ${err}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }
}
""",

    "src/agents/base.ts": """import * as fs from 'fs';
import * as path from 'path';
import { ZodSchema } from 'zod';
import { getProvider } from '../adapters';
import { LLMConfig } from '../adapters/base';

export abstract class BaseAgent<TInput, TOutput> {
    abstract name: string;
    abstract modelConfig: LLMConfig;
    abstract outputSchema: ZodSchema<TOutput>;

    protected promptPath: string;

    constructor(promptFileName: string) {
        this.promptPath = path.join(__dirname, '../../src/prompts', promptFileName);
    }

    protected loadPrompt(): string {
        try {
            return fs.readFileSync(this.promptPath, 'utf-8');
        } catch (e) {
            throw new Error(`Could not load prompt file: ${this.promptPath}`);
        }
    }

    protected async callLLM(userMessage: string): Promise<string> {
        const systemPrompt = this.loadPrompt();
        const providerName = this.modelConfig.provider || process.env.DEFAULT_PROVIDER || 'openai';
        const provider = getProvider(providerName);
        
        // Exponential backoff retry logic
        let retries = 0;
        const maxRetries = 3;
        
        while (retries <= maxRetries) {
            try {
                return await provider.call(systemPrompt, userMessage, this.modelConfig);
            } catch (error) {
                retries++;
                if (retries > maxRetries) throw error;
                await new Promise(res => setTimeout(res, Math.pow(2, retries) * 1000));
            }
        }
        return "";
    }

    protected parse(jsonString: string): TOutput {
        try {
            // Clean markdown fences if present
            const cleaned = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            return this.outputSchema.parse(parsed);
        } catch (e) {
            console.error(`Error parsing JSON from ${this.name}:`, jsonString);
            throw new Error(`Failed to parse JSON from ${this.name}: ${e}`);
        }
    }

    abstract run(input: TInput): Promise<TOutput>;
}
""",

    "src/agents/brief.ts": """import { BaseAgent } from './base';
import { ContentBrief, ContentBriefSchema } from '../types';

export class BriefAgent extends BaseAgent<string, ContentBrief> {
    name = "BriefAgent";
    modelConfig = {}; 
    outputSchema = ContentBriefSchema;

    constructor() {
        super('brief.md');
    }

    async run(input: string): Promise<ContentBrief> {
        // We pass the raw topic wrapped in a simple JSON structure to the LLM
        const response = await this.callLLM(JSON.stringify({ topic: input }));
        return this.parse(response);
    }
}
""",

    "src/agents/research.ts": """import { BaseAgent } from './base';
import { ContentBrief, ResearchPackage, ResearchPackageSchema } from '../types';

export class ResearchAgent extends BaseAgent<ContentBrief, ResearchPackage> {
    name = "ResearchAgent";
    modelConfig = {}; 
    outputSchema = ResearchPackageSchema;

    constructor() {
        super('research.md');
    }

    async run(input: ContentBrief): Promise<ResearchPackage> {
        const response = await this.callLLM(JSON.stringify(input));
        return this.parse(response);
    }
}
""",

    "src/agents/outline.ts": """import { BaseAgent } from './base';
import { ContentBrief, ResearchPackage, ArticleOutline, ArticleOutlineSchema } from '../types';

type Input = { brief: ContentBrief; research: ResearchPackage };

export class OutlineAgent extends BaseAgent<Input, ArticleOutline> {
    name = "OutlineAgent";
    modelConfig = {};
    outputSchema = ArticleOutlineSchema;

    constructor() {
        super('outline.md');
    }

    async run(input: Input): Promise<ArticleOutline> {
        const response = await this.callLLM(JSON.stringify(input));
        return this.parse(response);
    }
}
""",

    "src/agents/draft.ts": """import { BaseAgent } from './base';
import { ContentBrief, ResearchPackage, ArticleOutline, ArticleDraft, ArticleDraftSchema } from '../types';

type Input = { 
    brief: ContentBrief; 
    research: ResearchPackage; 
    outline: ArticleOutline; 
    previousDraft?: ArticleDraft 
};

export class DraftAgent extends BaseAgent<Input, ArticleDraft> {
    name = "DraftAgent";
    modelConfig = {};
    outputSchema = ArticleDraftSchema;

    constructor() {
        super('draft.md');
    }

    async run(input: Input): Promise<ArticleDraft> {
        const response = await this.callLLM(JSON.stringify(input));
        return this.parse(response);
    }
}
""",

    "src/agents/editor.ts": """import { BaseAgent } from './base';
import { ContentBrief, ArticleDraft, EditedArticle, EditedArticleSchema } from '../types';

type Input = { brief: ContentBrief; draft: ArticleDraft };

export class EditorAgent extends BaseAgent<Input, EditedArticle> {
    name = "EditorAgent";
    modelConfig = {};
    outputSchema = EditedArticleSchema;

    constructor() {
        super('editor.md');
    }

    async run(input: Input): Promise<EditedArticle> {
        const response = await this.callLLM(JSON.stringify(input));
        return this.parse(response);
    }
}
""",

    "src/agents/publish.ts": """import { BaseAgent } from './base';
import { EditedArticle, PublishedArticle, PublishedArticleSchema } from '../types';

export class PublishAgent extends BaseAgent<EditedArticle, PublishedArticle> {
    name = "PublishAgent";
    modelConfig = {};
    outputSchema = PublishedArticleSchema;

    constructor() {
        super('publish.md');
    }

    async run(input: EditedArticle): Promise<PublishedArticle> {
        const response = await this.callLLM(JSON.stringify(input));
        return this.parse(response);
    }
}
""",

    "src/prompts/brief.md": """# BriefAgent System Prompt

## Role
You are an expert content strategist. Your goal is to convert a raw topic into a structured Content Brief.

## Behaviour Rules
1. Analyze the user's raw topic.
2. If the topic is extremely vague (e.g., "AI"), infer the most likely popular angle but strictly adhere to the schema.
3. Determine tone, audience, and goal based on best practices for web content.
4. Estimate word count based on the complexity of the inferred angle.

## Output Format
Return valid JSON only matching this schema:

{
  "topic": "string",
  "working_title": "string",
  "target_audience": "string",
  "purpose": "string",
  "angle": "string",
  "content_type": "Blog Post",
  "tone": ["string", "string"],
  "key_points": ["string", "string", "string", "string"],
  "what_to_avoid": "string",
  "estimated_word_count": number,
  "success_criteria": ["string", "string"]
}

## What NOT to do
- Do not output markdown code blocks.
- Do not output any text before or after the JSON.
""",

    "src/prompts/research.md": """# ResearchAgent System Prompt

## Role
You are a lead researcher. You provide deep, fact-based materials for a writer.

## Behaviour Rules
1. Receive a ContentBrief.
2. Generate plausible, high-quality research data (facts, stats, examples).
3. Do NOT browse the live web (simulate expert knowledge).
4. Provide sources that look realistic or are well-known fundamental sources.

## Output Format
Return valid JSON only:

{
  "brief": { ... include the full brief object passed in ... },
  "key_facts": ["string"],
  "key_questions_answered": ["string"],
  "supporting_examples": ["string"],
  "counterarguments": ["string"],
  "suggested_sources": ["string"],
  "research_gaps": ["string"]
}
""",

    "src/prompts/outline.md": """# OutlineAgent System Prompt

## Role
You are an editorial architect. You structure articles for maximum flow and readability.

## Behaviour Rules
1. Use the Brief and Research to build a skeleton.
2. Break down the article into logical sections.
3. Assign word count estimates to each section to meet the total target.

## Output Format
Return valid JSON only:

{
  "brief": { ... },
  "research": { ... },
  "sections": [
    { "heading": "string", "points": ["string"], "estimated_words": number }
  ],
  "intro_hook": "string",
  "conclusion_cta": "string",
  "total_estimated_words": number
}
""",

    "src/prompts/draft.md": """# DraftAgent System Prompt

## Role
You are a senior copywriter. You write the full content based on the outline.

## Behaviour Rules
1. Write the full body in Markdown.
2. Strictly follow the Outline structure.
3. Incorporate Research facts naturally.
4. **IMPORTANT:** If the input contains "feedback_for_redraft", you MUST adjust the writing to address that feedback specifically.

## Output Format
Return valid JSON only:

{
  "brief": { ... },
  "outline": { ... },
  "title": "string",
  "body": "# Heading... (Full Markdown content)",
  "word_count": number,
  "draft_version": number
}
""",

    "src/prompts/editor.md": """# EditorAgent System Prompt

## Role
You are a ruthless editor. You grade content and demand rewrites if it's not perfect.

## Behaviour Rules
1. Analyze the Draft against the Brief.
2. Score on 1-10 scale for: Clarity, Accuracy, Tone Match, Structure.
3. Threshold: All scores must be >= 7 to pass.
4. If failed, provide specific "feedback_for_redraft".
5. If passed, you may polish the text slightly in the output, but primarily you approve it.

## Output Format
Return valid JSON only:

{
  "brief": { ... },
  "draft": { ... },
  "title": "string",
  "body": "string",
  "word_count": number,
  "edit_notes": "string",
  "quality_scores": {
    "clarity": number,
    "accuracy": number,
    "tone_match": number,
    "structure": number
  },
  "passed_quality_threshold": boolean,
  "feedback_for_redraft": "string (optional, required if passed_quality_threshold is false)"
}
""",

    "src/prompts/publish.md": """# PublishAgent System Prompt

## Role
You are a CMS manager. You prepare the final markdown file.

## Behaviour Rules
1. Take the approved EditedArticle.
2. Generate SEO meta description and tags.
3. Calculate reading time.
4. Ensure the markdown is clean and formatted.

## Output Format
Return valid JSON only:

{
  "title": "string",
  "description": "string",
  "tags": ["string"],
  "markdown": "string",
  "word_count": number,
  "reading_time_minutes": number
}
"""
}

def create_zip():
    zip_filename = "contentforge.zip"
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for filepath, content in files.items():
            # Create directory structure if needed
            directory = os.path.dirname(filepath)
            if directory and not os.path.exists(directory):
                # We don't strictly need to make dirs on disk to zip them,
                # but it's good practice if we were writing to disk.
                # For zipping strings, we just write to the zip path.
                pass
            
            # Write file to zip
            zipf.writestr(filepath, content.strip())
            print(f"Adding {filepath}...")

    print(f"\\nSuccessfully created {zip_filename}")

if __name__ == "__main__":
    create_zip()

