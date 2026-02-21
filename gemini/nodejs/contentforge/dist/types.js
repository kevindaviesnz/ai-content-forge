"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishedArticleSchema = exports.EditedArticleSchema = exports.ArticleDraftSchema = exports.ArticleOutlineSchema = exports.ResearchPackageSchema = exports.ContentBriefSchema = exports.ContentTypeEnum = void 0;
const zod_1 = require("zod");
// --- Enums & Helpers ---
exports.ContentTypeEnum = zod_1.z.enum(['Blog Post', 'Article', 'Case Study', 'Whitepaper', 'Opinion Piece']);
// 1. ContentBrief
exports.ContentBriefSchema = zod_1.z.object({
    topic: zod_1.z.string(),
    working_title: zod_1.z.string(),
    target_audience: zod_1.z.string(),
    purpose: zod_1.z.string(),
    angle: zod_1.z.string(),
    content_type: exports.ContentTypeEnum,
    tone: zod_1.z.array(zod_1.z.string()),
    key_points: zod_1.z.array(zod_1.z.string()).min(4).max(6),
    what_to_avoid: zod_1.z.string(),
    estimated_word_count: zod_1.z.number(),
    success_criteria: zod_1.z.array(zod_1.z.string()),
});
// 2. ResearchPackage
exports.ResearchPackageSchema = zod_1.z.object({
    brief: exports.ContentBriefSchema,
    key_facts: zod_1.z.array(zod_1.z.string()),
    key_questions_answered: zod_1.z.array(zod_1.z.string()),
    supporting_examples: zod_1.z.array(zod_1.z.string()),
    counterarguments: zod_1.z.array(zod_1.z.string()),
    suggested_sources: zod_1.z.array(zod_1.z.string()),
    research_gaps: zod_1.z.array(zod_1.z.string()).optional(),
});
// 3. ArticleOutline
exports.ArticleOutlineSchema = zod_1.z.object({
    brief: exports.ContentBriefSchema,
    research: exports.ResearchPackageSchema,
    sections: zod_1.z.array(zod_1.z.object({
        heading: zod_1.z.string(),
        points: zod_1.z.array(zod_1.z.string()),
        estimated_words: zod_1.z.number()
    })),
    intro_hook: zod_1.z.string(),
    conclusion_cta: zod_1.z.string(),
    total_estimated_words: zod_1.z.number()
});
// 4. ArticleDraft
exports.ArticleDraftSchema = zod_1.z.object({
    brief: exports.ContentBriefSchema,
    outline: exports.ArticleOutlineSchema,
    title: zod_1.z.string(),
    body: zod_1.z.string(),
    word_count: zod_1.z.number(),
    draft_version: zod_1.z.number(),
    feedback_for_redraft: zod_1.z.string().optional()
});
// 5. EditedArticle
exports.EditedArticleSchema = zod_1.z.object({
    brief: exports.ContentBriefSchema,
    draft: exports.ArticleDraftSchema,
    title: zod_1.z.string(),
    body: zod_1.z.string(),
    word_count: zod_1.z.number(),
    edit_notes: zod_1.z.string(),
    quality_scores: zod_1.z.object({
        clarity: zod_1.z.number().min(1).max(10),
        accuracy: zod_1.z.number().min(1).max(10),
        tone_match: zod_1.z.number().min(1).max(10),
        structure: zod_1.z.number().min(1).max(10),
    }),
    passed_quality_threshold: zod_1.z.boolean(),
    feedback_for_redraft: zod_1.z.string().optional()
});
// 6. PublishedArticle
exports.PublishedArticleSchema = zod_1.z.object({
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()),
    markdown: zod_1.z.string(),
    word_count: zod_1.z.number(),
    reading_time_minutes: zod_1.z.number()
});
