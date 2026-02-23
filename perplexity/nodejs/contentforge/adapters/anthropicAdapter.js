export default class AnthropicAdapter {
  async call(systemPrompt, userMessage) {
    return `{
      "topic": "${userMessage.split('"')[1] || 'Demo'}",
      "working_title": "Demo Brief",
      "target_audience": "general",
      "purpose": "educate",
      "angle": "overview",
      "content_type": "blog_post",
      "tone": ["informative"],
      "key_points": ["point 1", "point 2"],
      "what_to_avoid": [],
      "estimated_word_count": 1200,
      "success_criteria": ["clear"]
    }`;
  }
}
