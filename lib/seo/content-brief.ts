import { callClaude } from '../claude';
import { KeywordData, SERPAnalysis, ContentBrief } from '../types';
import { FUNNEL_STAGES, FunnelStage } from '../config/funnel-stages';

export async function generateContentBrief(
  keywordData: KeywordData,
  serpAnalysis: SERPAnalysis,
  funnelStage: FunnelStage
): Promise<ContentBrief> {
  const stageConfig = FUNNEL_STAGES[funnelStage];
  const targetWordCount = Math.round(serpAnalysis.avgWordCount * 1.2);

  const systemPrompt = `You are a senior SEO content strategist. You create detailed, section-by-section content briefs for blog posts. Return valid JSON only — no prose, no markdown fences.`;

  const userMessage = `Create a complete content brief for a ${funnelStage} blog post.

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

FUNNEL STAGE: ${funnelStage}
INTENT: ${stageConfig.intent}
REQUIRED SECTIONS: ${stageConfig.sections.join(', ')}
BLOG TYPE OPTIONS: ${stageConfig.blogTypes.join(', ')}

TARGET WORD COUNT: ${targetWordCount} (20% above SERP average of ${serpAnalysis.avgWordCount})

Return a JSON object with EXACTLY this structure:
{
  "blogTitle": "Primary Keyword + 2026 + Power Word + under 70 chars | Title Case",
  "h1": "Similar to title, primary keyword front-loaded, under 70 chars",
  "contentType": "one of: ${stageConfig.blogTypes.join(' | ')}",
  "targetWordCount": ${targetWordCount},
  "sections": [
    {
      "id": "tldr",
      "heading": "TL;DR",
      "headingTag": "h2",
      "targetKeywords": ["primary keyword"],
      "paaToAnswer": [],
      "wordCountTarget": 80,
      "instructions": "3-4 bullet points summarizing the key takeaways. Include primary keyword naturally.",
      "infographicType": "none"
    },
    {
      "id": "intro",
      "heading": "Introduction heading as a question?",
      "headingTag": "h2",
      "targetKeywords": ["primary keyword", "secondary keyword"],
      "paaToAnswer": ["relevant PAA question if any"],
      "wordCountTarget": 200,
      "instructions": "Hook with a relatable problem. State primary keyword in first sentence. Explain what reader will learn. Keep paragraphs under 30 words each.",
      "infographicType": "none"
    }
  ]
}

SECTIONS TO INCLUDE (in order of importance — inverted pyramid):
1. tldr — Quick summary bullets (80 words)
2. intro — Hook + what reader learns (200 words)
3. Main content sections — one per keyword group / must-have section from SERP (250-400 words each)
   - Frame headings as questions where possible
   - Map PAA questions to relevant sections
   - Assign appropriate infographicType where it adds value
4. salesrobot — Why SalesRobot is the solution (200 words, infographicType: "features")
5. faq — ALL People Also Ask questions as H3s (50-80 words per answer)
6. conclusion — Summary + CTA (150 words)

INFOGRAPHIC TYPES to use contextually:
- "comparison": for comparison tables between products/options
- "pros_cons": for advantages/disadvantages sections
- "features": for feature lists or product capabilities
- "pricing": for pricing plan comparisons
- "workflow": for step-by-step processes
- "stats": for data/statistics heavy sections
- "none": for regular text sections

Return ONLY the JSON object, nothing else.`;

  const raw = await callClaude(systemPrompt, userMessage, 4096);
  const cleaned = raw.replace(/```(?:json)?/g, '').trim();
  const parsed = JSON.parse(cleaned) as ContentBrief;
  return parsed;
}
