import { SectionBrief, ResearchBrief, KeywordData } from '../types';

export function buildPricingPrompt(
  section: SectionBrief,
  research: ResearchBrief,
  _keywords: KeywordData
): string {
  const plansText = research.pricing.plans
    .map((p) => `- <strong>${p.name}:</strong> ${p.price} — ${p.features.slice(0, 4).join(', ')}`)
    .join('\n');

  const paaNote =
    section.paaToAnswer && section.paaToAnswer.length > 0
      ? `Directly answer this question early in the section: "${section.paaToAnswer[0]}"`
      : `Directly answer: "How much does ${research.productName} cost?" at the start`;

  return `Write the pricing section for: ${research.productName}

H2 heading to use: "${section.heading}"
Target keywords: ${section.targetKeywords.join(', ')}
${paaNote}

Pricing plans:
${plansText}
Free trial: ${research.pricing.freeTrial ? 'Yes' : 'No'}
Competitors: ${research.competitors.slice(0, 2).join(', ') || 'N/A'}

Write in this structure:

<h2>${section.heading}</h2>

<p>Here's a breakdown of ${research.productName}'s pricing:</p>
<ul>
${research.pricing.freeTrial ? '<li><strong>Free Trial:</strong> [trial details]</li>' : ''}
[One <li> per plan: <li><strong>[Plan name]:</strong> $X/month — [what's included]</li>]
</ul>

<p>[1-2 sentences: which plan suits which team size]</p>

[If annual discount available: <p>[Annual discount details]</p>]

[If hidden costs exist: <p>[Hidden costs paragraph: contracts, setup fees, per-seat charges]</p>]

${research.pricing.freeTrial ? `<p>You can <a href="https://www.salesrobot.co/signup">start a 14-day free trial</a> — no credit card needed.</p>` : ''}

<p>For context, SalesRobot starts at $59/month with transparent pricing, no annual contracts, and a 14-day free trial with no credit card needed.</p>

RULES:
- ${paaNote}
- Each <p> under 30 words
- Only compare to SDR cost ($85k/year) if this tool is positioned as replacing sales headcount — skip otherwise
- Be honest about what each plan includes and doesn't
- Target: ${section.wordCountTarget} words

Return clean HTML only. No markdown.`;
}
