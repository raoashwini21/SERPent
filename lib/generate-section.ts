import { SectionBrief, ContentBrief, ResearchBrief, KeywordData } from './types';
import { callClaude } from './claude';
import { MASTER_SYSTEM_PROMPT } from './prompts/system';
import { buildTLDRPrompt } from './prompts/tldr';
import { buildIntroPrompt } from './prompts/intro';
import { buildProsConsPrompt } from './prompts/pros-cons';
import { buildFeaturesPrompt } from './prompts/features';
import { buildPricingPrompt } from './prompts/pricing';
import { buildComparisonPrompt } from './prompts/comparison';
import { buildSalesRobotPrompt } from './prompts/salesrobot';
import { buildFAQPrompt } from './prompts/faq';
import { buildConclusionPrompt } from './prompts/conclusion';
import { buildRefinerPrompt } from './prompts/refiner';

function buildGenericSectionPrompt(
  section: SectionBrief,
  research: ResearchBrief,
  _keywords: KeywordData
): string {
  return `Write the "${section.heading}" section for a blog about ${research.productName}.

H${section.headingTag === 'h2' ? '2' : '3'} heading to use: "${section.heading}"
Target keywords: ${section.targetKeywords.join(', ')}
${section.paaToAnswer && section.paaToAnswer.length > 0 ? `PAA questions to answer: ${section.paaToAnswer.join(', ')}` : ''}

Instructions: ${section.instructions}

Product context:
- ${research.productName}: ${research.oneLiner}
- Key features: ${research.features.slice(0, 3).map((f) => f.name).join(', ')}
- Target audience: ${research.targetAudience}

RULES:
- Start with <${section.headingTag}>${section.heading}</${section.headingTag}>
- Each paragraph under 30 words
- Include target keywords naturally
- Use "I" not "we"
- Target: ${section.wordCountTarget} words

Return clean HTML only. No markdown.`;
}

function pickPrompt(
  section: SectionBrief,
  contentBrief: ContentBrief,
  research: ResearchBrief,
  keywords: KeywordData
): string {
  switch (section.id) {
    case 'tldr':
      return buildTLDRPrompt(contentBrief, research, keywords);
    case 'intro':
      return buildIntroPrompt(contentBrief, research, keywords);
    case 'pros_cons':
      return buildProsConsPrompt(section, research, keywords);
    case 'features':
      return buildFeaturesPrompt(section, research, keywords);
    case 'pricing':
      return buildPricingPrompt(section, research, keywords);
    case 'comparison':
      return buildComparisonPrompt(section, research, keywords);
    case 'salesrobot':
      return buildSalesRobotPrompt(section, research, keywords);
    case 'faq':
      return buildFAQPrompt(contentBrief, research, keywords);
    case 'conclusion':
      return buildConclusionPrompt(contentBrief, research, keywords);
    default:
      return buildGenericSectionPrompt(section, research, keywords);
  }
}

export async function generateSection(
  sectionBrief: SectionBrief,
  contentBrief: ContentBrief,
  research: ResearchBrief,
  keywords: KeywordData
): Promise<string> {
  const sectionPrompt = pickPrompt(sectionBrief, contentBrief, research, keywords);

  // Pass 1: Draft generation
  const draft = await callClaude(MASTER_SYSTEM_PROMPT, sectionPrompt, 2048);

  // Pass 2: Tone refinement
  const refined = await callClaude(MASTER_SYSTEM_PROMPT, buildRefinerPrompt(draft), 2048);

  return refined;
}
