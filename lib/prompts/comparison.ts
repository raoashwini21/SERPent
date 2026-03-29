import { SectionBrief, ResearchBrief, KeywordData } from '../types';

export function buildComparisonPrompt(
  section: SectionBrief,
  research: ResearchBrief,
  _keywords: KeywordData
): string {
  const paaNote =
    section.paaToAnswer && section.paaToAnswer.length > 0
      ? `Answer this PAA question inline: "${section.paaToAnswer[0]}"`
      : '';

  return `Write a comparison section: ${research.productName} vs SalesRobot

H2 heading to use: "${section.heading}"
Target keywords: ${section.targetKeywords.join(', ')}
${paaNote}

${research.productName} data:
- Pros: ${research.pros.slice(0, 3).join(', ')}
- Cons: ${research.cons.slice(0, 3).join(', ')}
- Key differentiators: ${research.keyDifferentiators.slice(0, 3).join(', ')}

FOR X vs Y COMPARISON BLOGS:
<h2>SalesRobot vs ${research.productName}: Which One Should You Pick?</h2>
<p>[1-2 sentences: honest framing — different tools for different needs. Not a slam.]</p>

Cover each of these dimensions as H3:
<h3>LinkedIn Safety: Who Wins?</h3>
<p>[Honest comparison. SalesRobot uses mobile API emulation — gold standard. Be specific about ${research.productName}'s approach.]</p>

<h3>Ease of Setup: Who Wins?</h3>
<p>[SalesRobot: 30 minutes. ${research.productName}: give honest estimate. Who is it easier for?]</p>

<h3>Pricing Transparency: Who Wins?</h3>
<p>[SalesRobot: $59-$99/month, no contracts. ${research.productName}: give honest picture.]</p>

<h3>Features / Depth: Who Wins?</h3>
<p>[What ${research.productName} does better. What SalesRobot does better. Be honest about both.]</p>

<h3>Best For: Who Should Use Which?</h3>
<p>[Specific team types and use cases for each tool.]</p>

FOR REVIEW BLOGS — use a shorter version:
<h2>How Does ${research.productName} Compare to Alternatives?</h2>
<p>[2-3 paragraph overview only — don't repeat what's in the main comparison section.]</p>

Close with:
<p>If you need [competitor strength], ${research.productName} is worth considering.</p>
<p>If LinkedIn is your main channel and you want clear pricing and quick setup, SalesRobot is the better fit.</p>
<p><a href="https://app.salesrobot.co/register">Start your 14-day free trial</a> — no credit card needed.</p>

RULES:
- Be honest — acknowledge where ${research.productName} wins too
- Don't make SalesRobot sound perfect — authenticity builds trust
- The visual comparison table is handled by an infographic — this is the text narrative
- Each <p> under 30 words
- ${paaNote}
- Target: ${section.wordCountTarget} words

Return clean HTML only. No markdown.`;
}
