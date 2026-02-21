# ContentForge — Project Generation Prompt

## Your Task

Build a complete, working project called **ContentForge**: a multi-agent content creation pipeline powered by AI (Anthropic, Google Gemini, OpenAI, xAI Grok).

The pipeline takes a raw topic or idea from a user and produces a publish-ready blog post or article by passing work through a sequence of specialised agents.

Language: nodejs

**Deliver all files as a single zip file, fully implemented, ready to run. Do not use placeholders or TODOs. If possible, support running the project locally.**

---

## The Agents

Each agent calls a configurable LLM provider via a provider-agnostic adapter interface, with its own system prompt loaded from its corresponding file in `/prompts/`.

Agents communicate by passing **strongly typed structured objects** — not raw strings.

1. **BriefAgent**
* **Input:** Raw user topic string
* **Behaviour:** If the topic is vague, ask up to 3 clarifying questions before proceeding. If clear, produce the brief immediately.
* **Output:** `ContentBrief`


2. **ResearchAgent**
* **Input:** `ContentBrief`
* **Behaviour:** Generates rich research material based on the brief — key facts, answered questions, supporting examples, counterarguments, and source suggestions. Does not fetch live URLs but produces thorough, plausible research a writer could act on.
* **Output:** `ResearchPackage`


3. **OutlineAgent**
* **Input:** `ContentBrief` + `ResearchPackage`
* **Behaviour:** Produces a structured outline with section headings, bullet points per section, word count estimates per section, an intro hook, and a conclusion CTA.
* **Output:** `ArticleOutline`


4. **DraftAgent**
* **Input:** `ContentBrief` + `ResearchPackage` + `ArticleOutline`
* **Behaviour:** Writes the full first draft in Markdown, respecting tone, audience, and word count from the brief. Uses the outline as its skeleton and the research as its source material.
* **Output:** `ArticleDraft`


5. **EditorAgent**
* **Input:** `ContentBrief` + `ArticleDraft`
* **Behaviour:** Reviews the draft against the brief. Scores it on clarity, accuracy, tone match, and structure (each 1–10).
* **Logic:**
* If all scores are 7 or above, rewrites/improves and passes forward.
* If any score is below 7, returns the draft with specific written feedback flagged for redrafting instead of passing forward.


* **Output:** `EditedArticle`


6. **PublishAgent**
* **Input:** `EditedArticle`
* **Behaviour:** Formats the article into a clean, publish-ready Markdown document. Adds a meta description, tags, and reading time estimate.
* **Output:** `PublishedArticle` + writes final `.md` file to `/output/`



---

## The Orchestrator

The orchestrator must:

1. Instantiate and run each agent in sequence.
2. Pass typed payloads between agents — no raw strings.
3. **Handle the EditorAgent critique loop:**
* If `passed_quality_threshold` is false, send the draft back to `DraftAgent` with `feedback_for_redraft` attached.
* Allow a maximum of 3 redraft attempts before proceeding anyway.


4. **Log each stage to the console with timing:** `[BriefAgent] ✓ completed in 3.2s`
5. Save intermediate outputs to JSON files so runs are inspectable.
6. Handle API errors with retry logic (exponential backoff, max 3 retries).
7. Support global or per-agent LLM provider selection via the adapter interface.

---

## Data Models (Language-Agnostic Schema)

Define these models with full field descriptions:

* **ContentBrief:** `topic`, `working_title`, `target_audience`, `purpose`, `angle`, `content_type` (enum), `tone` (list of strings), `key_points` (list of strings, 4–6 items), `what_to_avoid`, `estimated_word_count`, `success_criteria` (list of strings).
* **ResearchPackage:** `brief` (ContentBrief), `key_facts`, `key_questions_answered`, `supporting_examples`, `counterarguments`, `suggested_sources`, `research_gaps` (optional).
* **ArticleOutline:** `brief`, `research`, `sections` (list of `{ heading, points: list of strings, estimated_words: number }`), `intro_hook`, `conclusion_cta`, `total_estimated_words`.
* **ArticleDraft:** `brief`, `outline`, `title`, `body` (full Markdown), `word_count`, `draft_version`.
* **EditedArticle:** `brief`, `draft`, `title`, `body`, `word_count`, `edit_notes`, `quality_scores` (clarity, accuracy, tone_match, structure: all 1–10), `passed_quality_threshold` (boolean), `feedback_for_redraft` (optional string).
* **PublishedArticle:** `title`, `description`, `tags`, `markdown`, `word_count`, `reading_time_minutes`.

---

## Prompt Files (`/prompts/*.md`)

Each agent’s system prompt lives in its own Markdown file. These are the most important files in the project — write them with care.

Each prompt must include:

* **Role:** What the agent is and what it does.
* **Behaviour rules:** Specific instructions covering edge cases.
* **Output format:** Exact JSON schema the agent must return.
* **What NOT to do:** Explicit guardrails.
* **Handoff contract:** What the next agent expects.

> **Note:** Prompts must instruct agents to return valid JSON only — no markdown fences, no explanation, no preamble. The application layer will call a JSON parser directly on the response.

---

## Provider-Agnostic LLM Adapter Interface

The system must include a provider-agnostic LLM adapter layer that cleanly swaps between Anthropic, OpenAI, Google Gemini, and xAI Grok without touching agent logic.

### Requirements

* Define a common LLM interface (or protocol) that all providers implement.
* Agents must depend only on this interface — never on provider-specific SDKs or APIs.
* The active provider must be selectable via environment variables and/or a config file.
* Adding a new provider must require zero changes to existing agent code.
* **Normalize provider differences:** Input message format, system prompt injection, model naming, retry semantics, error handling, and token limits.
* **Interface:** `LLMProvider: call(system_prompt: string, user_message: string, config: LLMConfig) -> string`

### Guardrails

* No provider-specific logic inside agent classes.
* No hardcoded provider names or API calls in agent implementations.
* No leaking provider response formats outside the adapter layer.

---

## Agent Base Class / Interface (Language-Agnostic)

Implement a shared base agent abstraction that all agents inherit from:

**BaseAgent:**

* `name`: string
* `model`: string (configurable)
* `load_prompt()` -> string
* `call(input_message: string)` -> string
* `parse(response_text: string)` -> structured object

Each agent implements a `run()` method that accepts its typed input model and returns its typed output model.

---

## CLI

Provide a command-line interface supporting:

```bash
# Run the full pipeline
contentforge run "The impact of sleep deprivation on software developers"

# Run a single agent for testing
contentforge agent brief "Why remote work is here to stay"

# List previous runs
contentforge runs

# Show the output of a previous run
contentforge show run_20240315_142301

```

---

## Requirements & Implementation Rules

* **Environment Variables:** Load API keys via `.env` (no hardcoded secrets).
* **Strict JSON:** All agents return JSON; enforce this in prompts.
* **Pretty Output:** Use colored console output, progress indicators, and a final summary table.
* **Strong Typing:** Use schema validation (e.g., Pydantic) for all agent I/O.
* **Logging:** Save each agent's raw output and logs to `/output/run_{timestamp}/`.
* **Word Count:** Flag drafts more than 20% outside the brief’s target range.
* **No Direct SDKs:** Direct LLM SDK calls outside the adapter layer are forbidden.

---

## Documentation Deliverables

1. **README.md:** Covers setup, installation, CLI usage, an ASCII diagram of agent flow, and the prompting philosophy.
2. **METHODOLOGY.md:** Detailed explanation of prompting decisions (JSON output, scoring logic, handoff contracts, and failure mode guards).

---

