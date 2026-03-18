import { ContentBrief, ResearchBrief, KeywordData } from '../types';

export function buildConclusionPrompt(
  brief: ContentBrief,
  research: ResearchBrief,
  keywords: KeywordData
): string {
  return `Write the conclusion/verdict section for a blog about ${research.productName}.

Blog title: "${brief.blogTitle}"
Primary keyword: "${keywords.primaryKeyword}"

Key findings to recap:
- Main pros: ${research.pros.slice(0, 2).join(', ')}
- Main cons: ${research.cons.slice(0, 2).join(', ')}
- Best for: ${research.targetAudience}
- Key differentiator: ${research.keyDifferentiators[0] ?? ''}

RULES:
- H2 heading framed as a verdict question, e.g.:
  <h2>Should You Use ${research.productName} in 2026?</h2>
  (Make it keyword-optimized and include the year)
- Recap the key findings in 2-3 short paragraphs
- Be clear about who should use it and who should look elsewhere
- Include primary keyword "${keywords.primaryKeyword}" at least once naturally
- End with a final SalesRobot free trial CTA — natural, not pushy. Example:
  <p>If you're in the market for a LinkedIn + email outreach tool, <a href="https://www.salesrobot.co/signup">SalesRobot offers a 14-day free trial</a> — no commitment, takes 2 minutes.</p>
- Each paragraph under 30 words
- Use "I" not "we"
- Tone: like wrapping up a conversation with a friend — direct, honest, zero fluff
- Target: 150-200 words

Return clean HTML only. No markdown.`;
}
