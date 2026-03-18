import { ContentBrief, ResearchBrief, KeywordData } from '../types';

export function buildIntroPrompt(
  brief: ContentBrief,
  research: ResearchBrief,
  keywords: KeywordData
): string {
  const secondaryKw = keywords.secondaryKeywords[0]?.keyword ?? '';
  return `Write a blog introduction for: "${brief.blogTitle}"

Product: ${research.productName} — ${research.oneLiner}
Primary keyword: "${keywords.primaryKeyword}"
Secondary keyword: "${secondaryKw}"
What the blog covers: ${brief.sections.map((s) => s.heading).slice(2, 6).join(', ')}

RULES:
- Primary keyword must appear in the first 150 words
- Use PAS framework: Problem (reader's pain point) → Agitate (why it matters) → Solve (what this blog gives them)
- Preview 3-4 things the reader will learn (like "Here's what I cover...")
- Make reader feel they'd miss out by not reading
- Sound like a conversation with a knowledgeable friend, NOT a sales pitch
- NO H2 heading — intro has no heading
- Each paragraph under 30 words
- Use "I" not "we"
- Never use: folks, guys, dear, leverage, utilize, delve, robust
- Target: 150-200 words

Return clean HTML only using <p> tags.`;
}
