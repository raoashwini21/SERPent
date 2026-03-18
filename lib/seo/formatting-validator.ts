import { SEOCheck } from '../types';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function extractParagraphs(html: string): string[] {
  const matches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? [];
  return matches.map((p) => stripHtml(p)).filter((p) => p.length > 0);
}

function extractH2s(html: string): string[] {
  const matches = html.match(/<h2[^>]*>[\s\S]*?<\/h2>/gi) ?? [];
  return matches.map((h) => stripHtml(h));
}

function avgSyllables(word: string): number {
  // Simple syllable estimator
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length <= 3) return 1;
  const vowelMatches = cleaned.match(/[aeiouy]+/g);
  return Math.max(1, vowelMatches ? vowelMatches.length : 1);
}

function fleschKincaidGrade(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (sentences.length === 0 || words.length === 0) return 0;

  const totalSyllables = words.reduce((acc, word) => acc + avgSyllables(word), 0);
  const asl = words.length / sentences.length; // avg sentence length
  const asw = totalSyllables / words.length; // avg syllables per word

  return 0.39 * asl + 11.8 * asw - 15.59;
}

export function validateFormatting(html: string): SEOCheck[] {
  const checks: SEOCheck[] = [];

  // 1. Paragraph length
  const paragraphs = extractParagraphs(html);
  const longParas = paragraphs.filter((p) => countWords(p) > 30);
  checks.push({
    category: 'Formatting',
    name: 'Paragraph Length',
    status: longParas.length === 0 ? 'pass' : longParas.length <= 3 ? 'warn' : 'fail',
    detail:
      longParas.length === 0
        ? 'All paragraphs are under 30 words'
        : `${longParas.length} paragraph(s) exceed 30 words`,
  });

  // 2. Bold usage
  const hasBold = /<strong[^>]*>/i.test(html);
  checks.push({
    category: 'Formatting',
    name: 'Bold Usage',
    status: hasBold ? 'pass' : 'fail',
    detail: hasBold ? '<strong> tags found for emphasis' : 'No <strong> tags found — add bold for key points',
  });

  // 3. Italics usage
  const hasItalics = /<em[^>]*>/i.test(html);
  checks.push({
    category: 'Formatting',
    name: 'Italics Usage',
    status: hasItalics ? 'pass' : 'warn',
    detail: hasItalics ? '<em> tags found' : 'No <em> tags found — consider adding for emphasis',
  });

  // 4. Heading density (H2 roughly every 300 words)
  const totalWords = countWords(stripHtml(html));
  const h2Count = extractH2s(html).length;
  const expectedH2s = Math.floor(totalWords / 300);
  const densityOk = h2Count >= Math.max(1, expectedH2s - 1) && h2Count <= expectedH2s + 3;
  checks.push({
    category: 'Formatting',
    name: 'Heading Density',
    status: densityOk ? 'pass' : 'warn',
    detail: densityOk
      ? `${h2Count} H2s for ~${totalWords} words — good density`
      : `${h2Count} H2s for ~${totalWords} words — aim for 1 H2 per 300 words`,
  });

  // 5. Readability estimate
  const plainText = stripHtml(html);
  const grade = fleschKincaidGrade(plainText);
  const readabilityOk = grade <= 8;
  checks.push({
    category: 'Formatting',
    name: 'Readability',
    status: readabilityOk ? 'pass' : grade <= 10 ? 'warn' : 'fail',
    detail: readabilityOk
      ? `Flesch-Kincaid grade ~${grade.toFixed(1)} — good readability`
      : `Flesch-Kincaid grade ~${grade.toFixed(1)} — aim for Grade 8 or below`,
  });

  return checks;
}
