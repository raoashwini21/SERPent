import { callClaude } from '../claude';
import { SectionBrief, ResearchBrief, KeywordData } from '../types';
import { INFOGRAPHIC_TEMPLATES } from './templates';

const SVG_SYSTEM_PROMPT = `You are an SVG graphic designer. You generate clean, well-structured SVG code for blog infographics. Return ONLY valid SVG markup — no markdown, no code fences, no explanation. The SVG must render correctly in all modern browsers.`;

const SVG_RULES = `OUTPUT RULES:
- Return ONLY the SVG code, nothing else. No markdown, no code fences, no explanation.
- Start with <svg and end with </svg>
- Set appropriate viewBox height based on content (don't clip content)
- All text as <text> elements, NEVER as <path> elements for text
- Include <title> and <desc> as the first two children of <svg>
- Use font-family="Inter, system-ui, sans-serif" on all text
- Background: full-width <rect> with fill="#FFFFFF" and rx="16" and stroke="#E5E7EB" stroke-width="1"
- Card backgrounds: use fill="#F3F4F6" for all inner cards/rows, with stroke="#E5E7EB" stroke-width="1"
- Body text on white/light backgrounds: use fill="#1F2937" (dark gray) for all descriptive text
- Heading text on white backgrounds: use fill="#111827" (near black)
- SalesRobot brand highlights use #6C5CE7 (purple)
- Pros/wins use #22C55E (green), cons/losses use #EF4444 (red), neutral use #F59E0B (amber)
- Keep purple (#6C5CE7) rating bars, accent lines, and icon dots
- Ensure high contrast — no light text on light backgrounds, no dark text on dark backgrounds
- All description text must be max 60 characters per line. Truncate with ... if longer.
- Every card group must have a clipPath defined and applied (clip-path="url(#...)") so text never overflows outside the card rectangle.
- Description text font-size: 12px. Title/heading text font-size: 14-16px.
- Use text-anchor="start" and explicit x positioning to keep text inside card boundaries.
- For long text elements add textLength attribute and lengthAdjust="spacingAndGlyphs" to prevent overflow.`;

export async function generateInfographic(
  type: string,
  section: SectionBrief,
  research: ResearchBrief,
  keywords: KeywordData
): Promise<string | null> {
  if (type === 'none') return null;

  const template = INFOGRAPHIC_TEMPLATES[type];
  if (!template) return null;

  try {
    const data = template.extractData(section, research, keywords);
    const productName = research.productName;

    const fullPrompt = template.prompt
      .replace(/\{productName\}/g, productName)
      .replace(/\{data\}/g, data)
      .replace(/\{svgRules\}/g, SVG_RULES);

    const raw = await callClaude(SVG_SYSTEM_PROMPT, fullPrompt, 4096);

    // Strip any accidental markdown fences
    const cleaned = raw
      .replace(/^```(?:svg|xml|html)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    // Basic validation: must start with <svg
    if (!cleaned.startsWith('<svg')) {
      return null;
    }

    return cleaned;
  } catch {
    return null;
  }
}
