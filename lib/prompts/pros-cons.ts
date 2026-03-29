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

Write in this EXACT structure:

<h2>What Are the Pros and Cons of ${research.productName}?</h2>

<p>[1-2 sentence general impression. ${ratingsNote ? `Mention the ratings (${ratingsNote}) as social proof.` : 'Keep it honest and grounded.'}]</p>

<p><strong>Benefits of using ${research.productName}:</strong></p>
<ul>
<li>You can [benefit 1 from the pros data]</li>
<li>You can [benefit 2 from the pros data]</li>
<li>It [benefit 3 from the pros data]</li>
[Add 1-2 more <li> items from the pros data — 4-5 total max]
</ul>

<p><strong>${research.productName} shortcomings:</strong></p>

For each con, write:
<p><strong>[Con name as a short phrase]</strong></p>
<p>[2-3 sentences explaining with specifics. Who does this affect? What's the practical impact?]</p>

(3-5 cons total)

Close with:
<p>All in all, ${research.productName} works well for [specific use case from the research].</p>
<p>That said, finding the perfect tool is hard.</p>
<p>That's why we've shortlisted the best alternatives to ${research.productName} for you.</p>

RULES:
- ALL pros grouped together first (not interleaved with cons)
- ALL cons grouped together after (not interleaved with pros)
- NO inline 'Pro:' and 'Con:' labels in paragraphs
- NO alternating pro/con/pro/con pattern
- Be honest and specific — use actual data from the pros/cons provided
- ${paaNote}
- Each <p> under 30 words
- Target: ${section.wordCountTarget} words

Return clean HTML only. No markdown.`;
}
