import { ContentBrief, ResearchBrief, KeywordData } from '../types';

export function buildFAQPrompt(
  brief: ContentBrief,
  research: ResearchBrief,
  keywords: KeywordData
): string {
  const questions = keywords.peopleAlsoAsk;
  const questionsText =
    questions.length > 0
      ? questions.map((q) => `- ${q}`).join('\n')
      : `- What is ${research.productName}?\n- How much does ${research.productName} cost?\n- Is ${research.productName} worth it?\n- What are the best alternatives to ${research.productName}?`;

  return `Write the FAQ section for a blog about ${research.productName}.

Product: ${research.productName} — ${research.oneLiner}
Primary keyword: ${keywords.primaryKeyword}

Questions to answer (each becomes an H3):
${questionsText}

Context for answers:
- Pricing: ${research.pricing.plans.map((p) => `${p.name}: ${p.price}`).join(', ')}
- Free trial: ${research.pricing.freeTrial ? 'Yes, 14-day free trial' : 'No free trial'}
- G2 rating: ${research.g2Rating ?? 'not available'}
- Target audience: ${research.targetAudience}
- Key competitors: ${research.competitors.slice(0, 3).join(', ')}

RULES:
- H2 heading: <h2>Frequently Asked Questions About ${research.productName}</h2>
- Each PAA question becomes an <h3> (verbatim from the list above)
- Answer each in 2-3 sentences — concise, natural, conversational
- Include relevant keywords in answers where they fit naturally
- This section will automatically get JSON-LD FAQ schema — keep answers clean text (no nested HTML in answers)
- Each answer paragraph under 30 words
- Target: 200-300 words total

Return clean HTML only using <h2>, <h3>, <p> tags. No markdown.`;
}
