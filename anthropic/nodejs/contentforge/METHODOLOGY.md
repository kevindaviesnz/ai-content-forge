# ContentForge Methodology

**A deep dive into the prompting decisions, failure modes, and design philosophy behind ContentForge.**

This document explains *why* the prompts are written the way they are, what failure modes we guard against, and how the system would evolve as requirements change.

---

## Table of Contents

1. [Why Agents Output JSON Instead of Natural Language](#why-json)
2. [The BriefAgent's Clarification Logic](#briefagent-clarification)
3. [Why the EditorAgent Uses Numeric Scoring](#editor-scoring)
4. [How Handoff Contracts Prevent Context Bleed](#handoff-contracts)
5. [Failure Modes and Prompt Guardrails](#failure-modes)
6. [Prompt Versioning Strategy](#prompt-versioning)

---

## <a name="why-json"></a>1. Why Agents Output JSON Instead of Natural Language

### The Problem with Prose

In early multi-agent systems, agents communicated via natural language:

```
Agent A: "Here's a topic: sleep and developers"
Agent B: "Great! I think we should focus on burnout and code quality."
Agent C: "Based on Agent B's suggestion, I'll write about..."
```

This creates several problems:

**Ambiguity:** What exactly did Agent B suggest? "Focus on" could mean primary emphasis, brief mention, or anything in between.

**Context Bleed:** Agent C now has access to Agent B's *phrasing*, not just its data. If Agent B used a particular metaphor, Agent C might unconsciously adopt it, leading to stylistic drift.

**No Validation:** How do you know Agent B provided everything Agent C needs? You can't programmatically check that a prose handoff contains all required fields.

### The JSON Solution

ContentForge enforces strict JSON schemas at every handoff:

```typescript
// ResearchAgent → OutlineAgent handoff
{
  "brief": { ... },           // Full brief echoed back
  "research": {
    "key_facts": [...],       // Min 3, validated
    "supporting_examples": [...],  // Min 2, validated
    ...
  }
}
```

**Benefits:**

1. **No ambiguity:** The outline agent receives exactly `supporting_examples: [...]`, not "some examples that might be useful."

2. **Validation:** Zod schemas ensure every required field is present and correctly typed. Missing a field? The agent crashes with a clear error.

3. **Context isolation:** Agents receive *data*, not the previous agent's writing style or phrasing. This prevents stylistic contamination.

4. **Inspectability:** Every agent's output is saved as JSON. You can trace exactly what data flowed through the pipeline.

**Trade-off:**

JSON is less flexible than prose. If you need to add a new field to the research package, you must update the schema *and* the prompt. But this rigidity is a feature, not a bug — it forces you to think about data contracts explicitly.

---

## <a name="briefagent-clarification"></a>2. The BriefAgent's Clarification Logic

### The Two-Phase Design

BriefAgent has a unique challenge: it receives raw user input that could be anything from "AI" (vague) to "The neuroscience of sleep deprivation in software developers working remotely" (specific).

We considered three approaches:

**Option 1: Always ask questions**
- Pro: Guarantees complete information
- Con: Annoying when the topic is already clear

**Option 2: Never ask questions, infer from context**
- Pro: Frictionless
- Con: Risks producing a brief that doesn't match user intent

**Option 3: Conditionally ask questions (chosen)**
- Pro: Balances UX and accuracy
- Con: Requires the agent to make a judgment call

### How It Works

The BriefAgent prompt includes explicit decision logic:

```markdown
**Decision logic:**
- If the topic is **clear and specific**, produce the brief immediately.
- If the topic is **vague or ambiguous**, ask **up to 3 clarifying questions**.
```

**First call:** Agent receives `{"topic": "AI"}` and returns:
```json
{
  "needs_clarification": true,
  "questions": [
    "What specific aspect of AI interests you?",
    "Who is your target audience?",
    "What's your goal — inform, persuade, or teach?"
  ]
}
```

**Second call:** Agent receives the answers and returns:
```json
{
  "needs_clarification": false,
  "brief": { ... }
}
```

### Why This Works

1. **Explicit threshold:** The prompt doesn't say "decide if you need more info." It says "if the topic is vague, ask questions." This makes the decision criteria concrete.

2. **Maximum 3 questions:** Prevents the agent from overwhelming users. Three questions is enough to sharpen any brief without becoming an interrogation.

3. **Two-phase validation:** The orchestrator expects either `questions` OR `brief`, never both. If the agent tries to return both, validation fails.

### What Could Go Wrong

**False negatives:** Agent thinks topic is clear when it's not.
- *Mitigation:* Prompt includes examples of vague vs. clear topics to calibrate judgment.

**Useless questions:** Agent asks "What do you want to write about?"
- *Mitigation:* Prompt explicitly forbids this: "Questions must be actionable — avoid 'What do you want to write about?'"

---

## <a name="editor-scoring"></a>3. Why the EditorAgent Uses Numeric Scoring

### The Alternative: Binary Pass/Fail

Early versions used a simple pass/fail judgment:

```json
{
  "passed": false,
  "feedback": "The draft needs improvement."
}
```

**Problems:**

1. **No granularity:** A draft that's 90% there gets the same treatment as one that's 20% there.
2. **Unclear priorities:** If three things are wrong, which should the writer fix first?
3. **No tracking:** Can't measure improvement across redrafts.

### The Four-Dimension Scoring System

```json
{
  "quality_scores": {
    "clarity": 8,
    "accuracy": 9,
    "tone_match": 6,
    "structure": 7
  },
  "passed_quality_threshold": false,
  "feedback_for_redraft": "Tone_match (6/10): The brief calls for 'conversational', but..."
}
```

**Why four dimensions?**

These four cover the most common failure modes:
- **Clarity:** Is the writing understandable?
- **Accuracy:** Are claims supported?
- **Tone Match:** Does it match the brief?
- **Structure:** Is it well-organized?

We considered adding more (e.g. "engagement", "originality"), but decided against it:
- More dimensions = more cognitive load for the scoring agent
- These four are measurable and actionable
- They map cleanly to feedback categories

**Why 1–10 scale?**

- More granular than 1–5
- Familiar to most people
- Easy to set thresholds (e.g. "all scores ≥7")

**Why "all scores ≥7" instead of "average ≥7"?**

Average allows compensation: a 10 in accuracy could hide a 4 in clarity. We want *every* dimension to meet the bar.

### How Feedback Scales with Scores

The prompt instructs the editor to provide *specific* feedback tied to scores:

```markdown
Clarity (6/10): The neuroscience section uses too much jargon. Simplify the explanation — assume readers have no biology background.
```

This is actionable. Compare to:
```
"The article needs to be clearer."  ← Vague, not actionable
```

---

## <a name="handoff-contracts"></a>4. How Handoff Contracts Prevent Context Bleed

### What is Context Bleed?

When agents receive the *raw output* of the previous agent (including its phrasing, style, and reasoning), they unconsciously adopt those patterns. This leads to:
- Stylistic homogenization
- Compounding errors (Agent B's typo becomes Agent C's typo)
- Loss of diversity in approaches

### The Solution: Echoed Data Contracts

Every agent prompt ends with a "Handoff Contract" section:

```markdown
## Handoff Contract

The next agent (OutlineAgent) expects a **ResearchPackage** with all required fields, including the echoed **brief**.
```

Notice: "echoed brief." The research agent doesn't *interpret* the brief — it echoes it verbatim as part of its output:

```json
{
  "brief": { <exact copy of input brief> },
  "key_facts": [ ... ]
}
```

**Why echo instead of reference?**

1. **Self-contained:** Each agent's output is a complete snapshot. You can inspect `ResearchAgent.json` and see the full context without cross-referencing other files.

2. **Immutability:** Echoing prevents agents from modifying upstream data. The brief that reaches PublishAgent is *identical* to the one BriefAgent produced.

3. **Versioning:** If you re-run DraftAgent with a different research package, the new output contains the full context for that run.

### Example: How Echoing Prevents Drift

**Without echoing:**
```json
// ResearchAgent output
{
  "key_facts": ["Fact 1", "Fact 2"]
}

// OutlineAgent needs to load BriefAgent.json to know what to outline
// ❌ Now the outline is coupled to file system state
```

**With echoing:**
```json
// ResearchAgent output
{
  "brief": { <full brief> },
  "key_facts": ["Fact 1", "Fact 2"]
}

// OutlineAgent receives everything it needs in one payload
// ✓ No coupling, no file dependencies
```

---

## <a name="failure-modes"></a>5. Failure Modes and Prompt Guardrails

### Failure Mode 1: Agent Returns Markdown Fences

**What happens:**
```json
```json
{
  "topic": "..."
}
```  ← Extra markdown fences!
```

**Why it happens:**
LLMs are trained on markdown-heavy data. When asked for JSON, they sometimes wrap it in fences as if writing documentation.

**Guardrail in prompts:**
```markdown
Return **valid JSON only** — no markdown fences, no preamble, no explanation.
```

**Fallback in code:**
`BaseAdapter.stripMarkdownFences()` removes fences if they appear, so agents can't crash the pipeline even if they ignore instructions.

---

### Failure Mode 2: Agent Forgets Required Fields

**What happens:**
```json
{
  "topic": "...",
  "working_title": "..."
  // Missing: target_audience, purpose, angle, etc.
}
```

**Why it happens:**
Large schemas are hard to remember. Agents sometimes forget less-obvious fields.

**Guardrail in prompts:**
Every schema is listed in full with descriptions:

```markdown
- **target_audience** (string): Who this is written for
- **purpose** (string): The goal of the content
- **angle** (string): The specific lens or perspective
```

**Fallback in code:**
Zod validation catches missing fields immediately and provides a specific error:
```
Schema validation failed:
  • target_audience — Required
  • purpose — Required
```

---

### Failure Mode 3: EditorAgent Inflates Scores

**What happens:**
Agent gives everything a 9 or 10 to avoid redrafts, even when quality is mediocre.

**Why it happens:**
LLMs have a "helpful" bias — they want to provide positive feedback.

**Guardrail in prompts:**
```markdown
## Critical Rules

2. **Score honestly** — don't inflate scores; the system depends on accurate assessment
```

Plus calibration examples:

```markdown
### Clarity (1–10)

**10**: Every sentence is crystal clear.
**7**: Mostly clear, but a few sections require re-reading.
**4**: Frequently unclear.
```

This anchors the agent's scoring to concrete examples.

---

### Failure Mode 4: DraftAgent Ignores Editor Feedback

**What happens:**
Editor says "Add more examples," draft agent ignores it and just fixes typos.

**Why it happens:**
Redraft prompts are complex: they contain the original brief, research, outline, *and* editor feedback. Agents can lose track.

**Guardrail in prompts:**
```markdown
If `draft_version > 1` and `editor_feedback` is provided:

1. **Read the feedback carefully** — it will be specific
2. **Fix the issues raised** — don't ignore any part of the feedback
```

The numbered list forces sequential processing. The imperative phrasing ("Fix the issues") is harder to ignore than "Consider fixing..."

---

### Failure Mode 5: Agents Produce Empty or Placeholder Content

**What happens:**
```markdown
# Article Title

[Introduction goes here]

## Section 1

[Content to be written]
```

**Why it happens:**
Agents sometimes interpret "write a draft" as "create a template."

**Guardrail in prompts:**
```markdown
7. **No placeholder text** — write the full article, not just a skeleton
```

This is reinforced by word count validation — a draft with placeholders will have a word count far below the target, triggering a warning.

---

## <a name="prompt-versioning"></a>6. Prompt Versioning Strategy

### Why Prompt Versioning Matters

As ContentForge evolves, prompts will change. But changing a prompt can break existing behavior. How do you iterate without breaking old runs?

### Recommended Strategy: Git Tags + Metadata

1. **Tag each prompt change:** When you modify a prompt, commit it with a descriptive message and tag the commit:
   ```bash
   git commit -m "EditorAgent: Lower clarity threshold from 7 to 6"
   git tag prompt-v1.1.0
   ```

2. **Log prompt version in metadata:** Add a `prompt_version` field to `RunMetadata`:
   ```json
   {
     "run_id": "run_20240315_142301",
     "prompt_version": "v1.1.0",
     ...
   }
   ```

3. **Pin to prompt versions for reproducibility:** If you need to reproduce a run from six months ago, check out the tagged prompt version:
   ```bash
   git checkout prompt-v1.0.0
   npm start run "Your topic"
   ```

### What to Version

**Always version:**
- Changes to output schemas (adding/removing fields)
- Changes to scoring thresholds
- Changes to examples

**Don't version:**
- Typo fixes in prompt text
- Clarifications that don't change behavior

### Example: Adding a New Field to ResearchPackage

**Before:**
```json
{
  "brief": { ... },
  "key_facts": [ ... ],
  "supporting_examples": [ ... ]
}
```

**After (v2.0.0):**
```json
{
  "brief": { ... },
  "key_facts": [ ... ],
  "supporting_examples": [ ... ],
  "estimated_research_quality": 8  ← New field
}
```

**What to do:**
1. Update `ResearchPackageSchema` in `models/schemas.ts`
2. Update `prompts/research-agent.md` to instruct the agent to return the new field
3. Update `prompts/outline-agent.md` to handle the new field (or ignore it if not used)
4. Tag the commit: `git tag prompt-v2.0.0`

**Why this works:**
Old runs remain reproducible. New runs use the new schema. The tag lets you trace exactly when the change was made.

---

## Conclusion

ContentForge's design is opinionated:
- Structured data over natural language
- Validation over trust
- Explicit contracts over implicit assumptions

These choices trade flexibility for reliability. The result is a system where failure modes are predictable, outputs are inspectable, and quality is enforced by design — not by hope.

---

**For questions or contributions, see the main [README.md](./README.md).**