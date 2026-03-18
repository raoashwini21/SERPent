import { SectionBrief, ResearchBrief, KeywordData } from '../types';

export function buildFeaturesPrompt(
  section: SectionBrief,
  research: ResearchBrief,
  keywords: KeywordData
): string {
  const featuresText = research.features
    .slice(0, 6)
    .map((f) => `- ${f.name}: ${f.description}${f.rating ? ` (rated ${f.rating}/5)` : ''}`)
    .join('\n');

  const paaNote =
    section.paaToAnswer && section.paaToAnswer.length > 0
      ? `Answer this PAA question within the section: "${section.paaToAnswer[0]}"`
      : '';

  return `Write the key features section for a blog about ${research.productName}.

H2 heading to use: "${section.heading}"
Target keywords: ${section.targetKeywords.join(', ')}
${paaNote}

Features to cover:
${featuresText}

RULES:
- Start with the H2 heading: <h2>${section.heading}</h2>
- Each feature gets its own H3 sub-heading (keyword-optimized where natural)
- Under each H3: what it does, who benefits from it, honest assessment
- H3 format: <h3>Feature Name</h3> followed by <p> content
- Each paragraph under 30 words
- Include target keywords in at least 2 H3 headings
- Tone: honest, helpful — mention limitations if real
- ${paaNote}
- Target: ${section.wordCountTarget} words

Return clean HTML only. No markdown.`;
}
