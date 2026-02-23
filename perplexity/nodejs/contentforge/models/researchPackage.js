export class ResearchPackage {
  constructor(data) {
    this.brief = data.brief;
    this.key_facts = data.key_facts || [];
    this.key_questions_answered = data.key_questions_answered || {};
    this.supporting_examples = data.supporting_examples || [];
    this.counterarguments = data.counterarguments || [];
    this.suggested_sources = data.suggested_sources || [];
    this.research_gaps = data.research_gaps || [];
  }
}
