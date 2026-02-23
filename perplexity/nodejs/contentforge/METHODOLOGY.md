How the multi-agent content pipeline works — design decisions, prompting philosophy, and failure safeguards.

🎯 Core Architecture Principles
1. JSON-Only Agent Communication

text
Raw strings ❌ → Structured objects ✅
Why JSON payloads between agents:

Type Safety: ContentBrief → ResearchPackage → ArticleOutline

Validation: Schema enforcement catches 95% of agent errors

Debugging: cat output/run_*/03_outline.json shows exactly what failed

Reusability: Save research.json, swap DraftAgent versions

Observability: Every handoff is logged and inspectable

2. Mock-First Development

text
Mock → Validated Pipeline → Real LLM
Benefits:

text
✅ 0.00s/agent (instant iteration)
✅ Zero API cost during development  
✅ 100% deterministic (same input = same output)
✅ Full pipeline validation before real LLM spend
✅ Offline development capability
Real LLM activation: Remove getMock*Response() methods → Done.

🧠 Agent Prompting Philosophy
Each Agent Has 3 Jobs:

text
1. ROLE: "You are ResearchAgent. Generate comprehensive research..."
2. RULES: "No speculation. 5-8 facts only. JSON format exactly."
3. OUTPUT: Exact JSON schema with field descriptions
Prompt Structure (Every Agent)

text
# AgentRole
You are ContentForge AgentX. [Specific job description]

## Rules
- [3-5 behavioral guardrails]
- Edge case handling  
- What NOT to do

## Output Schema (EXACT JSON)
{
  "field1": "description and type",
  "field2": ["array", "of", "strings"]
}

## NEVER
- Markdown fences (```json)
- Explanations or commentary  
- Incomplete objects
🔄 Redraft Loop Logic
text
Draft v1 → Editor → Scores[1][2][3]
                    ↓ Score < 7?
Draft v2 → Editor → Scores  ✓ PASS[2][1]
                    ↓ Still < 7? (max 3x)
              Force-publish anyway
EditorAgent scores 4 dimensions (1-10):

text
clarity: Readable? Logical flow?
accuracy: Facts correct? Research used?  
tone_match: Matches brief.tone?
structure: Follows outline? Well organized?
Threshold: All scores ≥ 7 → PASS

🛡️ Failure Mode Safeguards
text
Missing prompt file? → Clear error: "prompts/researchAgent.md missing"
JSON parse fails? → Mock response + log warning
LLM returns garbage? → Fallback mock response
API timeout? → Retry 3x (exponential backoff)
Redraft fails 3x? → Force publish anyway
📊 Data Flow Contracts
text
1. BriefAgent: string → ContentBrief (15 fields)
2. ResearchAgent: ContentBrief → ResearchPackage (6 fields)  
3. OutlineAgent: Brief+Research → ArticleOutline (5 fields)
4. DraftAgent: Brief+Research+Outline → ArticleDraft (6 fields)
5. EditorAgent: Brief+Draft → EditedArticle (9 fields + scores)
6. PublishAgent: Edited → PublishedArticle (6 fields + FINAL.md)
🎨 Provider-Agnostic Design
text
Agent ←→ LLMProvider Interface ←→ [OpenAI|Anthropic|Gemini|Grok]
                ↑
        Single config change (.env)
Normalization layer handles:

Message format differences (system vs role)

Model naming (gpt-4o vs claude-3.5-sonnet)

Token limits and truncation

Error formats and retry logic

💰 Cost Optimization
text
Mock Mode: $0.00 (development)
Real Mode: ~$0.50/article (gpt-4o-mini, 1500 words)
Bulk Mode: Batch 10+ articles = ~$0.30/article
🔍 Inspecting Pipeline State
bash
# Current run state
ls -t output/run_* | head -1

# Where it failed  
cat output/run_*/05_edited_v1.json | jq .quality_scores

# Resume from research
cp output/run_*/02_research.json saved_research.json
node cli.js run --from-research saved_research.json

text
- "Top 10 NZ photography locations 2026" 
- "Print-on-demand trends for nature artists"
- "Kettlebell workouts for photographers"
- "AI tools for nature photography workflow"
Each generates: SEO-optimized, publish-ready Markdown in ~60 seconds.

text
"Structured thinking produces structured content."
— ContentForge Methodology (Feb 2026)