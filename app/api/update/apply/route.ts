import { NextRequest } from 'next/server';
import { callClaude } from '../../../../lib/claude';
import { scoreContent } from '../../../../lib/seo/content-scorer';

const CURRENT_YEAR = new Date().getFullYear();

interface ApplyRequest {
  originalHtml: string;
  originalText: string;
  selectedFixes: string[];
  keyword: string;
  url: string;
}

type FixId =
  | 'update_year'
  | 'fix_paragraph_length'
  | 'add_internal_links'
  | 'add_external_links'
  | 'fix_keyword_density'
  | 'fix_facts'
  | 'add_faq'
  | 'fix_meta_tags';

// ─── Individual fix handlers ──────────────────────────────────────────────────

async function applyUpdateYear(html: string): Promise<string> {
  // Replace common past years with current year
  const pastYears = [2020, 2021, 2022, 2023, 2024].filter((y) => y < CURRENT_YEAR);
  let result = html;
  for (const year of pastYears) {
    // Only replace years that appear in editorial context (not in URLs/schemas)
    result = result.replace(
      new RegExp(`(?<![/\\w])${year}(?![/\\w])`, 'g'),
      String(CURRENT_YEAR)
    );
  }
  return result;
}

async function applyFixParagraphLength(html: string, keyword: string): Promise<string> {
  const SYSTEM = `You are a content editor. Fix paragraphs that are too long (over 30 words). Split them into shorter, scannable paragraphs. Keep all information and meaning. Return ONLY the fixed HTML, no explanation.`;
  const prompt = `The blog post below has some paragraphs that exceed 30 words. Split them into shorter paragraphs (each under 25 words). Keep all content intact. Only change paragraphs that are too long.

Primary keyword context: ${keyword}

HTML:
${html.slice(0, 8000)}`;
  const result = await callClaude(SYSTEM, prompt, 4096);
  return result.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
}

async function applyAddInternalLinks(html: string, keyword: string): Promise<string> {
  const SYSTEM = `You are an SEO specialist. Add 5-8 internal links to salesrobot.co pages within the blog post HTML. Use realistic anchor text and link to: /blog/, /features/, /pricing/, /vs/, /integrations/. Return ONLY the modified HTML.`;
  const prompt = `Add 5-8 internal links to salesrobot.co in this blog post. Place them naturally within existing text as <a href="/[path]">[anchor text]</a>. The primary keyword is: ${keyword}

HTML:
${html.slice(0, 8000)}`;
  const result = await callClaude(SYSTEM, prompt, 4096);
  return result.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
}

async function applyAddExternalLinks(html: string, keyword: string): Promise<string> {
  const SYSTEM = `You are an SEO specialist. Add 5-8 external links to authoritative third-party sources (LinkedIn, G2, Capterra, Forbes, HubSpot, etc.) within the blog post HTML. Use natural anchor text. Return ONLY the modified HTML.`;
  const prompt = `Add 5-8 external links to authoritative sources in this blog post. Link to real authoritative domains like linkedin.com, g2.com, capterra.com, hubspot.com using natural anchor text. The primary keyword is: ${keyword}

HTML:
${html.slice(0, 8000)}`;
  const result = await callClaude(SYSTEM, prompt, 4096);
  return result.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
}

async function applyFixKeywordDensity(html: string, keyword: string): Promise<string> {
  const SYSTEM = `You are an SEO content writer. Adjust the keyword density in this blog post to be between 1-2%. Add or naturally rephrase sentences to include the target keyword more frequently. Do not keyword-stuff. Return ONLY the modified HTML.`;
  const prompt = `Adjust the keyword density for "${keyword}" to be 1-2% in this blog post. The keyword should appear naturally every 100-150 words. Add the keyword where it fits naturally without disrupting readability.

HTML:
${html.slice(0, 8000)}`;
  const result = await callClaude(SYSTEM, prompt, 4096);
  return result.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
}

async function applyFixFacts(html: string, keyword: string): Promise<string> {
  const SYSTEM = `You are a fact-checker. Update any outdated statistics, data points, or facts in this blog post. Replace old/vague stats with current, specific ones from reputable sources. Return ONLY the modified HTML.`;
  const prompt = `Update outdated facts and statistics in this blog post about ${keyword}. Replace any vague or outdated data points with specific current statistics. Keep all other content the same.

HTML:
${html.slice(0, 8000)}`;
  const result = await callClaude(SYSTEM, prompt, 4096);
  return result.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
}

async function applyAddFaq(html: string, keyword: string): Promise<string> {
  const SYSTEM = `You are an SEO content writer. Add a FAQ section with 4-5 questions and answers related to the blog topic. Format it as <h2>Frequently Asked Questions</h2> followed by <h3>Question?</h3><p>Answer.</p> pairs. Return the full HTML with the FAQ section appended before the closing </article> or at the end.`;
  const prompt = `Add a FAQ section to this blog post about "${keyword}". Generate 4-5 relevant questions that users commonly ask about this topic, with concise, helpful answers. Append the FAQ before the last section of the article.

HTML:
${html.slice(0, 8000)}`;
  const result = await callClaude(SYSTEM, prompt, 4096);
  return result.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
}

async function applyFixMetaTags(html: string, keyword: string): Promise<string> {
  // For meta tags, we inject/update the <title> and meta description in the HTML head
  const SYSTEM = `You are an SEO specialist. Optimize the title and meta description for this blog post. The title should be under 60 chars, include the primary keyword, and be compelling. The description should be 120-150 chars with the keyword. Return JSON: { "title": "...", "description": "..." }`;
  const prompt = `Generate an optimized title and meta description for a blog post about: ${keyword}

Current HTML (first 2000 chars for context):
${html.slice(0, 2000)}`;

  const raw = await callClaude(SYSTEM, prompt, 256);
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const meta = JSON.parse(cleaned) as { title: string; description: string };

  // Inject/replace meta tags in HTML
  let result = html;
  if (/<title>/i.test(result)) {
    result = result.replace(/<title>[^<]*<\/title>/i, `<title>${meta.title}</title>`);
  } else if (/<head>/i.test(result)) {
    result = result.replace(/<head>/i, `<head>\n<title>${meta.title}</title>`);
  }
  if (/<meta\s+name="description"/i.test(result)) {
    result = result.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${meta.description}" />`
    );
  } else if (/<head>/i.test(result)) {
    result = result.replace(
      /<head>/i,
      `<head>\n<meta name="description" content="${meta.description}" />`
    );
  }
  return result;
}

// ─── Fix dispatcher ───────────────────────────────────────────────────────────

const FIX_LABELS: Record<FixId, string> = {
  update_year: 'Updating year references…',
  fix_paragraph_length: 'Splitting long paragraphs…',
  add_internal_links: 'Adding internal links…',
  add_external_links: 'Adding external links…',
  fix_keyword_density: 'Adjusting keyword density…',
  fix_facts: 'Updating facts & statistics…',
  add_faq: 'Adding FAQ section…',
  fix_meta_tags: 'Optimizing meta tags…',
};

async function applyFix(id: FixId, html: string, keyword: string): Promise<string> {
  switch (id) {
    case 'update_year': return applyUpdateYear(html);
    case 'fix_paragraph_length': return applyFixParagraphLength(html, keyword);
    case 'add_internal_links': return applyAddInternalLinks(html, keyword);
    case 'add_external_links': return applyAddExternalLinks(html, keyword);
    case 'fix_keyword_density': return applyFixKeywordDensity(html, keyword);
    case 'fix_facts': return applyFixFacts(html, keyword);
    case 'add_faq': return applyAddFaq(html, keyword);
    case 'fix_meta_tags': return applyFixMetaTags(html, keyword);
    default: return html;
  }
}

// ─── SSE Route ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json() as ApplyRequest;
  const { originalHtml, originalText: _originalText, selectedFixes, keyword, url: _url } = body;

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
        const fixes = (selectedFixes || []).filter((f): f is FixId => f in FIX_LABELS);

        send('status', { message: `Applying ${fixes.length} fix(es)…`, total: fixes.length, done: 0 });

        for (let i = 0; i < fixes.length; i++) {
          const fixId = fixes[i];
          const label = FIX_LABELS[fixId] || `Applying ${fixId}…`;
          send('status', { message: label, total: fixes.length, done: i });

          try {
            const result = await applyFix(fixId, workingHtml, keyword);
            if (result && result.length > 100) {
              workingHtml = result;
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
          { title: '', description: '', slug: '' }
        );

        send('complete', {
          updatedHtml: workingHtml,
          score: newScore,
          fixesApplied: fixes,
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
