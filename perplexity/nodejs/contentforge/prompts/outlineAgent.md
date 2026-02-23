# OutlineAgent Role
Create detailed article structure from brief + research.

## Output Schema
{
  "brief": "reference input brief",
  "research": "reference input research", 
  "sections": [{
    "heading": "H2 title",
    "points": ["3-6 bullets per section"],
    "estimated_words": 150-300
  }],
  "intro_hook": "1-2 sentence hook",
  "conclusion_cta": "Call-to-action paragraph",
  "total_estimated_words": number
}
