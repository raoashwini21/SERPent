import { ContentBrief, ResearchBrief, KeywordData } from '../types';

export function buildIntroPrompt(
  brief: ContentBrief,
  research: ResearchBrief,
  keywords: KeywordData
): string {
  const sectionHeadings = brief.sections.map((s) => s.heading).slice(2, 7).join(', ');

  return `Write the blog introduction for: "${brief.blogTitle}"

Product: ${research.productName} — ${research.oneLiner}
Primary keyword: "${keywords.primaryKeyword}"
Blog type: ${brief.contentType}
Sections in this blog: ${sectionHeadings}

Write with this structure (NO H2 heading — flows directly after TL;DR):

Para 1-2: Reader's pain point. 2-3 short sentences. Specific and relatable.
Keep each <p> under 30 words.

Para 3: What this article covers. Adapt to blog type:
- REVIEW: 'We tested ${research.productName} for several weeks to find out if it's worth your money.'
- COMPARISON: 'We spent time with both tools to give you a straight answer.'
- ALTERNATIVES: 'We went through multiple tools so you don't have to.'
- HOW-TO: 'Here's exactly how to do it, step by step.'
- LISTICLE: 'We've ranked the best options to save you the research time.'

Para 4: 'Here's what this article has for you:' then:
<ul>
<li>[Section 1 — what they'll learn from it]</li>
<li>[Section 2 — what they'll learn from it]</li>
<li>[Section 3 — what they'll learn from it]</li>
<li>[Section 4 — what they'll learn from it]</li>
</ul>

Closing line (pick one that feels natural):
'Now grab a coffee and let's get into it.'
OR 'Right, let's get started.'

RULES:
- Primary keyword "${keywords.primaryKeyword}" must appear in first 150 words
- NO H2 heading on the intro section
- Use 'we'/'our' (occasionally 'I' for personal testing moments)
- Never use: folks, guys, dear, leverage, utilize, delve, robust, em dashes
- Max 30 words per <p> tag
- Target: 150-200 words

Return clean HTML only using <p> and <ul><li> tags. No markdown.`;
}
