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

Blog title: "${brief.blogTitle}"
Product: ${research.productName} — ${research.oneLiner}
Primary keyword: ${keywords.primaryKeyword}
Blog type: ${brief.contentType}

Questions to answer (use these EXACTLY as H3 headings):
${questionsText}

Context for answers:
- Pricing: ${research.pricing.plans.map((p) => `${p.name}: ${p.price}`).join(', ')}
- Free trial: ${research.pricing.freeTrial ? 'Yes, 14-day free trial' : 'No free trial'}
- G2 rating: ${research.g2Rating ?? 'not available'}
- Target audience: ${research.targetAudience}
- Key competitors: ${research.competitors.slice(0, 3).join(', ')}

Write the FAQ:

<h2>Frequently Asked Questions About ${research.productName}</h2>

For each question above:
<h3>[Question exactly as listed — do not rephrase]</h3>
<p>[Direct answer — 2-4 sentences. Specific to THIS product. Not generic advice.]</p>
<p>[If relevant, add context or a natural SalesRobot mention — but only if the question is directly about alternatives or LinkedIn tools]</p>

RULES:
- Questions MUST come from the actual People Also Ask data provided above
- NEVER invent generic questions like 'how often should I post?' or 'what makes content SEO friendly?'
- Every question must be specifically about ${research.productName} or ${keywords.primaryKeyword}
- 5-7 questions total
- Each answer paragraph under 30 words
- Answers must be clean text — no nested HTML that breaks FAQ schema
- Tone: direct, conversational, no marketing fluff

Return clean HTML only using <h2>, <h3>, <p> tags. No markdown.`;
}
