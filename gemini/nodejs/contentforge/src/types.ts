import { z } from 'zod';

// --- Enums & Helpers ---
export const ContentTypeEnum = z.enum(['Blog Post', 'Article', 'Case Study', 'Whitepaper', 'Opinion Piece']);

// 1. ContentBrief
export const ContentBriefSchema = z.object({
  topic: z.string(),
  working_title: z.string(),
  target_audience: z.string(),
  purpose: z.string(),
  angle: z.string(),
  content_type: ContentTypeEnum,
  tone: z.array(z.string()),
  key_points: z.array(z.string()).min(4).max(6),
  what_to_avoid: z.string(),
  estimated_word_count: z.number(),
  success_criteria: z.array(z.string()),
});
export type ContentBrief = z.infer<typeof ContentBriefSchema>;

// 2. ResearchPackage
export const ResearchPackageSchema = z.object({
  brief: ContentBriefSchema,
  key_facts: z.array(z.string()),
  key_questions_answered: z.array(z.string()),
  supporting_examples: z.array(z.string()),
  counterarguments: z.array(z.string()),
  suggested_sources: z.array(z.string()),
  research_gaps: z.array(z.string()).optional(),
});
export type ResearchPackage = z.infer<typeof ResearchPackageSchema>;

// 3. ArticleOutline
export const ArticleOutlineSchema = z.object({
  brief: ContentBriefSchema,
  research: ResearchPackageSchema,
  sections: z.array(z.object({
    heading: z.string(),
    points: z.array(z.string()),
    estimated_words: z.number()
  })),
  intro_hook: z.string(),
  conclusion_cta: z.string(),
  total_estimated_words: z.number()
});
export type ArticleOutline = z.infer<typeof ArticleOutlineSchema>;

// 4. ArticleDraft
export const ArticleDraftSchema = z.object({
  brief: ContentBriefSchema,
  outline: ArticleOutlineSchema,
  title: z.string(),
  body: z.string(),
  word_count: z.number(),
  draft_version: z.number(),
  feedback_for_redraft: z.string().optional()
});
export type ArticleDraft = z.infer<typeof ArticleDraftSchema>;

// 5. EditedArticle
export const EditedArticleSchema = z.object({
  brief: ContentBriefSchema,
  draft: ArticleDraftSchema,
  title: z.string(),
  body: z.string(),
  word_count: z.number(),
  edit_notes: z.string(),
  quality_scores: z.object({
    clarity: z.number().min(1).max(10),
    accuracy: z.number().min(1).max(10),
    tone_match: z.number().min(1).max(10),
    structure: z.number().min(1).max(10),
  }),
  passed_quality_threshold: z.boolean(),
  feedback_for_redraft: z.string().optional()
});
export type EditedArticle = z.infer<typeof EditedArticleSchema>;

// 6. PublishedArticle
export const PublishedArticleSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  markdown: z.string(),
  word_count: z.number(),
  reading_time_minutes: z.number()
});
export type PublishedArticle = z.infer<typeof PublishedArticleSchema>;