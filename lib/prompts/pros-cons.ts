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

RULES — Write with this EXACT structure:

1. Open with 1-2 sentences of context (what kind of tool is this, who is it for)
${ratingsNote ? '   Mention ratings as social proof in the intro sentence' : '   Skip ratings — not available'}

2. TWO CLEAR COLUMNS in prose — do NOT alternate line by line:

   Write ALL pros together as a group first:
   <h3>What ${research.productName} Does Well</h3>
   — Use <ul><li> for each pro
   — Each pro: bold the key point, then 1 sentence explanation
   — 4-5 pros maximum
   — Include social proof where available (ratings, funding, notable customers)

   Then ALL cons together:
   <h3>Where ${research.productName} Falls Short</h3>
   — Use <ul><li> for each con
   — Each con: bold the key point, then 1 sentence explanation
   — 4-5 cons maximum
   — Be honest, not mean

3. Close with a 2-sentence verdict paragraph:
   'So who is ${research.productName} actually for? [answer]. If you need [alternative use case],
   [transition to SalesRobot naturally].'

${paaNote}

DO NOT alternate pro/con/pro/con in prose.
DO NOT write 'Pro:' and 'Con:' as inline labels in paragraphs.
Group all pros, then all cons. Clean and scannable.
- Target: ${section.wordCountTarget} words

Return clean HTML only. No markdown.`;
}
