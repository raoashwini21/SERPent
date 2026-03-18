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
- Dark navy (#1A1A2E) background rect with rounded corners (rx="16")
- viewBox="0 0 800 {auto-height}" — calculate height based on number of rows
- Two columns: left = {productName} (gray header #6B7280), right = SalesRobot (purple header #6C5CE7)
- Feature rows with alternating row backgrounds (#1E1E3A and #1A1A2E)
- For each feature cell: green check circle (#22C55E) for wins, red X circle (#EF4444) for losses, amber dash (#F59E0B) for partial/neutral
- White text (#FFFFFF) everywhere
- Bottom CTA row: full-width purple (#6C5CE7) background, white "Try SalesRobot Free →" text centered
- Header row: bold white text, feature names in first column in gray (#9CA3AF)

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
- Dark navy (#1A1A2E) background rect with rounded corners (rx="16")
- viewBox="0 0 800 {auto-height}"
- Two equal columns split by a vertical divider (#2D2D50)
- Left column: green (#22C55E) header bar with white "✓ Pros" text, each pro as a row with a small green check circle
- Right column: red (#EF4444) header bar with white "✗ Cons" text, each con as a row with a small red X circle
- White (#FFFFFF) item text, font-size 14, Inter
- Subtle row separators (#252547)

{svgRules}`,
    extractData: (section, research, keywords) => {
      return `Product: ${research.productName}\nKeyword: ${keywords.primaryKeyword}\nPros:\n${research.pros.slice(0, 5).map((p) => `- ${p}`).join('\n')}\nCons:\n${research.cons.slice(0, 4).map((c) => `- ${c}`).join('\n')}`;
    },
  },

  features: {
    prompt: `Generate an SVG feature breakdown grid for {productName}.

DATA:
{data}

DESIGN REQUIREMENTS:
- Dark navy (#1A1A2E) background rect with rounded corners (rx="16")
- viewBox="0 0 800 {auto-height}"
- Grid of feature cards (2 columns), each card:
  - Slightly lighter background (#252547), rounded corners (rx="8")
  - Feature name: white, bold, font-size 15
  - Description: gray (#9CA3AF), font-size 13, truncated if needed
  - Rating bar below description: track background (#2D2D50), fill (#6C5CE7), width proportional to rating/5
- Purple (#6C5CE7) small icon/dot before each feature name

{svgRules}`,
    extractData: (section, research, keywords) => {
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
- Dark navy (#1A1A2E) background rect with rounded corners (rx="16")
- viewBox="0 0 800 {auto-height}"
- Horizontal row of pricing cards (one per plan)
- Each card: dark background (#1E1E3A), rounded corners (rx="12")
- Plan name: white bold, font-size 16
- Price: large white text, font-size 28, bold; billing period in gray
- Feature list: small gray (#9CA3AF) text with white bullet dots
- SalesRobot / best-value plan: purple border (#6C5CE7), "Best Value" badge at top-right in purple
- Free trial note at the bottom: cyan (#00D2FF) text if applicable

{svgRules}`,
    extractData: (section, research, keywords) => {
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
- Dark navy (#1A1A2E) background rect with rounded corners (rx="16")
- viewBox="0 0 800 200"
- Horizontal flow: 4-5 connected step nodes
- Each node: rounded rect, purple (#6C5CE7) for main steps, cyan (#00D2FF) for key highlight step
- White text labels in each node, font-size 13, bold
- Connector lines between nodes: gray (#6B7280), 2px stroke, with arrowhead
- Step numbers (1, 2, 3…) in small circles above each node

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
- Dark navy (#1A1A2E) background rect with rounded corners (rx="16")
- viewBox="0 0 800 160"
- Horizontal row of 4 stat cards, evenly spaced
- Each card: no border, large number in white (font-size 36, bold), label below in cyan (#00D2FF), font-size 13
- Thin vertical dividers (#2D2D50) between cards
- Optional: subtle purple (#6C5CE7) glow or accent under each number

{svgRules}`,
    extractData: (_section, research, keywords) => {
      return `Product: ${research.productName}\nKeyword: ${keywords.primaryKeyword}\nStats:\n- 4,100+ Users\n- 55% Reply Rate\n- 45 Countries\n- 14-Day Free Trial`;
    },
  },
};
