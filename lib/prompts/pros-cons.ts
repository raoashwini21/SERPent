import { SectionBrief, ResearchBrief, KeywordData } from '../types';

export function buildProsConsPrompt(
  section: SectionBrief,
  research: ResearchBrief,
_keywords: KeywordData
): string {
  const ratingsNote =
    research.g2Rating || research.capterraRating
      ? `Social proof: G2 rating ${research.g2Rating ?? 'N/A'}/5, Capterra ${research.capterraRating ?? 'N/A'}/5`
      : '';

  const paaNote =
    section.paaToAnswer && section.paaToAnswer.length > 0
      ? `Also answer this question inline: "${section.paaToAnswer[0]}"`
      : '';

  return `Write the pros and cons section for a blog about ${research.productName}.

H2 heading to use: "${section.heading}"
Target keywords: ${section.targetKeywords.join(', ')}
${paaNote}
${ratingsNote}

Pros to draw from: ${research.pros.join(' | ')}
Cons to draw from: ${research.cons.join(' | ')}

RULES:
- Start with the H2 heading: <h2>${section.heading}</h2>
- Alternate pros and cons: pro → con → pro → con (NOT all pros then all cons)
- Use <p> tags with <strong>Pro:</strong> and <strong>Con:</strong> labels inline
- Each point: 1 short paragraph under 30 words
- Include target keywords naturally — don't force them
- ${ratingsNote ? 'Mention ratings as social proof in the intro sentence' : 'Skip ratings — not available'}
- ${paaNote}
- Keep tone honest and balanced — don't oversell
- Target: ${section.wordCountTarget} words

Return clean HTML only. No markdown.`;
}
