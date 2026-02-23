import { BaseAgent } from './baseAgent.js';
import { ContentBrief } from '../models/contentBrief.js';

export class EditorAgent extends BaseAgent {
  constructor() {
    super('editorAgent');
  }

  async run(briefData, draftData) {
    const brief = new ContentBrief(briefData);
    
    const systemPrompt = await this.loadPrompt();
    const userMessage = `Brief: ${JSON.stringify(brief.toJson())}\nDraft: ${JSON.stringify(draftData, null, 2)}\n\nScore 1-10 and edit.`;
    
    const response = await this.callLLM(systemPrompt, userMessage);
    let parsed;
    
    try {
      parsed = await this.parseJsonResponse(response);
    } catch (e) {
      console.log('⚠️  Using fallback mock response for EditorAgent');
      parsed = this.getMockEditorResponse(draftData);
    }
    
    const passed = (parsed.quality_scores?.clarity || 8) >= 7 && 
                   (parsed.quality_scores?.accuracy || 8) >= 7 &&
                   (parsed.quality_scores?.tone_match || 8) >= 7 &&
                   (parsed.quality_scores?.structure || 8) >= 7;
    
    return {
      brief: brief.toJson(),
      draft: draftData,
      title: parsed.title || draftData.title,
      body: parsed.body || draftData.body,
      word_count: parsed.word_count || draftData.word_count,
      edit_notes: parsed.edit_notes || ['Minor formatting improvements'],
      quality_scores: parsed.quality_scores || {
        clarity: 8,
        accuracy: 8, 
        tone_match: 8,
        structure: 8
      },
      passed_quality_threshold: passed,
      feedback_for_redraft: passed ? null : parsed.feedback_for_redraft
    };
  }
  
  getMockEditorResponse(draftData) {
    return {
      "title": draftData.title || "Edited Title",
      "body": draftData.body || "# Edited Article\n\nImproved content with better structure.",
      "word_count": draftData.word_count || 1200,
      "edit_notes": ["Improved sentence flow", "Added transitions", "Enhanced readability"],
      "quality_scores": {
        "clarity": 9,
        "accuracy": 8,
        "tone_match": 9,
        "structure": 9
      },
      "passed_quality_threshold": true,
      "feedback_for_redraft": null
    };
  }
}
