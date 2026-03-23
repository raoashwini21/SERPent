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
    extractData: (_section, research, keywords) => {
      const features = (research.features || []).slice(0, 6).map((f) => f.name);
      const rows = features.map((f) => {
        const isSRWin = (research.keyDifferentiators || []).some((d) =>
          d.toLowerCase().includes(f.toLowerCase())
        );
        return `${f}: ${research.productName}=partial, SalesRobot=${isSRWin ? 'win' : 'neutral'}`;
      });
      return `Product: ${research.productName}\nKeyword: ${keywords.primaryKeyword}\nFeature rows:\n${rows.join('\n')}`;
    },
  },

  pros_cons: {
    prompt: `Generate a clean SVG pros and cons chart for {productName}.

DATA:
{data}

DESIGN REQUIREMENTS:
- viewBox="0 0 800 400"
- White (#FFFFFF) background rect, rx="16", stroke="#E5E7EB" stroke-width="1"
- Two equal columns (each 380px wide) split by a 1px vertical line at x=400, stroke="#E5E7EB"
- LEFT COLUMN — Pros:
  - Green header bar (#22C55E) from x=20 y=20 to x=390 h=44, rx="8", with white text "✓ Pros" font-size="16" bold centered
  - Each pro: white row with left green circle (cx=42 cy=Y r=8 fill="#22C55E"), then text at x=58 fill="#1F2937" font-size="13"
  - Row height 36px, starting y=80
- RIGHT COLUMN — Cons:
  - Red header bar (#EF4444) from x=410 y=20 to x=780 h=44, rx="8", with white text "✗ Cons" font-size="16" bold centered
  - Each con: white row with left red circle (cx=430 cy=Y r=8 fill="#EF4444"), then text at x=446 fill="#1F2937" font-size="13"
  - Row height 36px, starting y=80
- Truncate all text to max 35 characters — add "..." if longer
- Each text element uses clip-path to stay in its column

{svgRules}`,
    extractData: (_section, research, keywords) => {
      const pros = (research.pros || []).slice(0, 5).map((p) => `- ${String(p).slice(0, 50)}`);
      const cons = (research.cons || []).slice(0, 4).map((c) => `- ${String(c).slice(0, 50)}`);
      return `Product: ${research.productName}\nKeyword: ${keywords.primaryKeyword}\nPros:\n${pros.join('\n') || '- No pros listed'}\nCons:\n${cons.join('\n') || '- No cons listed'}`;
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
      const items = (research.features || []).slice(0, 6).map(
        (f) => `${f.name} (rating: ${f.rating ?? 4}/5): ${String(f.description || '').slice(0, 60)}`
      );
      return `Product: ${research.productName}\nKeyword: ${keywords.primaryKeyword}\nFeatures:\n${items.join('\n')}`;
    },
  },

  pricing: {
    prompt: `Generate a clean SVG pricing comparison card layout for {productName}.

DATA:
{data}

DESIGN REQUIREMENTS:
- viewBox="0 0 800 320"
- White (#FFFFFF) background rect, rx="16", stroke="#E5E7EB" stroke-width="1"
- Render each plan as a vertical card with equal width (divide 760px by number of plans, start at x=20)
- Each card: fill="#F3F4F6" rx="12" stroke="#E5E7EB" stroke-width="1"
- Each card has a <clipPath> matching its rect so text never overflows
- Inside each card (top to bottom):
  - Plan name: fill="#111827" font-size="15" font-weight="bold" text-anchor="middle"
  - Price: fill="#111827" font-size="26" font-weight="bold" text-anchor="middle"
  - Up to 3 features: fill="#6B7280" font-size="12" text-anchor="middle", each truncated to 28 chars max
- The LAST card (or the "Pro" / "Growth" card if present): use stroke="#6C5CE7" stroke-width="2" and add a small "Best Value" badge (purple rect + white text) at top-right corner
- Free trial note at bottom center: fill="#6C5CE7" font-size="12" text-anchor="middle"

{svgRules}`,
    extractData: (_section, research, keywords) => {
      const pricing = research.pricing || { plans: [], freeTrial: false };
      const plans = (pricing.plans || [])
        .slice(0, 3)
        .map((p) => {
          const feats = (p.features || []).slice(0, 3).map((f) => String(f).slice(0, 28)).join(', ');
          return `${p.name}: ${p.price} — ${feats || 'See website for details'}`;
        });
      if (plans.length === 0) {
        plans.push('Starter: Contact for pricing');
        plans.push('Pro: Contact for pricing');
      }
      return `Product: ${research.productName}\nKeyword: ${keywords.primaryKeyword}\nFree trial: ${pricing.freeTrial}\nPlans:\n${plans.join('\n')}`;
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
      const steps = (section.instructions || '')
        .split(/[.\n]/)
        .filter((s) => s.trim().length > 10)
        .slice(0, 5)
        .map((s, i) => `Step ${i + 1}: ${s.trim().slice(0, 40)}`);
      if (steps.length === 0) {
        steps.push('Step 1: Connect', 'Step 2: Configure', 'Step 3: Launch', 'Step 4: Scale');
      }
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
