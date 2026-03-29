import { SectionBrief, ResearchBrief, KeywordData } from '../types';

export function buildFeaturesPrompt(
  section: SectionBrief,
  research: ResearchBrief,
  _keywords: KeywordData
): string {
  const featuresText = research.features
    .slice(0, 6)
    .map((f, i) => `${i + 1}. ${f.name}: ${f.description}${f.rating ? ` (rated ${f.rating}/5)` : ''}`)
    .join('\n');

  const paaNote =
    section.paaToAnswer && section.paaToAnswer.length > 0
      ? `Answer this PAA question within the section: "${section.paaToAnswer[0]}"`
      : '';

  return `Write a features section for: ${research.productName}

H2 heading to use: "${section.heading}"
Target keywords: ${section.targetKeywords.join(', ')}
Blog type: ${section.instructions?.includes('review') || section.id?.includes('feature') ? 'review' : 'general'}
${paaNote}

Features to cover:
${featuresText}

FOR REVIEWS — use this structure:
<h2>${section.heading}</h2>
<p>[2-3 sentences: what the tool is at its core. Keep it concrete.]</p>
<p>So, what can you actually use it for?</p>

Each feature as H3 with number:
<h3>1. [Feature Name] [relevant emoji]</h3>
<p>[What it does — concrete and specific, not vague]</p>
<p>[Who benefits from it and how — practical example or outcome]</p>

FOR HOW-TO/GUIDE — use numbered steps with H3 headings instead:
<h3>Step 1: [Step Name]</h3>
<p>[What to do and why it matters]</p>

FOR LISTICLES — each tool/item as H3 with number:
<h3>[Number]. [Tool/Item Name]</h3>
<p>[What it is — 2-3 sentence overview]</p>
<p>[Best for: who should use it]</p>
<p><strong>Pros:</strong> [one line]</p>
<p><strong>Cons:</strong> [one line]</p>

RULES:
- Each <p> under 30 words
- Be specific — actual feature names and outcomes, not generic descriptions
- Honest assessment — mention real limitations if they exist
- ${paaNote}
- Target: ${section.wordCountTarget} words

Return clean HTML only. No markdown.`;
}
