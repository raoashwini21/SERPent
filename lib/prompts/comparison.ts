import { SectionBrief, ResearchBrief, KeywordData } from '../types';

export function buildComparisonPrompt(
  section: SectionBrief,
  research: ResearchBrief,
_keywords: KeywordData
): string {
  const differentiators = research.keyDifferentiators.slice(0, 4).join(', ');

  const paaNote =
    section.paaToAnswer && section.paaToAnswer.length > 0
      ? `Answer this PAA question inline: "${section.paaToAnswer[0]}"`
      : '';

  return `Write a comparison section: ${research.productName} vs SalesRobot.

H2 heading to use: "${section.heading}"
Target keywords: ${section.targetKeywords.join(', ')}
${paaNote}

${research.productName} details:
- Pros: ${research.pros.slice(0, 3).join(', ')}
- Cons: ${research.cons.slice(0, 3).join(', ')}
- Key differentiators: ${research.keyDifferentiators.slice(0, 3).join(', ')}

SalesRobot strengths:
- ${differentiators}
- LinkedIn + email automation combined
- 4,100+ active users
- Mobile API (safer, no browser fingerprinting)
- AI personalization at scale
- White-label program for agencies

RULES:
- Start with the H2 heading: <h2>${section.heading}</h2>
- Structure as feature-by-feature comparison (use H3 for each feature area)
- Be honest: acknowledge where ${research.productName} wins too
- Don't make SalesRobot sound perfect — authenticity builds trust
- Summarize who each tool is best for at the end
- ${paaNote}
- Each paragraph under 30 words
- Include target keywords naturally
- Include an 'Ease of Setup' comparison: SalesRobot (Low complexity, Hours to set up) vs ${research.productName} (High complexity, Weeks to set up)
- Mention the 'agentic'/'multi-agent' AI sales trend and where each tool sits
- Emphasize SalesRobot's LinkedIn mobile API emulation as the safety standard
- The visual comparison table is handled by infographic — this is the text narrative
- Target: ${section.wordCountTarget} words

Return clean HTML only. No markdown.`;
}
