# ContentForge

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