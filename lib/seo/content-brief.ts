import { callClaude } from '../claude';
import { KeywordData, SERPAnalysis, ContentBrief } from '../types';
import { FUNNEL_STAGES } from '../config/funnel-stages';
import { getBlogType } from '../config/blog-types';

export async function generateContentBrief(
  keywordData: KeywordData,
  serpAnalysis: SERPAnalysis,
  blogType: string
): Promise<ContentBrief> {
  const blogTypeConfig = getBlogType(blogType);
  const funnelStage = blogTypeConfig.funnelStage;
  const stageConfig = FUNNEL_STAGES[funnelStage];
  const targetWordCount = Math.round(serpAnalysis.avgWordCount * 1.2);

  const systemPrompt = `You are a senior SEO content strategist. You create detailed, section-by-section content briefs for blog posts. Return valid JSON only — no prose, no markdown fences.`;

  const userMessage = `Create a complete content brief for a ${blogTypeConfig.label} blog post.

BLOG TYPE: ${blogTypeConfig.label} — ${blogTypeConfig.description}
FUNNEL STAGE: ${funnelStage}
SEARCH INTENT: ${blogTypeConfig.searchIntent}
REQUIRED SECTIONS FOR THIS BLOG TYPE: ${blogTypeConfig.sections.join(', ')}

PRIMARY KEYWORD: ${keywordData.primaryKeyword}
SECONDARY KEYWORDS: ${keywordData.secondaryKeywords.map((k) => k.keyword).join(', ')}
LONG-TAIL KEYWORDS: ${keywordData.longTailKeywords.join(', ')}
PEOPLE ALSO ASK: ${keywordData.peopleAlsoAsk.join('\n')}
KEYWORD GROUPS: ${JSON.stringify(keywordData.keywordGroups, null, 2)}

SERP ANALYSIS:
- Average word count: ${serpAnalysis.avgWordCount}
- Search intent: ${serpAnalysis.searchIntent}
- Must-have sections: ${serpAnalysis.mustHaveSections.join(', ')}
- Content gaps: ${serpAnalysis.contentGaps.join(', ')}
- Heading suggestions: ${serpAnalysis.headingSuggestions.join(', ')}

INTENT: ${stageConfig.intent}

TARGET WORD COUNT: ${targetWordCount} (20% above SERP average of ${serpAnalysis.avgWordCount})

Generate the content outline SPECIFICALLY for a ${blogTypeConfig.label} blog:
- REVIEW blogs: include what-is, features, pricing, pros/cons, verdict — frame headings as questions
- COMPARISON blogs: include feature-by-feature table, winner per category, honest assessment
- ALTERNATIVES blogs: list format, brief coverage per tool, SalesRobot as top pick
- HOW-TO blogs: numbered steps, practical and actionable, tool recommendations
- LISTICLE blogs: ranked list with brief tool coverage each, SalesRobot featured prominently
- STRATEGY blogs: numbered tips, tactical and specific, SalesRobot as implementation tool

Return a JSON object with EXACTLY this structure:
{
  "blogTitle": "Primary Keyword + 2026 + Power Word + under 70 chars | Title Case",
  "h1": "Similar to title, primary keyword front-loaded, under 70 chars",
  "contentType": "${blogTypeConfig.id}",
  "targetWordCount": ${targetWordCount},
  "sections": [
    {
      "id": "tldr",
      "heading": "TL;DR",
      "headingTag": "h2",
      "targetKeywords": ["primary keyword"],
      "paaToAnswer": [],
      "wordCountTarget": 80,
      "instructions": "TL;DR section: product summary, pros/cons, pricing, SalesRobot alternative, 'This article is for you if:' scenarios",
      "infographicType": "none"
    },
    {
      "id": "intro",
      "heading": "intro",
      "headingTag": "h2",
      "targetKeywords": ["primary keyword", "secondary keyword"],
      "paaToAnswer": ["relevant PAA question if any"],
      "wordCountTarget": 200,
      "instructions": "Intro: reader pain point, what this article covers, bullet list of sections. No H2 heading.",
      "infographicType": "none"
    }
  ]
}

REQUIRED SECTIONS based on blog type (add after tldr and intro):
${blogTypeConfig.sections.filter(s => s !== 'tldr' && s !== 'intro').map(s => `- ${s}`).join('\n')}

INFOGRAPHIC TYPES to use contextually:
- "comparison": for comparison tables between products/options
- "pros_cons": for advantages/disadvantages sections
- "features": for feature lists or product capabilities
- "pricing": for pricing plan comparisons
- "stats": for data/statistics heavy sections
- "none": for regular text sections
- NEVER assign "workflow" to any section — use "none" instead; write process steps as <ol><li> HTML lists

DEDUPLICATION RULE: Each infographic type may appear AT MOST ONCE across the entire blog.
If the same type would apply to two sections, assign "none" to the second occurrence.
Priority order (keep first occurrence): comparison > pros_cons > pricing > features > stats

4. salesrobot section: infographicType "pricing" — ONLY if pricing not already used in another section
5. faq — ALL People Also Ask questions as H3s (50-80 words per answer), infographicType "none"
6. conclusion — Summary + CTA (150 words), infographicType "none"

Return ONLY the JSON object, nothing else.`;

  const raw = await callClaude(systemPrompt, userMessage, 4096);
  const cleaned = raw.replace(/```(?:json)?/g, '').trim();
  const parsed = JSON.parse(cleaned) as ContentBrief;

  // ── Post-processing: deduplicate infographic types ────────────────────────
  const PRIORITY = ['comparison', 'pros_cons', 'pricing', 'features', 'stats', 'workflow'];
  const seenTypes = new Set<string>();

  // Remove workflow entirely (disabled)
  for (const section of parsed.sections) {
    if (section.infographicType === 'workflow') {
      section.infographicType = 'none';
    }
  }

  // Deduplicate — keep first occurrence by priority, then by position
  for (const type of PRIORITY) {
    let found = false;
    for (const section of parsed.sections) {
      if (section.infographicType === type) {
        if (found || seenTypes.has(type)) {
          section.infographicType = 'none';
        } else {
          found = true;
          seenTypes.add(type);
        }
      }
    }
  }

  // salesrobot section: only gets 'pricing' if pricing not already used elsewhere
  const pricingAlreadyUsed = parsed.sections
    .filter((s) => s.id !== 'salesrobot')
    .some((s) => s.infographicType === 'pricing');

  if (pricingAlreadyUsed) {
    const salesrobotSection = parsed.sections.find((s) => s.id === 'salesrobot');
    if (salesrobotSection) salesrobotSection.infographicType = 'none';
  }

  return parsed;
}
