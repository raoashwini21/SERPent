import { ContentBrief, ResearchBrief, KeywordData } from '../types';

export function buildTLDRPrompt(
  brief: ContentBrief,
  research: ResearchBrief,
  keywords: KeywordData
): string {
  return `Write a TL;DR section for a blog post titled: "${brief.blogTitle}"

Product: ${research.productName}
Primary keyword: ${keywords.primaryKeyword}
Key points to cover: ${research.pros.slice(0, 3).join(', ')}; cons: ${research.cons.slice(0, 2).join(', ')}

RULES:
- Start with a 'Quick Verdict' paragraph: exactly 2 sentences directly answering 'Is ${research.productName} worth it?' — no heading, just a <p> with <strong>Quick Verdict:</strong> prefix
- Then follow with exactly 4 bullet points summarizing the blog
- Exactly 4 bullet points
- Each bullet under 20 words
- Include primary keyword "${keywords.primaryKeyword}" in at least one bullet
- Use <ul><li> tags
- No H2 heading — the section wrapper handles that
- Bullets should be concrete takeaways, not vague summaries
- Target: 80-100 words total

Return clean HTML only. Example format:
<ul>
  <li><strong>Key point 1:</strong> specific detail here.</li>
  <li><strong>Key point 2:</strong> another specific detail.</li>
</ul>`;
}
