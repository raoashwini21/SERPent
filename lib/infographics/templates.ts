import { SectionBrief, ResearchBrief, KeywordData } from '../types';

export interface InfographicTemplate {
  prompt: string;
  extractData: (section: SectionBrief, research: ResearchBrief, keywords: KeywordData) => string;
}

export const INFOGRAPHIC_TEMPLATES: Record<string, InfographicTemplate> = {
  comparison: {
    prompt: `Generate an SVG comparison table showing {productName} vs SalesRobot.

DATA:
{data}

DESIGN REQUIREMENTS:
- White (#FFFFFF) background rect with rounded corners (rx="16") and border stroke="#E5E7EB" stroke-width="1"
- viewBox="0 0 800 {auto-height}" — calculate height based on number of rows
- Two columns: left = {productName} (gray header #6B7280), right = SalesRobot (purple header #6C5CE7)
- Feature rows with alternating row backgrounds (#F9FAFB and #F3F4F6), each row has stroke="#E5E7EB" stroke-width="1"
- Each row group must have a clipPath so text never bleeds outside the row rectangle
- For each feature cell: green check circle (#22C55E) for wins, red X circle (#EF4444) for losses, amber dash (#F59E0B) for partial/neutral
- Row text (#1F2937 dark gray), font-size 13px, text-anchor="start", truncated to max 60 chars with ...
- Feature names in first column: #374151, font-size 13px, bold
- Column headers: bold, {productName} header in #6B7280, SalesRobot header in #6C5CE7
- Bottom CTA row: full-width purple (#6C5CE7) background, white "Try SalesRobot Free →" text centered, font-size 14
- Use clipPath on every row group to prevent text overflow

{svgRules}`,
    extractData: (section, research, keywords) => {
      const features = research.features.slice(0, 6).map((f) => f.name);
      const rows = features.map((f) => {
        const isSRWin = research.keyDifferentiators.some((d) =>
          d.toLowerCase().includes(f.toLowerCase())
        );
        return `${f}: ${research.productName}=partial, SalesRobot=${isSRWin ? 'win' : 'neutral'}`;
      });
      return `Product: ${research.productName}\nKeyword: ${keywords.primaryKeyword}\nFeature rows:\n${rows.join('\n')}`;
    },
  },

  pros_cons: {
    prompt: `Generate an SVG pros and cons chart for {productName}.

DATA:
{data}

DESIGN REQUIREMENTS:
- White (#FFFFFF) background rect with rounded corners (rx="16") and border stroke="#E5E7EB" stroke-width="1"
- viewBox="0 0 800 {auto-height}"
- Two equal columns split by a vertical divider (#E5E7EB)
- Left column: green (#22C55E) header bar with white "✓ Pros" text
  - Each pro row: light green-tinted background (#F0FDF4), small green check circle, text in #1F2937
  - Each row has a clipPath — text max 60 chars, font-size 12px
- Right column: red (#EF4444) header bar with white "✗ Cons" text
  - Each con row: light red-tinted background (#FEF2F2), small red X circle, text in #1F2937
  - Each row has a clipPath — text max 60 chars, font-size 12px
- Subtle row separators stroke="#E5E7EB"
- Use text-anchor="start" and explicit x positioning for all item text

{svgRules}`,
    extractData: (_section, research, keywords) => {
      return `Product: ${research.productName}\nKeyword: ${keywords.primaryKeyword}\nPros:\n${research.pros.slice(0, 5).map((p) => `- ${p}`).join('\n')}\nCons:\n${research.cons.slice(0, 4).map((c) => `- ${c}`).join('\n')}`;
    },
  },

  features: {
    prompt: `Generate an SVG feature breakdown grid for {productName}.

DATA:
{data}

DESIGN REQUIREMENTS:
- White (#FFFFFF) background rect with rounded corners (rx="16") and border stroke="#E5E7EB" stroke-width="1"
- viewBox="0 0 800 {auto-height}"
- Grid of feature cards (2 columns), each card:
  - Light gray background (#F3F4F6), rounded corners (rx="8"), border stroke="#E5E7EB" stroke-width="1"
  - Each card MUST have a <clipPath> applied (clip-path="url(#clip-card-N)") matching the card rect exactly
  - Feature name: #111827 near-black, bold, font-size 14px
  - Purple dot (#6C5CE7) before each feature name
  - Description: #6B7280 gray, font-size 12px, max 60 chars per line, truncated with ..., text-anchor="start"
  - Rating bar below description: track background (#E5E7EB), fill (#6C5CE7), width proportional to rating/5
- All text stays within clipPath bounds — never outside the card rectangle

{svgRules}`,
    extractData: (_section, research, keywords) => {
      const items = research.features.slice(0, 6).map(
        (f) => `${f.name} (rating: ${f.rating ?? 4}/5): ${f.description.slice(0, 60)}`
      );
      return `Product: ${research.productName}\nKeyword: ${keywords.primaryKeyword}\nFeatures:\n${items.join('\n')}`;
    },
  },

  pricing: {
    prompt: `Generate an SVG pricing comparison card layout for {productName}.

DATA:
{data}

DESIGN REQUIREMENTS:
- White (#FFFFFF) background rect with rounded corners (rx="16") and border stroke="#E5E7EB" stroke-width="1"
- viewBox="0 0 800 {auto-height}"
- Horizontal row of pricing cards (one per plan)
- Each card: light gray background (#F3F4F6), rounded corners (rx="12"), border stroke="#E5E7EB" stroke-width="1"
- Each card MUST have a <clipPath> (clip-path="url(#clip-plan-N)") matching its rect exactly
- Plan name: #111827 bold, font-size 15px
- Price: large #111827 text, font-size 28px, bold; billing period in #6B7280 gray, font-size 12px
- Feature list: #6B7280 gray, font-size 12px, with #6C5CE7 purple bullet dots; max 60 chars per line
- SalesRobot / best-value plan: purple border (#6C5CE7) stroke-width="2", "Best Value" badge in purple
- Free trial note: #6C5CE7 purple text, font-size 12px
- Text stays within each card's clipPath — no overflow

{svgRules}`,
    extractData: (_section, research, keywords) => {
      const plans = research.pricing.plans
        .slice(0, 3)
        .map((p) => `${p.name}: ${p.price} — ${p.features.slice(0, 3).join(', ')}`);
      return `Product: ${research.productName}\nKeyword: ${keywords.primaryKeyword}\nFree trial: ${research.pricing.freeTrial}\nPlans:\n${plans.join('\n')}`;
    },
  },

  workflow: {
    prompt: `Generate an SVG horizontal workflow/process diagram.

DATA:
{data}

DESIGN REQUIREMENTS:
- White (#FFFFFF) background rect with rounded corners (rx="16") and border stroke="#E5E7EB" stroke-width="1"
- viewBox="0 0 800 200"
- Horizontal flow: 4-5 connected step nodes
- Each node: rounded rect with light gray (#F3F4F6) fill and stroke="#E5E7EB" stroke-width="1"
- Main step nodes: purple (#6C5CE7) fill with white text; key highlight step: #00D2FF cyan fill with white text
- Step label text: white, font-size 12px, bold, text-anchor="middle", max 20 chars per line
- Each node has a clipPath so label text never overflows the node rectangle
- Connector lines between nodes: #9CA3AF gray, 2px stroke, with arrowhead marker
- Step numbers (1, 2, 3…): small #6C5CE7 purple circles above each node with white text, font-size 11px

{svgRules}`,
    extractData: (section, research, keywords) => {
      const steps = section.instructions
        .split(/[.\n]/)
        .filter((s) => s.trim().length > 10)
        .slice(0, 5)
        .map((s, i) => `Step ${i + 1}: ${s.trim().slice(0, 40)}`);
      return `Product: ${research.productName}\nKeyword: ${keywords.primaryKeyword}\nSteps:\n${steps.join('\n')}`;
    },
  },

  stats: {
    prompt: `Generate an SVG stats/metrics banner.

DATA:
{data}

DESIGN REQUIREMENTS:
- White (#FFFFFF) background rect with rounded corners (rx="16") and border stroke="#E5E7EB" stroke-width="1"
- viewBox="0 0 800 160"
- Horizontal row of 4 stat cards, evenly spaced, no outer card borders — just the main border
- Each stat: large number in #111827 near-black (font-size 36px, bold), label below in #6C5CE7 purple (font-size 13px)
- Thin vertical dividers stroke="#E5E7EB" between each stat
- Subtle purple (#6C5CE7) underline accent (2px rect) below each large number
- All text centered within its stat column using text-anchor="middle"
- Each stat column has a clipPath to prevent any text overflow

{svgRules}`,
    extractData: (_section, research, keywords) => {
      return `Product: ${research.productName}\nKeyword: ${keywords.primaryKeyword}\nStats:\n- 4,100+ Users\n- 55% Reply Rate\n- 45 Countries\n- 14-Day Free Trial`;
    },
  },
};
