import { GoogleGenerativeAI } from '@google/generative-ai';

export default class GeminiAdapter {
  constructor() {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'dummy') {
      console.log('🧪 GEMINI_API_KEY missing/invalid - using mock');
      this.mockMode = true;
      return;
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // 2026 models: Try latest → fallback chain
    const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash-exp'];
    this.modelName = models.find(m => {
      try {
        this.model = this.genAI.getGenerativeModel({ model: m });
        return true;
      } catch (e) {
        return false;
      }
    }) || 'gemini-2.5-flash';
    
    console.log(`✅ Connected to ${this.modelName}`);
  }

  async call(systemPrompt, userMessage, config = {}) {
    if (this.mockMode) {
      const topicMatch = userMessage.match(/Raw topic: "([^"]+)"/);
      const topic = topicMatch ? topicMatch[1] : 'Demo';
      return JSON.stringify({
        topic,
        working_title: `The Future of ${topic}`,
        target_audience: "tech professionals",
        purpose: "educate",
        angle: "2026 roadmap",
        content_type: "blog_post",
        tone: ["informative", "professional"],
        key_points: ["Trend 1", "Trend 2", "Trend 3"],
        estimated_word_count: 1500,
        success_criteria: ["actionable", "evidence-based"]
      });
    }

    try {
      const result = await this.model.generateContent([
        `System: ${systemPrompt}`,
        `User: ${userMessage}`
      ]);
      return result.response.text().trim();
    } catch (error) {
      console.error('Gemini error:', error.message);
      throw new Error(`Gemini API failed: ${error.message}`);
    }
  }
}
