ContentForge 🚀
Multi-agent AI content creation pipeline powered by Anthropic, OpenAI, Gemini, or Grok.

text
User Topic → Brief → Research → Outline → Draft → Edit → Publish
                         ↑                       ↓
                    Redraft Loop (3x max)
✨ Features
6 Specialized Agents with typed JSON handoff

Provider Agnostic (OpenAI, Anthropic, Gemini, Grok)

Editor Redraft Loop (auto-improves drafts)

Production Ready Markdown output

Mock Mode (works offline, zero cost)

CLI Interface (contentforge run "topic")

Full Audit Trail (JSON + final article)

🚀 Quick Start
bash
# 1. Clone & Install
git clone <this-repo> contentforge
cd contentforge
npm install

# 2. Works instantly (mock mode)
node cli.js run "The future of AI agents"

# 3. Production (add API key)
echo "OPENAI_API_KEY=sk-..." > .env
node cli.js run "NZ nature photography trends"
📋 CLI Commands
bash
# Full pipeline
node cli.js run "Your blog topic"

# Test single agent  
node cli.js agent brief "Test topic"

# List runs
node cli.js runs

# Show run contents
node cli.js show run_20260223_1357
🏗️ Agent Pipeline
text
1. BriefAgent:    Raw topic → ContentBrief
2. ResearchAgent: Brief → ResearchPackage  
3. OutlineAgent:  Brief+Research → ArticleOutline
4. DraftAgent:    All above → ArticleDraft
5. EditorAgent:   Brief+Draft → EditedArticle (scores 1-10)
6. PublishAgent:  Edited → FINAL_ARTICLE.md
Editor Redraft: If any score <7, auto-redrafts (max 3x)

📁 Outputs
Every run creates: output/run_TIMESTAMP/

text
run_20260223_1357/
├── 01_brief.json           # Content brief
├── 02_research.json        # Facts, examples, sources
├── 03_outline.json         # Section structure
├── 04_draft_v1.json        # First draft
├── 05_edited_v1.json       # Editor scores + fixes
├── 06_published.json       # Final metadata
└── FINAL_ARTICLE.md        # ✨ Publish-ready post
🔧 Real LLM Setup
bash
# 1. Get API key (OpenAI recommended)
# 2. Create .env
GLOBAL_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...

# 3. Remove mock responses from adapters/openaiAdapter.js
# 4. Run!
node cli.js run "Your topic"
🛠️ Provider Support
Provider	Status	Adapter File
OpenAI	✅ Ready	adapters/openaiAdapter.js
Anthropic	🔄 Stub	adapters/anthropicAdapter.js
Gemini	🔄 Stub	adapters/geminiAdapter.js
Grok	🔄 Stub	adapters/grokAdapter.js
Switch providers: GLOBAL_PROVIDER=anthropic in .env

bash
node cli.js run "Best NZ photography spots 2026"
node cli.js run "Kettlebell workouts for busy photographers"
node cli.js run "Print-on-demand trends for nature art"
📊 Example Output
text
🎉 COMPLETE! 1247 words (~6 min read)
📄 The Future of AI Agents: 2026 Roadmap
📂 output/run_20260223_1357/
🔍 Troubleshooting
text
Error: "no matches found"     → Quote wildcards: cat "output/run_*"
Error: "missing prompt"       → Check prompts/*.md files exist
Error: "API key required"     → Add OPENAI_API_KEY to .env
Error: "JSON parse failed"    → Mock responses ensure valid JSON
🏷️ License
MIT


