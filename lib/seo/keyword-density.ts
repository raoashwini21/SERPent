import { KeywordData, SEOCheck } from '../types';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are', 'were',
  'been', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'that', 'this', 'these', 'those',
  'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'our', 'their',
  'if', 'so', 'not', 'no', 'up', 'out', 'about', 'into', 'than', 'then',
  'its', 'also', 'just', 'more', 'some', 'such', 'how', 'what', 'which',
  'who', 'when', 'where', 'why', 'all', 'any', 'each', 'both', 'few',
]);

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokenize(text: string): string[] {
  return text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

export function extractBigrams(text: string): { phrase: string; count: number }[] {
  const plain = stripHtml(text);
  const words = tokenize(plain);
  const counts: Record<string, number> = {};

  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    counts[bigram] = (counts[bigram] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count);
}

export function extractTrigrams(text: string): { phrase: string; count: number }[] {
  const plain = stripHtml(text);
  const words = tokenize(plain);
  const counts: Record<string, number> = {};

  for (let i = 0; i < words.length - 2; i++) {
    const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    counts[trigram] = (counts[trigram] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count);
}

export function checkBigramAlignment(
  bigrams: { phrase: string; count: number }[],
  keywords: KeywordData
): SEOCheck {
  const topBigrams = bigrams.slice(0, 3).map((b) => b.phrase);
  const targetPhrases = [
    keywords.primaryKeyword.toLowerCase(),
    ...keywords.secondaryKeywords.map((k) => k.keyword.toLowerCase()),
  ];

  const hits = topBigrams.filter((bigram) =>
    targetPhrases.some((kw) => kw.includes(bigram) || bigram.includes(kw.split(' ').slice(0, 2).join(' ')))
  );

  const status = hits.length >= 2 ? 'pass' : hits.length === 1 ? 'warn' : 'fail';
  return {
    category: 'Keyword Density',
    name: 'Top Bigram Alignment',
    status,
    detail:
      status === 'pass'
        ? `Top bigrams align with target keywords: ${topBigrams.join(', ')}`
        : `Top bigrams (${topBigrams.join(', ')}) don't strongly align with target keywords`,
  };
}

export function checkTrigramAlignment(
  trigrams: { phrase: string; count: number }[],
  keywords: KeywordData
): SEOCheck {
  const topTrigrams = trigrams.slice(0, 3).map((t) => t.phrase);
  const targetPhrases = [
    keywords.primaryKeyword.toLowerCase(),
    ...keywords.secondaryKeywords.map((k) => k.keyword.toLowerCase()),
    ...keywords.longTailKeywords.map((k) => k.toLowerCase()),
  ];

  const hits = topTrigrams.filter((trigram) =>
    targetPhrases.some((kw) => kw.includes(trigram) || trigram.split(' ').every((w) => kw.includes(w)))
  );

  const status = hits.length >= 2 ? 'pass' : hits.length === 1 ? 'warn' : 'fail';
  return {
    category: 'Keyword Density',
    name: 'Top Trigram Alignment',
    status,
    detail:
      status === 'pass'
        ? `Top trigrams align with target keywords: ${topTrigrams.join(', ')}`
        : `Top trigrams (${topTrigrams.join(', ')}) don't strongly match long-tail target keywords`,
  };
}
