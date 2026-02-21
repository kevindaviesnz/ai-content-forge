import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const ContentTypeEnum = z.enum([
  "blog_post",
  "article",
  "opinion_piece",
  "how_to_guide",
  "listicle",
  "case_study",
  "whitepaper",
  "newsletter",
]);

export const ToneEnum = z.enum([
  "authoritative",
  "conversational",
  "formal",
  "informal",
  "humorous",
  "inspirational",
  "analytical",
  "empathetic",
  "persuasive",
  "neutral",
  "informative"
]);

export const ProviderEnum = z.enum([
  "anthropic",
  "openai",
  "gemini",
  "grok",
]);

// ─── ContentBrief ─────────────────────────────────────────────────────────────

export const ContentBriefSchema = z.object({
  /** The raw topic or subject of the article */
  topic: z.string().min(1),

  /** A working title — may be refined later by the editor or publisher */
  working_title: z.string().min(1),

  /** Who this content is written for (e.g. "senior software engineers") */
  target_audience: z.string().min(1),

  /** The goal of the content (e.g. "educate", "persuade", "entertain") */
  purpose: z.string().min(1),

  /** The specific angle or lens through which the topic is approached */
  angle: z.string().min(1),

  /** The format of the piece */
  content_type: ContentTypeEnum,

  /** A list of tone descriptors (e.g. ["conversational", "authoritative"]) */
  tone: z.array(ToneEnum).min(1).max(4),

  /** The 4–6 key points the article must cover */
  key_points: z.array(z.string()).min(4).max(6),

  /** Topics, phrases, or approaches to explicitly avoid */
  what_to_avoid: z.string(),

  /** Target word count for the finished article */
  estimated_word_count: z.number().int().min(300).max(10000),

  /** Measurable criteria for a successful piece */
  success_criteria: z.array(z.string()).min(1).max(5),
});

// ─── ResearchPackage ──────────────────────────────────────────────────────────

export const ResearchPackageSchema = z.object({
  /** The brief that drove this research */
  brief: ContentBriefSchema,

  /** Factual statements, statistics, or data points the writer can use */
  key_facts: z.array(z.string()).min(3),

  /** Questions a reader might ask, answered in full */
  key_questions_answered: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    })
  ).min(2),

  /** Concrete examples, case studies, or analogies to illustrate points */
  supporting_examples: z.array(z.string()).min(2),

  /** Opposing viewpoints or criticisms to acknowledge */
  counterarguments: z.array(z.string()).min(1),

  /** Plausible sources the writer could reference or verify */
  suggested_sources: z.array(
    z.object({
      title: z.string(),
      author_or_org: z.string(),
      relevance: z.string(),
    })
  ).min(2),

  /** Areas where the research is thin or uncertain (optional) */
  research_gaps: z.array(z.string()).optional(),
});

// ─── ArticleOutline ───────────────────────────────────────────────────────────

export const OutlineSectionSchema = z.object({
  /** Section heading as it will appear in the article */
  heading: z.string().min(1),

  /** Bullet points of what this section must cover */
  points: z.array(z.string()).min(1),

  /** Estimated word count for this section */
  estimated_words: z.number().int().min(50),
});

export const ArticleOutlineSchema = z.object({
  brief: ContentBriefSchema,
  research: ResearchPackageSchema,

  /** Ordered list of article sections */
  sections: z.array(OutlineSectionSchema).min(3),

  /** Opening hook to grab the reader's attention */
  intro_hook: z.string().min(1),

  /** Closing call-to-action for the conclusion */
  conclusion_cta: z.string().min(1),

  /** Sum of all section estimated_words */
  total_estimated_words: z.number().int().min(300),
});

// ─── ArticleDraft ─────────────────────────────────────────────────────────────

export const ArticleDraftSchema = z.object({
  /** Final article title (may differ from working_title) */
  title: z.string().min(1),
  /** Full article body in Markdown */
  body: z.string().min(100),
  /** Actual word count of the body */
  word_count: z.number().int().min(1),
  /** Draft version number (1, 2, 3, etc.) */
  draft_version: z.number().int().min(1),
});

// ─── EditedArticle ────────────────────────────────────────────────────────────

export const QualityScoresSchema = z.object({
  /** How easy the article is to read and understand (1–10) */
  clarity: z.number().int().min(1).max(10),

  /** How factually sound and well-supported the content is (1–10) */
  accuracy: z.number().int().min(1).max(10),

  /** How well the writing matches the brief's tone requirements (1–10) */
  tone_match: z.number().int().min(1).max(10),

  /** How logical and well-organised the article structure is (1–10) */
  structure: z.number().int().min(1).max(10),
});

export const EditedArticleSchema = z.object({
  brief: ContentBriefSchema,
  draft: ArticleDraftSchema,

  /** Polished article title */
  title: z.string().min(1),

  /** Edited article body in Markdown */
  body: z.string().min(100),

  /** Word count of the edited body */
  word_count: z.number().int().min(1),

  /** Editor's notes summarising changes made */
  edit_notes: z.string(),

  /** Scores across four quality dimensions */
  quality_scores: QualityScoresSchema,

  /** true if all scores >= 7; false if any score < 7 */
  passed_quality_threshold: z.boolean(),

  /** Populated only when passed_quality_threshold is false */
  feedback_for_redraft: z.string().optional(),
});

// ─── PublishedArticle ─────────────────────────────────────────────────────────

export const PublishedArticleSchema = z.object({
  /** Final published title */
  title: z.string().min(1),

  /** SEO meta description (150–160 chars recommended) */
  description: z.string().min(50).max(300),

  /** Taxonomy tags for categorisation */
  tags: z.array(z.string()).min(1).max(10),

  /** The complete, publish-ready Markdown document */
  markdown: z.string().min(100),

  /** Final word count */
  word_count: z.number().int().min(1),

  /** Estimated reading time in minutes (assumes ~200 wpm) */
  reading_time_minutes: z.number().min(0.5),
});

// ─── LLM Config ───────────────────────────────────────────────────────────────

export const LLMConfigSchema = z.object({
  /** Which provider to use for this call */
  provider: ProviderEnum,

  /** Provider-specific model identifier */
  model: z.string().min(1),

  /** Maximum tokens to generate */
  max_tokens: z.number().int().min(100).max(16000).default(4096),

  /** Sampling temperature (0 = deterministic, 1 = creative) */
  temperature: z.number().min(0).max(1).default(0.7),
});

// ─── Run Metadata ─────────────────────────────────────────────────────────────

export const RunMetadataSchema = z.object({
  run_id: z.string(),
  topic: z.string(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  provider_used: ProviderEnum,
  agent_providers: z.record(z.string(), z.string()),
  redraft_count: z.number().int().min(0),
  success: z.boolean(),
  error: z.string().optional(),
});

// ─── Clarification (BriefAgent intermediate) ──────────────────────────────────

export const ClarificationSchema = z.object({
  /** true = needs clarification; false = brief is ready */
  needs_clarification: z.boolean(),

  /** Up to 3 questions to ask the user before proceeding */
  questions: z.array(z.string()).max(3).optional(),

  /** Populated when needs_clarification is false */
  brief: ContentBriefSchema.optional(),
});