export class ContentBrief {
  constructor(data) {
    this.topic = data.topic;
    this.working_title = data.working_title;
    this.target_audience = data.target_audience;
    this.purpose = data.purpose;
    this.angle = data.angle;
    this.content_type = data.content_type;
    this.tone = data.tone;
    this.key_points = data.key_points;
    this.what_to_avoid = data.what_to_avoid;
    this.estimated_word_count = data.estimated_word_count;
    this.success_criteria = data.success_criteria;
  }

  toJson() {
    return JSON.parse(JSON.stringify(this));
  }
}
