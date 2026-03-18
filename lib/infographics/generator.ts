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
- Background: full-width <rect> with fill="#1A1A2E" and rx="16"
- SalesRobot brand highlights use #6C5CE7 (purple)
- Ensure high contrast — no light text on light backgrounds`;

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
