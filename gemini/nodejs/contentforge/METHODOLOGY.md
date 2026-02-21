# Methodology

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