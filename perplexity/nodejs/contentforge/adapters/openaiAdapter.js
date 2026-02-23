export default class OpenAIAdapter {
  constructor() {
    console.log('🧪 Using MOCK OpenAI (no API key needed)');
  }

  async call(systemPrompt, userMessage) {
    const topicMatch = userMessage.match(/Raw topic: "([^"]+)"/);
    const topic = topicMatch ? topicMatch[1] : 'Demo Topic';
    
    return `{
      "topic": "${topic}",
      "working_title": "The Future of ${topic}",
      "target_audience": "tech professionals and developers",
      "purpose": "educate",
      "angle": "practical roadmap for 2026",
      "content_type": "blog_post",
      "tone": ["informative", "professional", "forward-looking"],
      "key_points": [
        "Current state of AI agent technology",
        "Key technical breakthroughs expected",
        "Business impact and adoption trends", 
        "Developer tools and frameworks",
        "Ethical considerations and governance",
        "Practical implementation roadmap"
      ],
      "what_to_avoid": ["hype without substance", "unverified predictions", "technical jargon"],
      "estimated_word_count": 1500,
      "success_criteria": ["actionable insights", "evidence-based", "developer-focused"]
    }`;
  }
}
