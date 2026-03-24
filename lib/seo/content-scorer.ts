import { KeywordData, SEOCheck, SEOScore } from '../types';
import { extractBigrams, extractTrigrams, checkBigramAlignment, checkTrigramAlignment } from './keyword-density';
import { validateFormatting } from './formatting-validator';

// ─── Default score returned when the scorer itself fails ─────────────────────


// ─── Safe check wrapper ───────────────────────────────────────────────────────

function safeCheck(name: string, category: string, checkFn: () => SEOCheck): SEOCheck {
  try {
    return checkFn();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[scorer] check "${name}" threw:`, msg);
    return { name, category, status: 'fail' as const, detail: 'Check errored: ' + msg };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function normalizeKw(kw: string): string {
  return kw.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function containsKeyword(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(normalizeKw(keyword));
}

// ─── Keyword Placement Checks ────────────────────────────────────────────────

function checkKeywordInTitle(title: string, primaryKeyword: string): SEOCheck {
  const pass = containsKeyword(title, primaryKeyword);
  return {
    category: 'Keyword Placement',
    name: 'Keyword in Title Tag',
    status: pass ? 'pass' : 'fail',
    detail: pass
      ? `Primary keyword "${primaryKeyword}" found in title`
      : `Primary keyword "${primaryKeyword}" missing from title tag`,
  };
}

function checkKeywordInFirst150Words(html: string, primaryKeyword: string): SEOCheck {
  const plain = stripHtml(html);
  const first150 = plain.split(/\s+/).slice(0, 150).join(' ');
  const pass = containsKeyword(first150, primaryKeyword);
  return {
    category: 'Keyword Placement',
    name: 'Keyword in First 150 Words',
    status: pass ? 'pass' : 'fail',
    detail: pass
      ? `Primary keyword found in opening 150 words`
      : `Add primary keyword "${primaryKeyword}" within the first 150 words`,
  };
}

function checkKeywordInH1(html: string, primaryKeyword: string): SEOCheck {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Text = h1Match ? stripHtml(h1Match[0]) : '';
  const pass = h1Text.length > 0 && containsKeyword(h1Text, primaryKeyword);
  return {
    category: 'Keyword Placement',
    name: 'Keyword in H1',
    status: pass ? 'pass' : 'fail',
    detail: pass
      ? `Primary keyword found in H1`
      : h1Text.length === 0
      ? 'No H1 tag found in content'
      : `H1 exists but missing primary keyword "${primaryKeyword}"`,
  };
}

function checkMetaDescriptionLength(description: string): SEOCheck {
  const len = (description || '').length;
  const underLimit = len <= 150;
  return {
    category: 'Keyword Placement',
    name: 'Meta Description Length',
    status: underLimit ? 'pass' : 'warn',
    detail: underLimit
      ? `Meta description is ${len} chars (under 150)`
      : `Meta description is ${len} chars — trim to under 150`,
  };
}

function checkUrlSlug(slug: string, primaryKeyword: string): SEOCheck {
  const kwWords = normalizeKw(primaryKeyword).split(/\s+/).slice(0, 2);
  const pass = kwWords.some((w) => (slug || '').includes(w));
  return {
    category: 'Keyword Placement',
    name: 'Keyword in URL Slug',
    status: pass ? 'pass' : 'warn',
    detail: pass
      ? `Slug "${slug}" contains keyword terms`
      : `Slug "${slug}" should contain keyword terms from "${primaryKeyword}"`,
  };
}

function checkKeywordDensity(html: string, primaryKeyword: string): SEOCheck {
  // Strip HTML tags first, then count using indexOf to avoid any regex crash risk
  const text = html.replace(/<[^>]*>/g, ' ').toLowerCase();
  const totalWords = countWords(text);
  if (totalWords === 0) {
    return { category: 'Keyword Placement', name: 'Keyword Density', status: 'fail', detail: 'No content found' };
  }
  const keyword = (primaryKeyword || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (!keyword) {
    return { category: 'Keyword Placement', name: 'Keyword Density', status: 'warn', detail: 'No keyword to measure' };
  }
  // Simple indexOf loop — no RegExp, no crash risk
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(keyword, pos)) !== -1) {
    count++;
    pos += keyword.length;
  }
  const density = (count / totalWords) * 100;
  const status = density >= 1 && density <= 2.5 ? 'pass' : density >= 0.5 ? 'warn' : 'fail';
  return {
    category: 'Keyword Placement',
    name: 'Keyword Density',
    status,
    detail: `Keyword density: ${density.toFixed(2)}% (${count} occurrences / ${totalWords} words) — target 1-2%`,
  };
}

function checkSecondaryKeywords(
  html: string,
  secondaryKeywords: KeywordData['secondaryKeywords']
): SEOCheck {
  const text = html.replace(/<[^>]*>/g, ' ').toLowerCase();
  const safeKws = (secondaryKeywords || []).slice(0, 5);
  if (safeKws.length === 0) {
    return { category: 'Keyword Placement', name: 'Secondary Keywords Present', status: 'warn', detail: 'No secondary keywords defined' };
  }
  const found = safeKws.filter((k) => {
    const kw = ((k && k.keyword) || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    return kw.length > 0 && text.includes(kw);
  });
  const pass = found.length >= 4;
  return {
    category: 'Keyword Placement',
    name: 'Secondary Keywords Present',
    status: pass ? 'pass' : found.length >= 2 ? 'warn' : 'fail',
    detail: `${found.length}/${safeKws.length} secondary keywords found in content`,
  };
}

// ─── Content Structure Checks ────────────────────────────────────────────────

function checkWordCount(html: string, targetWordCount: number): SEOCheck {
  const count = countWords(stripHtml(html));
  const pass = count >= targetWordCount;
  return {
    category: 'Content Structure',
    name: 'Word Count',
    status: pass ? 'pass' : count >= targetWordCount * 0.85 ? 'warn' : 'fail',
    detail: `${count} words — target is ${targetWordCount}`,
  };
}

function checkParagraphLength(html: string): SEOCheck {
  const paras = (html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? []).map((p) => stripHtml(p));
  const longOnes = paras.filter((p) => countWords(p) > 30);
  return {
    category: 'Content Structure',
    name: 'Paragraph Length',
    status: longOnes.length === 0 ? 'pass' : longOnes.length <= 3 ? 'warn' : 'fail',
    detail:
      longOnes.length === 0
        ? 'All paragraphs under 30 words'
        : `${longOnes.length} paragraphs exceed 30 words — keep each <p> to one short thought`,
  };
}

function checkHasFAQSection(html: string): SEOCheck {
  const hasFAQ =
    /faq|frequently asked/i.test(html) &&
    /<h[23][^>]*>[\s\S]*?<\/h[23]>/i.test(html);
  return {
    category: 'Content Structure',
    name: 'FAQ Section Present',
    status: hasFAQ ? 'pass' : 'fail',
    detail: hasFAQ ? 'FAQ section with H2/H3 questions found' : 'No FAQ section detected — add a FAQ with PAA questions',
  };
}

function checkHasComparisonTable(html: string): SEOCheck {
  const hasTable = /<table/i.test(html);
  return {
    category: 'Content Structure',
    name: 'Comparison Table Present',
    status: hasTable ? 'pass' : 'warn',
    detail: hasTable ? 'Comparison table found' : 'No table found — consider adding a comparison table for BOFU content',
  };
}

function checkHeadingDensity(html: string): SEOCheck {
  const totalWords = countWords(stripHtml(html));
  const h2Count = (html.match(/<h2[^>]*>/gi) ?? []).length;
  const expected = Math.max(1, Math.floor(totalWords / 300));
  const ok = h2Count >= expected - 1 && h2Count <= expected + 3;
  return {
    category: 'Content Structure',
    name: 'Heading Density',
    status: ok ? 'pass' : 'warn',
    detail: ok
      ? `${h2Count} H2s across ~${totalWords} words — good`
      : `${h2Count} H2s for ~${totalWords} words — aim for 1 H2 per ~300 words`,
  };
}

function checkReadability(html: string): SEOCheck {
  // Simple avg-words-per-sentence heuristic — no external library needed
  const text = html.replace(/<[^>]*>/g, ' ');
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  const wordCount = countWords(text);
  if (!sentences.length || !wordCount) {
    return { category: 'Content Structure', name: 'Readability', status: 'warn', detail: 'Could not calculate readability' };
  }
  const avgWordsPerSentence = wordCount / sentences.length;
  const status = avgWordsPerSentence <= 20 ? 'pass' : avgWordsPerSentence <= 25 ? 'warn' : 'fail';
  return {
    category: 'Content Structure',
    name: 'Readability',
    status,
    detail: `~${avgWordsPerSentence.toFixed(1)} words/sentence — target under 20`,
  };
}

// ─── Technical SEO Checks ────────────────────────────────────────────────────

function checkFAQSchema(html: string): SEOCheck {
  const has = html.includes('FAQPage');
  return {
    category: 'Technical SEO',
    name: 'FAQ Schema (JSON-LD)',
    status: has ? 'pass' : 'fail',
    detail: has ? 'FAQPage JSON-LD schema present' : 'Missing FAQPage JSON-LD schema — add structured data',
  };
}

function checkArticleSchema(html: string): SEOCheck {
  const has = html.includes('"Article"') || html.includes("'Article'");
  return {
    category: 'Technical SEO',
    name: 'Article Schema (JSON-LD)',
    status: has ? 'pass' : 'fail',
    detail: has ? 'Article JSON-LD schema present' : 'Missing Article JSON-LD schema — add structured data',
  };
}

function checkImageAltTexts(html: string): SEOCheck {
  const images = html.match(/<img[^>]+>/gi) ?? [];
  if (images.length === 0) {
    return { category: 'Technical SEO', name: 'Image Alt Texts', status: 'warn', detail: 'No images found in content' };
  }
  const withAlt = images.filter((img) => /alt\s*=\s*["'][^"']+["']/i.test(img));
  const pass = withAlt.length === images.length;
  return {
    category: 'Technical SEO',
    name: 'Image Alt Texts',
    status: pass ? 'pass' : withAlt.length > images.length / 2 ? 'warn' : 'fail',
    detail: `${withAlt.length}/${images.length} images have alt text`,
  };
}

// ─── Links Checks ────────────────────────────────────────────────────────────

function checkInternalLinks(html: string): SEOCheck {
  // Count hrefs containing salesrobot.co or starting with /
  const allHrefs = (html.match(/href=["'][^"']+["']/gi) ?? []);
  const internal = allHrefs.filter((h) => {
    const lower = h.toLowerCase();
    return lower.includes('salesrobot.co') || /href=["']\//.test(h);
  }).length;
  const status = internal >= 5 ? 'pass' : internal >= 2 ? 'warn' : 'fail';
  return {
    category: 'Links',
    name: 'Internal Links',
    status,
    detail: `${internal} internal links found — target 5-8`,
  };
}

function checkExternalLinks(html: string): SEOCheck {
  // Count external hrefs (http/https but NOT salesrobot.co)
  const allLinks = (html.match(/href=["']https?:\/\/[^"']+["']/gi) ?? []);
  const external = allLinks.filter((l) => !l.toLowerCase().includes('salesrobot.co')).length;
  const status = external >= 5 ? 'pass' : external >= 2 ? 'warn' : 'fail';
  return {
    category: 'Links',
    name: 'External Links',
    status,
    detail: `${external} external links found — target 5-8`,
  };
}

// ─── CTAs & Formatting Checks ────────────────────────────────────────────────

function checkCTACount(html: string): SEOCheck {
  const ctaPatterns = [
    /free trial/gi,
    /start.*trial/gi,
    /try.*free/gi,
    /get.*demo/gi,
    /watch.*demo/gi,
    /sign.*up/gi,
    /get started/gi,
    /learn more/gi,
  ];
  const found = new Set<string>();
  for (const pattern of ctaPatterns) {
    const matches = html.match(pattern);
    if (matches) matches.forEach((m) => found.add(m.toLowerCase()));
  }
  const count = found.size;
  const pass = count >= 2 && count <= 3;
  return {
    category: 'CTAs & Formatting',
    name: 'CTA Count',
    status: pass ? 'pass' : count < 2 ? 'fail' : 'warn',
    detail: `${count} CTA(s) detected — target 2-3`,
  };
}

function checkBoldPresent(html: string): SEOCheck {
  const has = /<strong[^>]*>/i.test(html);
  return {
    category: 'CTAs & Formatting',
    name: 'Bold Text Present',
    status: has ? 'pass' : 'fail',
    detail: has ? '<strong> tags used for emphasis' : 'No <strong> tags — add bold for key points',
  };
}

function checkItalicsPresent(html: string): SEOCheck {
  const has = /<em[^>]*>/i.test(html);
  return {
    category: 'CTAs & Formatting',
    name: 'Italics Present',
    status: has ? 'pass' : 'warn',
    detail: has ? '<em> tags used' : 'No <em> tags — consider adding for emphasis',
  };
}

// ─── Infographic Checks ──────────────────────────────────────────────────────

function checkInfographicsPresent(html: string): SEOCheck {
  const has = html.includes('class="blog-infographic"') || html.includes("class='blog-infographic'");
  return {
    category: 'Infographics',
    name: 'Infographic Present',
    status: has ? 'pass' : 'warn',
    detail: has
      ? 'At least one <figure class="blog-infographic"> found'
      : 'No infographics detected — add at least one <figure class="blog-infographic">',
  };
}

function checkSVGAccessibility(html: string): SEOCheck {
  const svgs = html.match(/<svg[\s\S]*?<\/svg>/gi) ?? [];
  if (svgs.length === 0) {
    return { category: 'Infographics', name: 'SVG Accessibility', status: 'warn', detail: 'No SVGs found' };
  }
  const accessible = svgs.filter((svg) => /<title>/i.test(svg) && /<desc>/i.test(svg));
  const pass = accessible.length === svgs.length;
  return {
    category: 'Infographics',
    name: 'SVG Accessibility',
    status: pass ? 'pass' : accessible.length > 0 ? 'warn' : 'fail',
    detail: `${accessible.length}/${svgs.length} SVGs have <title> and <desc> tags`,
  };
}

// ─── Main Scorer ─────────────────────────────────────────────────────────────

export function scoreContent(
  html: string,
  keywordData: KeywordData,
  meta: { title: string; description: string; slug: string }
): SEOScore {
  console.log('[SCORER] Starting:', html?.length ?? 0, 'chars, keyword:', keywordData?.primaryKeyword ?? '(none)');

  // ── Top-level defensive guards ────────────────────────────────────────────
  if (!html || html.length < 100) {
    console.warn('[SCORER] html is empty or too short — returning default score');
    return { overall: 0, checks: [], suggestions: ['No HTML content to score'] };
  }
  if (!keywordData?.primaryKeyword) {
    console.warn('[SCORER] keywordData.primaryKeyword is missing — returning default score');
    return { overall: 0, checks: [], suggestions: ['No primary keyword available'] };
  }

  // Normalise arrays so every check always sees proper arrays, never undefined
  const safeKeywordData: KeywordData = {
    ...keywordData,
    secondaryKeywords: keywordData.secondaryKeywords || [],
    longTailKeywords:  keywordData.longTailKeywords  || [],
    peopleAlsoAsk:     keywordData.peopleAlsoAsk     || [],
    keywordGroups:     keywordData.keywordGroups     || {},
  };

  const safeMeta = {
    title:       meta?.title?.toLowerCase()       || '',
    description: meta?.description                 || '',
    slug:        meta?.slug                        || '',
  };

  try {
    const keyword = safeKeywordData.primaryKeyword;

    const checks: SEOCheck[] = [
      // ── Keyword Placement ──────────────────────────────────────────────────
      safeCheck('Keyword in Title Tag',       'Keyword Placement', () => checkKeywordInTitle(safeMeta.title, keyword)),
      safeCheck('Keyword in First 150 Words', 'Keyword Placement', () => checkKeywordInFirst150Words(html, keyword)),
      safeCheck('Keyword in H1',              'Keyword Placement', () => checkKeywordInH1(html, keyword)),
      safeCheck('Meta Description Length',    'Keyword Placement', () => checkMetaDescriptionLength(safeMeta.description)),
      safeCheck('Keyword in URL Slug',        'Keyword Placement', () => checkUrlSlug(safeMeta.slug, keyword)),
      safeCheck('Keyword Density',            'Keyword Placement', () => checkKeywordDensity(html, keyword)),
      safeCheck('Secondary Keywords Present', 'Keyword Placement', () => checkSecondaryKeywords(html, safeKeywordData.secondaryKeywords)),

      // ── Content Structure ──────────────────────────────────────────────────
      safeCheck('Word Count',       'Content Structure', () => checkWordCount(html, 2000)),
      safeCheck('Paragraph Length', 'Content Structure', () => checkParagraphLength(html)),
      safeCheck('FAQ Section',      'Content Structure', () => checkHasFAQSection(html)),
      safeCheck('Comparison Table', 'Content Structure', () => checkHasComparisonTable(html)),
      safeCheck('Heading Density',  'Content Structure', () => checkHeadingDensity(html)),
      safeCheck('Readability',      'Content Structure', () => checkReadability(html)),

      // ── Keyword Density (bigrams/trigrams each in own safeCheck) ───────────
      safeCheck('Top Bigram Alignment',  'Keyword Density', () => {
        const bigrams = extractBigrams(html);
        return checkBigramAlignment(bigrams, safeKeywordData);
      }),
      safeCheck('Top Trigram Alignment', 'Keyword Density', () => {
        const trigrams = extractTrigrams(html);
        return checkTrigramAlignment(trigrams, safeKeywordData);
      }),

      // ── Technical SEO ──────────────────────────────────────────────────────
      safeCheck('FAQ Schema (JSON-LD)',     'Technical SEO', () => checkFAQSchema(html)),
      safeCheck('Article Schema (JSON-LD)', 'Technical SEO', () => checkArticleSchema(html)),
      safeCheck('Image Alt Texts',          'Technical SEO', () => checkImageAltTexts(html)),

      // ── Links ──────────────────────────────────────────────────────────────
      safeCheck('Internal Links', 'Links', () => checkInternalLinks(html)),
      safeCheck('External Links', 'Links', () => checkExternalLinks(html)),

      // ── CTAs & Formatting ──────────────────────────────────────────────────
      safeCheck('CTA Count',    'CTAs & Formatting', () => checkCTACount(html)),
      safeCheck('Bold Text',    'CTAs & Formatting', () => checkBoldPresent(html)),
      safeCheck('Italics Text', 'CTAs & Formatting', () => checkItalicsPresent(html)),

      // ── Infographics ───────────────────────────────────────────────────────
      safeCheck('Infographic Present', 'Infographics', () => checkInfographicsPresent(html)),
      safeCheck('SVG Accessibility',   'Infographics', () => checkSVGAccessibility(html)),
    ];

    // Merge in formatting validator results (dedup by name)
    try {
      const formattingChecks = validateFormatting(html);
      for (const fc of formattingChecks) {
        if (!checks.find((c) => c.name === fc.name)) {
          checks.push(fc);
        }
      }
    } catch (err) {
      console.warn('[SCORER] validateFormatting threw:', err);
    }

    const passCount = checks.filter((c) => c.status === 'pass').length;
    const overall   = checks.length > 0 ? Math.round((passCount / checks.length) * 100) : 0;

    console.log('[SCORER] Done:', overall, '/', checks.length, 'checks,', passCount, 'passed');

    const suggestions = checks
      .filter((c) => c.status !== 'pass')
      .map((c) => `[${c.status.toUpperCase()}] ${c.name}: ${c.detail}`);

    return { overall, checks, suggestions };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[SCORER] Unexpected error:', msg);
    return { overall: 0, checks: [], suggestions: ['Scoring failed: ' + msg] };
  }
}
