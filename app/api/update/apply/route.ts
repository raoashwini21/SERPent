import { NextRequest } from 'next/server';
import { callClaude } from '../../../../lib/claude';
import { scoreContent } from '../../../../lib/seo/content-scorer';
import { updateBlogContent } from '../../../../lib/webflow';
import { findMissingKeywords } from '../../../../lib/gsc-parser';
import type { GSCKeyword, UpdateChange } from '../../../../lib/types';

const CURRENT_YEAR = new Date().getFullYear();

interface OutdatedFact {
  quote: string;
  issue: string;
  suggestedFix: string;
}

interface ApplyRequest {
  original_html: string;
  webflow_item_id?: string;
  selected_fixes: string[];
  keyword_data: {
    primaryKeyword: string;
    secondaryKeywords?: { keyword: string }[];
    longTailKeywords?: string[];
    peopleAlsoAsk?: string[];
    keywordGroups?: Record<string, string[]>;
  };
  gsc_keywords?: GSCKeyword[];
  outdated_facts?: OutdatedFact[];
  missing_sections?: string[];
}

// ─── Fix handlers ─────────────────────────────────────────────────────────────

async function fixOutdatedFacts(html: string, facts: OutdatedFact[]): Promise<{ html: string; changes: UpdateChange[] }> {
  const changes: UpdateChange[] = [];
  let result = html;

  for (const fact of facts) {
    if (!fact.quote || fact.quote.length < 10) continue;
    const idx = result.indexOf(fact.quote);
    if (idx === -1) continue;

    const SYSTEM = `You are a content editor. Replace ONLY the provided outdated text with an updated version. Keep HTML structure intact. Return ONLY the replacement HTML fragment.`;
    const prompt = `Replace this outdated text with updated content.
Issue: ${fact.issue}
Suggested fix: ${fact.suggestedFix}

OUTDATED TEXT:
${fact.quote}

Return ONLY the replacement text/HTML fragment (not the whole article).`;

    try {
      const replacement = await callClaude(SYSTEM, prompt, 512);
      const cleaned = replacement.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
      result = result.replace(fact.quote, cleaned);
      changes.push({ type: 'fix_outdated_facts', description: `Fixed: ${fact.issue}`, before: fact.quote, after: cleaned });
    } catch {
      // skip this fact
    }
  }

  return { html: result, changes };
}

function updateYears(html: string): { html: string; changes: UpdateChange[] } {
  const changes: UpdateChange[] = [];
  // Replace 2023/2024/2025 in text nodes only (not inside URLs or historical context)
  const oldYears = [2023, 2024, 2025].filter((y) => y < CURRENT_YEAR);
  let result = html;

  for (const year of oldYears) {
    // Match year not preceded/followed by slash, digit, or URL characters
    const re = new RegExp(`(?<![/\\d])${year}(?![/\\d])`, 'g');
    const before = result;
    result = result.replace(re, String(CURRENT_YEAR));
    if (result !== before) {
      changes.push({ type: 'update_years', description: `Replaced ${year} → ${CURRENT_YEAR}` });
    }
  }

  return { html: result, changes };
}

async function addMissingSections(html: string, sections: string[], keyword: string): Promise<{ html: string; changes: UpdateChange[] }> {
  const changes: UpdateChange[] = [];
  if (!sections || sections.length === 0) return { html, changes };

  let result = html;

  for (const section of sections) {
    const SYSTEM = `You are an SEO content writer. Generate a new blog section as clean HTML. Write 150-250 words. Use <h2> for heading, <p> for paragraphs. Return ONLY the HTML fragment.`;
    const prompt = `Generate the "${section}" section for a blog about "${keyword}".
Requirements:
- 150-250 words
- Use <h2>${section}</h2> as heading
- Use <p> tags for paragraphs
- Natural, informative tone
- Return ONLY the HTML fragment`;

    try {
      const generated = await callClaude(SYSTEM, prompt, 1024);
      const cleaned = generated.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();

      // Insert before </article> or </body> or append
      if (/<\/article>/i.test(result)) {
        result = result.replace(/<\/article>/i, `\n${cleaned}\n</article>`);
      } else if (/<\/body>/i.test(result)) {
        result = result.replace(/<\/body>/i, `\n${cleaned}\n</body>`);
      } else {
        result = result + '\n' + cleaned;
      }

      changes.push({ type: 'add_missing_sections', description: `Added section: ${section}` });
    } catch {
      // skip this section
    }
  }

  return { html: result, changes };
}

async function fixKeywordDensity(html: string, keyword: string): Promise<{ html: string; changes: UpdateChange[] }> {
  // Split into paragraphs, send each to Claude for keyword insertion
  const pTagRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs: { full: string; inner: string }[] = [];
  let match;
  while ((match = pTagRe.exec(html)) !== null) {
    paragraphs.push({ full: match[0], inner: match[1] });
  }

  // Only process paragraphs that don't have the keyword
  const kw = keyword.toLowerCase();
  const toFix = paragraphs.filter((p) => !p.inner.toLowerCase().includes(kw)).slice(0, 5);

  const changes: UpdateChange[] = [];
  let result = html;

  for (const para of toFix) {
    const wordCount = para.inner.split(/\s+/).filter(Boolean).length;
    if (wordCount < 20) continue; // skip short paragraphs

    const SYSTEM = `You are an SEO editor. Insert the target keyword naturally into the paragraph once. Keep the same meaning and tone. Return ONLY the updated <p> tag.`;
    const prompt = `Insert the keyword "${keyword}" naturally into this paragraph once.
Return ONLY the updated paragraph HTML.

PARAGRAPH:
${para.full}`;

    try {
      const updated = await callClaude(SYSTEM, prompt, 256);
      const cleaned = updated.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
      if (cleaned.startsWith('<p') && cleaned.includes('</p>')) {
        result = result.replace(para.full, cleaned);
        changes.push({ type: 'fix_keyword_density', description: `Inserted "${keyword}" into paragraph` });
      }
    } catch {
      // skip
    }
  }

  return { html: result, changes };
}

async function addInternalLinks(html: string, keyword: string): Promise<{ html: string; changes: UpdateChange[] }> {
  const SYSTEM = `You are an SEO specialist. Add 5-8 internal links to salesrobot.co pages within the blog HTML. Use realistic anchor text and link to /blog/, /features/, /pricing/, /vs/, /integrations/. Return ONLY the modified HTML.`;
  const prompt = `Add 5-8 internal links to salesrobot.co in this blog post. Place them naturally within existing text as <a href="/[path]">[anchor text]</a>. Primary keyword: ${keyword}

HTML:
${html.slice(0, 8000)}`;

  const result = await callClaude(SYSTEM, prompt, 4096);
  const cleaned = result.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
  return { html: cleaned, changes: [{ type: 'add_internal_links', description: 'Added internal links to salesrobot.co' }] };
}

async function addExternalLinks(html: string, keyword: string): Promise<{ html: string; changes: UpdateChange[] }> {
  const SYSTEM = `You are an SEO specialist. Add 5-8 external links to authoritative third-party sources (LinkedIn, G2, Capterra, Forbes, HubSpot, etc.) within the blog HTML. Use natural anchor text. Return ONLY the modified HTML.`;
  const prompt = `Add 5-8 external links to authoritative sources in this blog post. Primary keyword: ${keyword}

HTML:
${html.slice(0, 8000)}`;

  const result = await callClaude(SYSTEM, prompt, 4096);
  const cleaned = result.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
  return { html: cleaned, changes: [{ type: 'add_external_links', description: 'Added external authority links' }] };
}

function fixParagraphLength(html: string): { html: string; changes: UpdateChange[] } {
  const changes: UpdateChange[] = [];
  let result = html;
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  const replacements: { from: string; to: string }[] = [];

  while ((match = re.exec(html)) !== null) {
    const full = match[0];
    const inner = match[1];
    const words = inner.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length > 30) {
      const mid = Math.ceil(words.length / 2);
      // Find a split point in the actual inner HTML around the midpoint
      const sentences = inner.split(/(?<=[.!?])\s+/);
      if (sentences.length > 1) {
        const half = Math.ceil(sentences.length / 2);
        const p1 = sentences.slice(0, half).join(' ');
        const p2 = sentences.slice(half).join(' ');
        if (p2.trim()) {
          const tag = full.match(/^<p([^>]*)>/)?.[1] || '';
          const replacement = `<p${tag}>${p1}</p>\n<p${tag}>${p2}</p>`;
          replacements.push({ from: full, to: replacement });
          changes.push({ type: 'fix_paragraph_length', description: `Split paragraph of ${words.length} words` });
        }
      } else {
        // No sentence boundaries — split by word count
        const text = inner.replace(/<[^>]+>/g, ' ');
        const wordsArr = text.split(/\s+/).filter(Boolean);
        const p1 = wordsArr.slice(0, mid).join(' ');
        const p2 = wordsArr.slice(mid).join(' ');
        const tag = full.match(/^<p([^>]*)>/)?.[1] || '';
        replacements.push({ from: full, to: `<p${tag}>${p1}</p>\n<p${tag}>${p2}</p>` });
        changes.push({ type: 'fix_paragraph_length', description: `Split paragraph of ${words.length} words` });
      }
    }
  }

  for (const r of replacements) {
    result = result.replace(r.from, r.to);
  }

  return { html: result, changes };
}

async function addFaq(html: string, keyword: string): Promise<{ html: string; changes: UpdateChange[] }> {
  const SYSTEM = `You are an SEO content writer. Generate a FAQ section with 4-5 questions and answers. Format: <h2>Frequently Asked Questions</h2> followed by <h3>Q?</h3><p>A.</p> pairs. Return ONLY the FAQ HTML fragment.`;
  const prompt = `Generate a FAQ section for a blog about "${keyword}". 4-5 relevant questions with concise answers. Return ONLY the HTML fragment.`;

  const raw = await callClaude(SYSTEM, prompt, 1024);
  const faqHtml = raw.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();

  let result = html;
  // Insert before last </section>, </article>, or append
  if (/<\/article>/i.test(result)) {
    result = result.replace(/<\/article>/i, `\n${faqHtml}\n</article>`);
  } else if (/<\/body>/i.test(result)) {
    result = result.replace(/<\/body>/i, `\n${faqHtml}\n</body>`);
  } else {
    result = result + '\n' + faqHtml;
  }

  return { html: result, changes: [{ type: 'add_faq', description: 'Added FAQ section' }] };
}

async function fixMetaTags(html: string, keyword: string): Promise<{ html: string; changes: UpdateChange[] }> {
  const SYSTEM = `You are an SEO specialist. Generate an optimized title (under 60 chars, includes keyword) and meta description (120-150 chars, includes keyword). Return JSON: { "title": "...", "description": "..." }`;
  const prompt = `Generate SEO-optimized title and meta description for: ${keyword}\n\nContext (first 500 chars):\n${html.slice(0, 500)}`;

  const raw = await callClaude(SYSTEM, prompt, 256);
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const meta = JSON.parse(cleaned) as { title: string; description: string };

  let result = html;
  if (/<title>/i.test(result)) {
    result = result.replace(/<title>[^<]*<\/title>/i, `<title>${meta.title}</title>`);
  } else if (/<head>/i.test(result)) {
    result = result.replace(/<head>/i, `<head>\n<title>${meta.title}</title>`);
  }
  if (/<meta\s+name="description"/i.test(result)) {
    result = result.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${meta.description}" />`);
  } else if (/<head>/i.test(result)) {
    result = result.replace(/<head>/i, `<head>\n<meta name="description" content="${meta.description}" />`);
  }

  return { html: result, changes: [{ type: 'fix_meta_tags', description: `Updated title and meta description`, after: `${meta.title} | ${meta.description}` }] };
}

async function optimizeGscKeywords(html: string, gscKeywords: GSCKeyword[]): Promise<{ html: string; changes: UpdateChange[] }> {
  if (!gscKeywords || gscKeywords.length === 0) return { html, changes: [] };

  const missing = findMissingKeywords(gscKeywords, html).slice(0, 10);
  if (missing.length === 0) return { html, changes: [] };

  const SYSTEM = `You are an SEO content optimizer. Insert the provided keywords naturally into the blog HTML, max 2-3 per section. Keep all existing content intact. Return ONLY the modified HTML.`;
  const prompt = `Insert these keywords naturally into the blog, max 2-3 per section, without disrupting readability:
${missing.map((k) => `- ${k.query} (${k.impressions} impressions)`).join('\n')}

HTML:
${html.slice(0, 8000)}`;

  const result = await callClaude(SYSTEM, prompt, 4096);
  const cleaned = result.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
  return {
    html: cleaned,
    changes: [{ type: 'optimize_gsc_keywords', description: `Inserted ${missing.length} GSC keyword(s) naturally` }],
  };
}

// ─── Fix dispatcher ───────────────────────────────────────────────────────────

const FIX_LABELS: Record<string, string> = {
  fix_outdated_facts: 'Fixing outdated facts…',
  update_years: 'Updating year references…',
  add_missing_sections: 'Adding missing sections…',
  fix_keyword_density: 'Adjusting keyword density…',
  add_internal_links: 'Adding internal links…',
  add_external_links: 'Adding external links…',
  fix_paragraph_length: 'Splitting long paragraphs…',
  fix_meta_tags: 'Optimizing meta tags…',
  add_faq: 'Adding FAQ section…',
  optimize_gsc_keywords: 'Optimizing GSC keywords…',
};

// ─── SSE Route ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ApplyRequest;
  const { original_html, webflow_item_id, selected_fixes, keyword_data, gsc_keywords, outdated_facts, missing_sections } = body;

  const keyword = keyword_data?.primaryKeyword || 'blog';

  const encoder = new TextEncoder();
  let controllerClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (controllerClosed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { /* ignore */ }
      };

      const close = () => {
        if (!controllerClosed) {
          controllerClosed = true;
          try { controller.close(); } catch { /* ignore */ }
        }
      };

      try {
        let workingHtml = original_html;
        const fixes = (selected_fixes || []).filter((f) => f in FIX_LABELS);
        const allChanges: UpdateChange[] = [];

        send('status', { message: `Applying ${fixes.length} fix(es)…`, total: fixes.length, done: 0 });

        for (let i = 0; i < fixes.length; i++) {
          const fixId = fixes[i];
          const label = FIX_LABELS[fixId] || `Applying ${fixId}…`;
          send('status', { message: label, total: fixes.length, done: i });

          try {
            let result: { html: string; changes: UpdateChange[] };

            switch (fixId) {
              case 'fix_outdated_facts':
                result = await fixOutdatedFacts(workingHtml, outdated_facts || []);
                break;
              case 'update_years':
                result = updateYears(workingHtml);
                break;
              case 'add_missing_sections':
                result = await addMissingSections(workingHtml, missing_sections || [], keyword);
                break;
              case 'fix_keyword_density':
                result = await fixKeywordDensity(workingHtml, keyword);
                break;
              case 'add_internal_links':
                result = await addInternalLinks(workingHtml, keyword);
                break;
              case 'add_external_links':
                result = await addExternalLinks(workingHtml, keyword);
                break;
              case 'fix_paragraph_length':
                result = fixParagraphLength(workingHtml);
                break;
              case 'fix_meta_tags':
                result = await fixMetaTags(workingHtml, keyword);
                break;
              case 'add_faq':
                result = await addFaq(workingHtml, keyword);
                break;
              case 'optimize_gsc_keywords':
                result = await optimizeGscKeywords(workingHtml, gsc_keywords || []);
                break;
              default:
                result = { html: workingHtml, changes: [] };
            }

            if (result.html && result.html.length > 100) {
              workingHtml = result.html;
            }
            allChanges.push(...result.changes);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[update/apply] Fix ${fixId} failed:`, msg);
            send('fix_error', { id: fixId, message: msg });
          }

          send('status', { message: label.replace('…', ' ✓'), total: fixes.length, done: i + 1 });
        }

        // Re-score
        send('status', { message: 'Scoring updated content…', total: fixes.length, done: fixes.length });
        const oldScore = scoreContent(original_html, {
          primaryKeyword: keyword,
          secondaryKeywords: keyword_data?.secondaryKeywords || [],
          longTailKeywords: keyword_data?.longTailKeywords || [],
          peopleAlsoAsk: keyword_data?.peopleAlsoAsk || [],
          keywordGroups: keyword_data?.keywordGroups || {},
        }, { title: '', description: '', slug: '' });

        const newScore = scoreContent(workingHtml, {
          primaryKeyword: keyword,
          secondaryKeywords: keyword_data?.secondaryKeywords || [],
          longTailKeywords: keyword_data?.longTailKeywords || [],
          peopleAlsoAsk: keyword_data?.peopleAlsoAsk || [],
          keywordGroups: keyword_data?.keywordGroups || {},
        }, { title: '', description: '', slug: '' });

        send('complete', {
          updated_html: workingHtml,
          old_score: oldScore.overall,
          new_score: newScore.overall,
          changes_made: allChanges,
        });

        // Push to Webflow if item id provided
        if (webflow_item_id) {
          send('webflow_ready', { item_id: webflow_item_id, message: 'Content ready to publish to Webflow' });
        }
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
