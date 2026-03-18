const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'how', 'what', 'why',
  'best', 'top', 'vs', 'review', 'guide', 'using', 'use',
]);

export function generateSlug(primaryKeyword: string): string {
  // Lowercase, remove special chars, split to words
  const words = primaryKeyword
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b\d{4}\b/g, '') // remove 4-digit years
    .split(/\s+/)
    .filter((w) => w.length > 0);

  // Remove stop words but always keep at least 2 meaningful words
  const meaningful = words.filter((w) => !STOP_WORDS.has(w));
  const filtered = meaningful.length >= 2 ? meaningful : words.filter((w) => w.length > 0);

  // Max 3 words
  const slugWords = filtered.slice(0, 3);

  // Deduplicate consecutive identical words
  const deduped: string[] = [];
  for (const word of slugWords) {
    if (deduped[deduped.length - 1] !== word) {
      deduped.push(word);
    }
  }

  return deduped.join('-');
}
