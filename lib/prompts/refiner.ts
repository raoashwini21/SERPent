export function buildRefinerPrompt(sectionHtml: string): string {
  return `Rewrite this blog section to be MORE informal and conversational.

${sectionHtml}

RULES:
- Make it sound like talking to a friend over coffee
- Simpler words, shorter sentences
- "I" not "we"
- Do not address reader as "folks", "guys", or "dear"
- Every paragraph under 30 words — this is strict, count them
- Remove any remaining marketing jargon or corporate speak
- No phrases like: "leverage", "utilize", "delve into", "robust", "seamless", "game-changer", "cutting-edge", "best-in-class", "unlock", "empower"
- Keep ALL HTML tags and structure exactly intact
- Keep ALL keywords intact — do not remove or change them
- Keep the same heading text
- Do not add new sections or headings
- Return clean HTML only, no markdown, no code fences`;
}
