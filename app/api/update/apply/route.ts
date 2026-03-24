import { NextRequest } from 'next/server';
import { callClaude } from '../../../../lib/claude';
import { scoreContent } from '../../../../lib/seo/content-scorer';
import { injectInternalLinks } from '../../../../lib/links/internal-linker';
import type { BlogUpdateAnalysis, GSCKeyword, UpdateChange } from '../../../../lib/types';

const CURRENT_YEAR = new Date().getFullYear();

interface ApplyRequest {
  originalHtml: string;
  webflow_item_id?: string;
  selectedFixes: string[];
  keyword: string;
  gsc_keywords?: GSCKeyword[];
  analysis?: BlogUpdateAnalysis;
  metaTitle?: string;
  metaDescription?: string;
}

// ─── Surgical paragraph helpers ───────────────────────────────────────────────

/** Find the <p> or <li> tag containing a quote substring and replace it */
function surgicalParagraphReplace(
  html: string,
  quote: string,
  replacement: string
): string {
  if (!quote || !replacement) return html;
  const safeQuote = quote.slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const paraRe = new RegExp(
    `<(p|li|blockquote)[^>]*>[^<]*${safeQuote}[\\s\\S]*?<\\/\\1>`,
    'i'
  );
  return html.replace(paraRe, replacement);
}

/** Extract the paragraph HTML containing a quote */
function extractParagraph(html: string, quote: string): string | null {
  const safeQuote = quote.slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const paraRe = new RegExp(
    `<(p|li|blockquote)[^>]*>[^<]*${safeQuote}[\\s\\S]*?<\\/\\1>`,
    'i'
  );
  const match = paraRe.exec(html);
  return match ? match[0] : null;
}

// ─── Fix handlers ─────────────────────────────────────────────────────────────

async function fixOutdatedFacts(
  html: string,
  analysis: BlogUpdateAnalysis,
  changes: UpdateChange[]
): Promise<string> {
  let result = html;
  const facts = analysis.contentIssues?.outdatedFacts || [];

  for (const fact of facts.slice(0, 5)) {
    const para = extractParagraph(result, fact.quote);
    if (!para) continue;

    try {
      const fixed = await callClaude(
        'You are a content editor. Fix the specific issue in the paragraph below. Return ONLY the corrected paragraph HTML. Keep all HTML tags intact.',
        `Issue: ${fact.issue}\nSuggested fix: ${fact.suggestedFix}\n\nParagraph:\n${para}`,
        512
      );
      const cleanFixed = fixed.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
      if (cleanFixed && cleanFixed.length > 20) {
        result = surgicalParagraphReplace(result, fact.quote, cleanFixed);
        changes.push({
          type: 'fix_outdated_facts',
          description: fact.issue,
          before: para,
          after: cleanFixed,
        });
      }
    } catch {
      // Skip this fact if Claude fails
    }
  }

  return result;
}

async function updateYears(html: string, changes: UpdateChange[]): Promise<string> {
  const pastYears = [2020, 2021, 2022, 2023, 2024].filter((y) => y < CURRENT_YEAR);
  let result = html;
  let count = 0;

  for (const year of pastYears) {
    const re = new RegExp(`(?<![/\\w])${year}(?![/\\w])`, 'g');
    const before = result;
    result = result.replace(re, String(CURRENT_YEAR));
    if (result !== before) count++;
  }

  if (count > 0) {
    changes.push({
      type: 'update_years',
      description: `Replaced ${count} outdated year reference${count > 1 ? 's' : ''} with ${CURRENT_YEAR}`,
    });
  }
  return result;
}

async function fixParagraphLength(html: string, changes: UpdateChange[]): Promise<string> {
  // Split <p> tags with >30 words into two paragraphs using sentence boundaries
  let result = html;
  let count = 0;
  const paraRe = /<p([^>]*)>([\s\S]*?)<\/p>/gi;

  result = result.replace(paraRe, (_match, attrs: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '');
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount <= 30) return `<p${attrs}>${inner}</p>`;

    // Split on sentence boundary near midpoint
    const sentences = text.match(/[^.!?]+[.!?]+/g);
    if (!sentences || sentences.length < 2) return `<p${attrs}>${inner}</p>`;

    const mid = Math.ceil(sentences.length / 2);
    const first = sentences.slice(0, mid).join(' ').trim();
    const second = sentences.slice(mid).join(' ').trim();
    if (!first || !second) return `<p${attrs}>${inner}</p>`;

    count++;
    return `<p${attrs}>${first}</p>\n<p${attrs}>${second}</p>`;
  });

  if (count > 0) {
    changes.push({
      type: 'fix_paragraph_length',
      description: `Split ${count} long paragraph${count > 1 ? 's' : ''} into shorter ones`,
    });
  }
  return result;
}

async function addInternalLinks(
  html: string,
  keyword: string,
  changes: UpdateChange[]
): Promise<string> {
  // Guess category from keyword
  const kwLower = keyword.toLowerCase();
  const category =
    kwLower.includes('linkedin') ? 'linkedin-automation'
    : kwLower.includes('email') ? 'email-outreach'
    : kwLower.includes('sales') ? 'sales-tips'
    : 'linkedin-automation';

  const result = injectInternalLinks(html, category);
  if (result !== html) {
    changes.push({
      type: 'add_internal_links',
      description: 'Injected internal links to related Salesrobot content',
    });
  }
  return result;
}

async function addExternalLinks(
  html: string,
  keyword: string,
  changes: UpdateChange[]
): Promise<string> {
  const SYSTEM = `You are an SEO specialist. Add 5-8 external links to authoritative third-party sources within the blog post HTML. Use natural anchor text. Preserve all existing content and formatting. Return ONLY the modified HTML.`;
  const prompt = `Add 5-8 external links to authority domains (linkedin.com, g2.com, capterra.com, hubspot.com, forbes.com) in this blog post. Insert them as <a href="URL">anchor text</a> within existing sentences. Primary keyword: ${keyword}

HTML (first 6000 chars):
${html.slice(0, 6000)}`;

  const fixed = await callClaude(SYSTEM, prompt, 4096);
  const cleanFixed = fixed.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
  if (cleanFixed && cleanFixed.length > 200) {
    changes.push({ type: 'add_external_links', description: 'Added 5-8 external authority links' });
    return cleanFixed;
  }
  return html;
}

async function fixKeywordDensity(
  html: string,
  keyword: string,
  changes: UpdateChange[]
): Promise<string> {
  // Find paragraphs missing the keyword and fix up to 3
  const paraRe = /<p[^>]*>[\s\S]*?<\/p>/gi;
  const paras = html.match(paraRe) || [];
  const kwLower = keyword.toLowerCase();

  let count = 0;
  let result = html;

  for (const para of paras) {
    if (count >= 3) break;
    const text = para.replace(/<[^>]+>/g, '').toLowerCase();
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount < 15) continue; // skip short paragraphs
    if (text.includes(kwLower)) continue; // already has keyword

    try {
      const fixed = await callClaude(
        'You are an SEO content writer. Add the target keyword naturally to this paragraph. Return ONLY the corrected paragraph HTML. Keep the same length and structure.',
        `Target keyword: "${keyword}"\n\nParagraph:\n${para}`,
        512
      );
      const cleanFixed = fixed.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
      if (cleanFixed && cleanFixed.length > 20) {
        result = result.replace(para, cleanFixed);
        count++;
      }
    } catch {
      // Skip
    }
  }

  if (count > 0) {
    changes.push({
      type: 'fix_keyword_density',
      description: `Added "${keyword}" keyword to ${count} paragraph${count > 1 ? 's' : ''}`,
    });
  }
  return result;
}

async function addMissingSections(
  html: string,
  keyword: string,
  analysis: BlogUpdateAnalysis,
  changes: UpdateChange[]
): Promise<string> {
  const sections = analysis?.missingSections || [];
  if (sections.length === 0) return html;

  let result = html;

  for (const sectionTitle of sections.slice(0, 3)) {
    try {
      const sectionHtml = await callClaude(
        'You are an SEO content writer. Write a blog section in HTML. Return ONLY the HTML fragment (h2 + paragraphs). No markdown, no explanation.',
        `Write a section titled "${sectionTitle}" for a blog post about "${keyword}". Include 2-3 paragraphs with useful, specific information. Format: <h2>${sectionTitle}</h2><p>...</p>`,
        1024
      );
      const cleanSection = sectionHtml
        .replace(/^```(?:html)?\s*/i, '')
        .replace(/```\s*$/, '')
        .trim();
      if (!cleanSection) continue;

      // Insert before last h2 or before </article> or at the end
      if (/<\/article>/i.test(result)) {
        result = result.replace(/<\/article>/i, `\n${cleanSection}\n</article>`);
      } else if (/<\/div>/i.test(result)) {
        const lastDiv = result.lastIndexOf('</div>');
        result = result.slice(0, lastDiv) + `\n${cleanSection}\n` + result.slice(lastDiv);
      } else {
        result += `\n${cleanSection}`;
      }

      changes.push({
        type: 'add_missing_sections',
        description: `Added missing section: "${sectionTitle}"`,
        after: cleanSection,
      });
    } catch {
      // Skip
    }
  }

  return result;
}

async function addFaq(html: string, keyword: string, changes: UpdateChange[]): Promise<string> {
  const faqHtml = await callClaude(
    'You are an SEO content writer. Generate a FAQ section for a blog post. Return ONLY the HTML fragment. No markdown.',
    `Generate a FAQ section with 4-5 questions and answers for a blog post about "${keyword}". Format: <h2>Frequently Asked Questions</h2><h3>Question?</h3><p>Answer.</p> (repeat)`,
    1024
  );
  const cleanFaq = faqHtml.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
  if (!cleanFaq) return html;

  let result = html;
  if (/<\/article>/i.test(result)) {
    result = result.replace(/<\/article>/i, `\n${cleanFaq}\n</article>`);
  } else {
    result += `\n${cleanFaq}`;
  }

  changes.push({ type: 'add_faq', description: 'Added FAQ section with 4-5 Q&As', after: cleanFaq });
  return result;
}

async function optimizeGscKeywords(
  html: string,
  gscKeywords: GSCKeyword[],
  changes: UpdateChange[]
): Promise<string> {
  const quickWins = gscKeywords
    .filter((k) => k.position >= 4 && k.position <= 15 && k.impressions >= 50)
    .slice(0, 5);

  if (quickWins.length === 0) return html;

  let result = html;
  let count = 0;

  for (const kw of quickWins) {
    if (count >= 3) break;
    const kwLower = kw.query.toLowerCase();
    if (result.toLowerCase().includes(kwLower)) continue;

    // Find the most relevant paragraph (longest, not already having many links)
    const paraRe = /<p[^>]*>[\s\S]*?<\/p>/gi;
    const paras = result.match(paraRe) || [];
    const candidate = paras
      .filter((p) => !/<a\s/i.test(p))
      .sort((a, b) => b.length - a.length)[0];

    if (!candidate) continue;

    try {
      const fixed = await callClaude(
        'You are an SEO content writer. Naturally add the target keyword to this paragraph. Return ONLY the updated paragraph HTML.',
        `Target keyword to add: "${kw.query}"\n\nParagraph:\n${candidate}`,
        512
      );
      const cleanFixed = fixed.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
      if (cleanFixed && cleanFixed.length > 20) {
        result = result.replace(candidate, cleanFixed);
        count++;
        changes.push({
          type: 'optimize_gsc_keywords',
          description: `Added GSC keyword "${kw.query}" (pos ${kw.position.toFixed(1)}, ${kw.impressions} impressions)`,
        });
      }
    } catch {
      // Skip
    }
  }

  return result;
}

// ─── Fix label map ─────────────────────────────────────────────────────────────

const FIX_LABELS: Record<string, string> = {
  fix_outdated_facts:   'Fixing outdated facts…',
  update_years:         'Updating year references…',
  add_missing_sections: 'Adding missing sections…',
  fix_keyword_density:  'Adjusting keyword density…',
  add_internal_links:   'Adding internal links…',
  add_external_links:   'Adding external links…',
  fix_paragraph_length: 'Splitting long paragraphs…',
  add_faq:              'Adding FAQ section…',
  optimize_gsc_keywords:'Optimizing GSC keywords…',
};

// ─── SSE Route ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json() as ApplyRequest;
  const {
    originalHtml,
    webflow_item_id,
    selectedFixes,
    keyword,
    gsc_keywords,
    analysis,
    metaTitle,
    metaDescription,
  } = body;

  const encoder = new TextEncoder();
  let controllerClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (controllerClosed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // ignore
        }
      };

      const close = () => {
        if (!controllerClosed) {
          controllerClosed = true;
          try { controller.close(); } catch { /* ignore */ }
        }
      };

      try {
        let workingHtml = originalHtml;
        const fixes = (selectedFixes || []).filter((f) => f in FIX_LABELS);
        const changes: UpdateChange[] = [];

        send('status', { message: `Applying ${fixes.length} fix(es)…`, total: fixes.length, done: 0 });

        for (let i = 0; i < fixes.length; i++) {
          const fixId = fixes[i];
          const label = FIX_LABELS[fixId] || `Applying ${fixId}…`;
          send('status', { message: label, total: fixes.length, done: i });

          try {
            switch (fixId) {
              case 'fix_outdated_facts':
                if (analysis) workingHtml = await fixOutdatedFacts(workingHtml, analysis, changes);
                break;
              case 'update_years':
                workingHtml = await updateYears(workingHtml, changes);
                break;
              case 'add_missing_sections':
                if (analysis) workingHtml = await addMissingSections(workingHtml, keyword, analysis, changes);
                break;
              case 'fix_keyword_density':
                workingHtml = await fixKeywordDensity(workingHtml, keyword, changes);
                break;
              case 'add_internal_links':
                workingHtml = await addInternalLinks(workingHtml, keyword, changes);
                break;
              case 'add_external_links':
                workingHtml = await addExternalLinks(workingHtml, keyword, changes);
                break;
              case 'fix_paragraph_length':
                workingHtml = await fixParagraphLength(workingHtml, changes);
                break;
              case 'add_faq':
                workingHtml = await addFaq(workingHtml, keyword, changes);
                break;
              case 'optimize_gsc_keywords':
                if (gsc_keywords) workingHtml = await optimizeGscKeywords(workingHtml, gsc_keywords, changes);
                break;
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[update/apply] Fix ${fixId} failed:`, msg);
            send('fix_error', { id: fixId, message: msg });
          }

          send('status', { message: label.replace('…', ' ✓'), total: fixes.length, done: i + 1 });
        }

        // Re-score
        send('status', { message: 'Scoring updated content…', total: fixes.length, done: fixes.length });
        const newScore = scoreContent(
          workingHtml,
          {
            primaryKeyword: keyword || 'blog',
            secondaryKeywords: [],
            longTailKeywords: [],
            peopleAlsoAsk: [],
            keywordGroups: {},
          },
          { title: metaTitle || '', description: metaDescription || '', slug: '' }
        );

        send('complete', {
          updatedHtml: workingHtml,
          score: newScore,
          changes_made: changes,
          webflow_ready: !!webflow_item_id,
          webflow_item_id,
          meta: { metaTitle, metaDescription },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[update/apply] Fatal error:', msg);
        send('error', { message: msg });
      } finally {
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
