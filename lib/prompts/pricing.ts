import { SectionBrief, ResearchBrief, KeywordData } from '../types';

export function buildPricingPrompt(
  section: SectionBrief,
  research: ResearchBrief,
_keywords: KeywordData
): string {
  const plansText = research.pricing.plans
    .map(
      (p) =>
        `- ${p.name} (${p.price}): ${p.features.slice(0, 4).join(', ')}`
    )
    .join('\n');

  const competitorNote =
    research.competitors.length > 0
      ? `Compare value to: ${research.competitors.slice(0, 2).join(', ')}`
      : '';

  const paaNote =
    section.paaToAnswer && section.paaToAnswer.length > 0
      ? `Directly answer this question early in the section: "${section.paaToAnswer[0]}"`
      : `Directly answer: "How much does ${research.productName} cost?" at the start`;

  return `Write the pricing section for a blog about ${research.productName}.

H2 heading to use: "${section.heading}"
Target keywords: ${section.targetKeywords.join(', ')}

Pricing plans:
${plansText}
Free trial available: ${research.pricing.freeTrial ? 'Yes' : 'No'}
${competitorNote}

RULES:
- Start with the H2 heading: <h2>${section.heading}</h2>
- ${paaNote}
- Break down each plan clearly: name, price, what you get
- Mention if there's a free trial — if yes, include this CTA naturally:
  <p>You can <a href="https://www.salesrobot.co/signup">start a 14-day free trial</a> — no credit card needed.</p>
- ${competitorNote ? 'Give brief value comparison vs competitors — be honest' : ''}
- Each paragraph under 30 words
- Include target keywords naturally
- Target: ${section.wordCountTarget} words

Return clean HTML only. No markdown.`;
}
