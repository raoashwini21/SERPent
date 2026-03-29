import { SectionBrief, ResearchBrief, KeywordData } from '../types';

export function buildSalesRobotPrompt(
  section: SectionBrief,
  research: ResearchBrief,
  keywords: KeywordData
): string {
  const productGaps = research.cons.slice(0, 3).join(', ');
  const primaryKw = keywords.primaryKeyword;

  return `Write the 'Why SalesRobot Outperforms ${research.productName}' section.

H2 heading to use: "${section.heading}"
Target keywords: ${section.targetKeywords.join(', ')}
Primary keyword context: ${primaryKw}

Gaps/cons in ${research.productName} to address: ${productGaps}

SALESROBOT FEATURES:
- LinkedIn + Email outreach in one platform
- Mobile API emulation (safest LinkedIn automation in 2026)
- AI message personalization per prospect
- Multi-account management (agencies run 50+ accounts)
- Whitelabel program (resell under own brand)
- Smart inbox with reply detection
- CRM integrations: HubSpot, Salesforce, Pipedrive, Zoho
- Campaign analytics and A/B testing
- 4,100+ active users across 45 countries

SALESROBOT PRICING:
- Starter: $99/month (1 LinkedIn account, unlimited campaigns)
- Professional: $149/month (3 LinkedIn accounts)
- Agency: $299/month (10 accounts, whitelabel)
- All plans: 14-day free trial, no credit card needed
- Monthly billing only — no annual contract

COMPARISON POINTS:
- Setup: SalesRobot 30 minutes vs competitor weeks
- Pricing: transparent monthly vs secret enterprise
- LinkedIn safety: mobile API gold standard
- Support: live chat + dedicated onboarding

RULES:
- Start with the H2 heading: <h2>${section.heading}</h2>
- TONE: First-person. 'I switched because...' Use specific numbers.
- CTA at end: 14-day free trial, no credit card needed.
  Something like: <p>If you want to give it a shot, <a href="https://www.salesrobot.co/signup">SalesRobot has a 14-day free trial</a> — takes about 2 minutes to set up, no card needed.</p>
- Each paragraph under 30 words
- Use "I" not "we"
- Don't oversell — one CTA max, keep it conversational
- Target: 300-400 words

Return clean HTML only. No markdown.`;
}
