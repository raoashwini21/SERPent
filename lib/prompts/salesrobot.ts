import { SectionBrief, ResearchBrief, KeywordData } from '../types';

export function buildSalesRobotPrompt(
  section: SectionBrief,
  research: ResearchBrief,
  keywords: KeywordData
): string {
  const productGaps = research.cons.slice(0, 3).join(', ');
  const primaryKw = keywords.primaryKeyword;

  return `Write the "How SalesRobot Can Help" section for a blog about ${research.productName}.

H2 heading to use: "${section.heading}"
Target keywords: ${section.targetKeywords.join(', ')}
Primary keyword context: ${primaryKw}

Gaps/cons in ${research.productName} to address: ${productGaps}

SalesRobot key facts:
- LinkedIn + email outreach automation in one platform
- 4,100+ active users
- Uses mobile API (no browser extension = safer, avoids LinkedIn bans)
- AI-powered message personalization
- White-label program: agencies can resell under their own brand
- 14-day free trial, no credit card needed
- Integrates with major CRMs

RULES:
- Start with the H2 heading: <h2>${section.heading}</h2>
- Position SalesRobot as the natural solution to the gaps/cons you just covered
- Don't bash ${research.productName} — just show what SalesRobot does differently
- Sound like a genuine recommendation from a knowledgeable friend
- Include exactly ONE free trial CTA, worded naturally:
  Something like: <p>If you want to give it a shot, <a href="https://www.salesrobot.co/signup">SalesRobot has a 14-day free trial</a> — takes about 2 minutes to set up, no card needed.</p>
- Each paragraph under 30 words
- Use "I" not "we"
- Don't oversell — one CTA max, keep it conversational
- Target: ${section.wordCountTarget} words

Return clean HTML only. No markdown.`;
}
