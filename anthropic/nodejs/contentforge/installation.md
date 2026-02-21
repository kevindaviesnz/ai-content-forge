# ContentForge — Installation Instructions

## Prerequisites

- **Node.js 18+** (check with `node --version`)
- **npm** (comes with Node.js)
- **API key** for at least one LLM provider:
  - Anthropic Claude
  - OpenAI GPT-4
  - Google Gemini
  - xAI Grok

---

## Step 1: Extract the Project

```bash
unzip contentforge.zip
cd contentforge
```

---

## Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- TypeScript compiler
- LLM SDKs (Anthropic, OpenAI, Gemini)
- CLI tools (Commander, Chalk, Ora)
- Validation (Zod)

---

## Step 3: Configure API Keys

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and add your API key(s):

```bash
# At minimum, set ONE of these:
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
GROK_API_KEY=...

# Set which provider to use by default:
LLM_PROVIDER=anthropic
```

**Note:** You only need ONE provider to get started. The default is Anthropic Claude.

---

## Step 4: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

---

## Step 5: Run Your First Pipeline

```bash
npm start run "The impact of sleep deprivation on software developers"
```

This will:
1. Ask clarifying questions (if needed)
2. Run all six agents in sequence
3. Save outputs to `output/run_YYYYMMDD_HHMMSS/`
4. Display a summary table with timing and quality scores

---

## Troubleshooting

### "ANTHROPIC_API_KEY is not set"

Make sure you've:
1. Created the `.env` file (`cp .env.example .env`)
2. Added your API key to `.env`
3. Set `LLM_PROVIDER=anthropic` (or whichever provider you're using)

### "Cannot find module ..."

Run `npm install` again. If issues persist, delete `node_modules` and reinstall:
```bash
rm -rf node_modules
npm install
```

### Path-related errors

Make sure you're running commands from the `contentforge/` directory:
```bash
cd contentforge
npm start run "Your topic"
```

---

## Next Steps

- Read `README.md` for full documentation
- Read `METHODOLOGY.md` for prompting philosophy
- Customize agent prompts in `prompts/` directory
- Try different providers by changing `LLM_PROVIDER` in `.env`

---

## Example Run

```bash
$ npm start run "Why remote work is here to stay"

────────────────────────────────────────────────────────
  ContentForge · Multi-Agent Content Pipeline
  Topic:    Why remote work is here to stay
  Run ID:   run_20240316_093045
  Provider: anthropic
────────────────────────────────────────────────────────

[BriefAgent] starting... (anthropic / claude-sonnet-4-5-20250929)
[BriefAgent] ✓ completed in 3.2s (anthropic / claude-sonnet-4-5-20250929)
[ResearchAgent] starting... (anthropic / claude-sonnet-4-5-20250929)
[ResearchAgent] ✓ completed in 8.1s (anthropic / claude-sonnet-4-5-20250929)
[OutlineAgent] starting... (anthropic / claude-sonnet-4-5-20250929)
[OutlineAgent] ✓ completed in 4.7s (anthropic / claude-sonnet-4-5-20250929)
[DraftAgent (v1)] starting... (anthropic / claude-sonnet-4-5-20250929)
[DraftAgent (v1)] ✓ completed in 15.3s (anthropic / claude-sonnet-4-5-20250929)
[EditorAgent (v1)] starting... (anthropic / claude-sonnet-4-5-20250929)
[EditorAgent (v1)] ✓ Quality passed — clarity: 8/10 · accuracy: 9/10 · tone_match: 8/10 · structure: 8/10
[EditorAgent (v1)] ✓ completed in 6.2s (anthropic / claude-sonnet-4-5-20250929)
[PublishAgent] starting... (anthropic / claude-sonnet-4-5-20250929)
[PublishAgent] ✓ Article written → output/run_20240316_093045/why-remote-work-is-here-to-stay.md
[PublishAgent] ✓ completed in 3.8s (anthropic / claude-sonnet-4-5-20250929)

  Run Summary

  Agent                Provider      Model                             Duration    Status
  ────────────────────────────────────────────────────────────────────────────────
  BriefAgent          anthropic     claude-sonnet-4-5-20250929        3.2s        ✓
  ResearchAgent       anthropic     claude-sonnet-4-5-20250929        8.1s        ✓
  OutlineAgent        anthropic     claude-sonnet-4-5-20250929        4.7s        ✓
  DraftAgent (v1)     anthropic     claude-sonnet-4-5-20250929        15.3s       ✓
  EditorAgent (v1)    anthropic     claude-sonnet-4-5-20250929        6.2s        ✓
  PublishAgent        anthropic     claude-sonnet-4-5-20250929        3.8s        ✓

────────────────────────────────────────────────────────
  ✓ Pipeline complete in 41.3s
  Run ID:  run_20240316_093045
  Output:  output/run_20240316_093045/
────────────────────────────────────────────────────────
```

---

Enjoy using ContentForge!