import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '../../../../lib/jina';
import { callClaude } from '../../../../lib/claude';
import { scoreContent } from '../../../../lib/seo/content-scorer';
import { fetchBlogById, fetchBlogByUrl } from '../../../../lib/webflow';
import { findQuickWins, findMissingKeywords } from '../../../../lib/gsc-parser';
import type { GSCKeyword, BlogUpdateAnalysis } from '../../../../lib/types';

export interface AnalyzeResult {
  originalHtml: string;
  originalText: string;
  analysis: BlogUpdateAnalysis;
  issues: UpdateIssue[];
  wordCount: number;
  sourceUrl?: string;
  webflowItemId?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateIssue {
  id: string;
  label: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  selected: boolean;
}

const SURGICAL_SYSTEM = `You are an SEO content auditor performing a surgical analysis of a blog post. Your job is to find specific, concrete issues — not general suggestions.

Return a JSON object with these fields:
{
  "outdatedFacts": [{ "quote": "<exact text from article, max 80 chars>", "issue": "<what's wrong>", "suggestedFix": "<specific correction>" }],
  "yearReferences": [{ "quote": "<exact text with year>", "oldYear": 2023, "context": "<why this year is outdated>" }],
  "brokenClaims": [{ "quote": "<exact text>", "issue": "<why this claim is likely wrong/unverifiable>" }],
  "missingSections": ["<section title that should exist but doesn't>"],
  "keywordGaps": ["<keyword or phrase that should appear more>"]
}

Rules:
- "quote" must be VERBATIM text from the article (so we can find and replace it)
- Only flag real issues, not hypothetical ones
- yearReferences: only years that are clearly outdated (e.g. 2022, 2023 stats presented as current)
- missingSections: max 3, only genuinely missing important sections
- keywordGaps: max 5, only semantically relevant missing keywords
- Return ONLY valid JSON, no markdown`;

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      webflow_item_id?: string;
      blog_url?: string;
      blog_html?: string;
      primary_keyword?: string;
      gsc_keywords?: GSCKeyword[];
    };

    const { webflow_item_id, blog_url, blog_html, primary_keyword, gsc_keywords } = body;

    let originalHtml = '';
    let sourceUrl: string | undefined;
    let webflowItemId: string | undefined;
    let metaTitle: string | undefined;
    let metaDescription: string | undefined;

    // ── 1. Fetch content ─────────────────────────────────────────────────────
    if (webflow_item_id) {
      console.log(`[update/analyze] Fetching Webflow item ${webflow_item_id}`);
      const blog = await fetchBlogById(webflow_item_id);
      if (!blog) {
        return NextResponse.json({ error: 'Webflow item not found' }, { status: 404 });
      }
      originalHtml = blog.postBody;
      webflowItemId = blog.id;
      metaTitle = blog.metaTitle;
      metaDescription = blog.metaDescription;
    } else if (blog_url) {
      console.log(`[update/analyze] Scraping ${blog_url}`);
      // Try Webflow first for known Webflow URLs
      try {
        const wfBlog = await fetchBlogByUrl(blog_url);
        if (wfBlog && wfBlog.postBody && wfBlog.postBody.length > 200) {
          originalHtml = wfBlog.postBody;
          webflowItemId = wfBlog.id;
          metaTitle = wfBlog.metaTitle;
          metaDescription = wfBlog.metaDescription;
        }
      } catch {
        // Not in Webflow or no token configured — fall through to scraping
      }
      if (!originalHtml) {
        const scrapedText = await scrapeUrl(blog_url);
        if (!scrapedText || scrapedText.trim().length < 100) {
          return NextResponse.json({ error: 'Could not fetch page content' }, { status: 400 });
        }
        originalHtml = scrapedText
          .split('\n')
          .map((line) => {
            const t = line.trim();
            if (!t) return '';
            if (t.startsWith('# ')) return `<h1>${t.slice(2)}</h1>`;
            if (t.startsWith('## ')) return `<h2>${t.slice(3)}</h2>`;
            if (t.startsWith('### ')) return `<h3>${t.slice(4)}</h3>`;
            if (t.startsWith('- ') || t.startsWith('* ')) return `<li>${t.slice(2)}</li>`;
            return `<p>${t}</p>`;
          })
          .join('\n');
      }
      sourceUrl = blog_url;
    } else if (blog_html) {
      originalHtml = blog_html;
    } else {
      return NextResponse.json(
        { error: 'One of webflow_item_id, blog_url, or blog_html is required' },
        { status: 400 }
      );
    }

    if (!originalHtml || originalHtml.trim().length < 100) {
      return NextResponse.json({ error: 'Blog content is too short to analyze' }, { status: 400 });
    }

    const originalText = htmlToText(originalHtml);
    const wordCount = originalText.split(/\s+/).filter(Boolean).length;

    // ── 2. Keyword from hint or URL ───────────────────────────────────────────
    const keyword =
      primary_keyword ||
      (sourceUrl
        ? sourceUrl.replace(/^https?:\/\/[^/]+\/blog\//, '').replace(/-/g, ' ').split('/')[0]
        : '') ||
      'blog';

    // ── 3. SEO score ──────────────────────────────────────────────────────────
    const currentScore = scoreContent(
      originalHtml,
      {
        primaryKeyword: keyword,
        secondaryKeywords: [],
        longTailKeywords: [],
        peopleAlsoAsk: [],
        keywordGroups: {},
      },
      { title: metaTitle || '', description: metaDescription || '', slug: '' }
    );

    // ── 4. Surgical Claude analysis ───────────────────────────────────────────
    console.log('[update/analyze] Running surgical Claude analysis');
    type SurgicalResult = {
      outdatedFacts: { quote: string; issue: string; suggestedFix: string }[];
      yearReferences: { quote: string; oldYear: number; context: string }[];
      brokenClaims: { quote: string; issue: string }[];
      missingSections: string[];
      keywordGaps: string[];
    };

    let surgicalResult: SurgicalResult = {
      outdatedFacts: [],
      yearReferences: [],
      brokenClaims: [],
      missingSections: [],
      keywordGaps: [],
    };

    try {
      const contentSnippet = originalText.slice(0, 5000);
      const raw = await callClaude(
        SURGICAL_SYSTEM,
        `Primary keyword: ${keyword}\nCurrent year: ${new Date().getFullYear()}\n\nBlog content:\n${contentSnippet}`,
        1500
      );
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      surgicalResult = JSON.parse(cleaned) as SurgicalResult;
    } catch (err) {
      console.warn('[update/analyze] Surgical Claude analysis failed:', err);
    }

    // ── 5. GSC analysis ───────────────────────────────────────────────────────
    const gscQuickWins = gsc_keywords ? findQuickWins(gsc_keywords) : undefined;
    const gscMissing = gsc_keywords ? findMissingKeywords(gsc_keywords, originalHtml) : undefined;

    // ── 6. Build BlogUpdateAnalysis ───────────────────────────────────────────
    const analysis: BlogUpdateAnalysis = {
      currentScore,
      contentIssues: {
        outdatedFacts: surgicalResult.outdatedFacts || [],
        yearReferences: surgicalResult.yearReferences || [],
        brokenClaims: surgicalResult.brokenClaims || [],
      },
      seoIssues: currentScore,
      suggestedFixes: surgicalResult.keywordGaps || [],
      missingSections: surgicalResult.missingSections || [],
      keywordGaps: surgicalResult.keywordGaps || [],
      gscQuickWins,
      gscMissing,
      webflowItemId,
    };

    // ── 7. Derive issues[] for UI ─────────────────────────────────────────────
    const issues: UpdateIssue[] = [];

    if (surgicalResult.outdatedFacts.length > 0) {
      issues.push({
        id: 'fix_outdated_facts',
        label: `Fix ${surgicalResult.outdatedFacts.length} outdated fact${surgicalResult.outdatedFacts.length > 1 ? 's' : ''}`,
        description: surgicalResult.outdatedFacts[0]?.issue || 'Outdated facts detected',
        severity: 'high',
        selected: true,
      });
    }

    if (surgicalResult.yearReferences.length > 0) {
      issues.push({
        id: 'update_years',
        label: 'Update year references',
        description: `Found ${surgicalResult.yearReferences.length} outdated year reference${surgicalResult.yearReferences.length > 1 ? 's' : ''}`,
        severity: 'medium',
        selected: true,
      });
    }

    const failedChecks = currentScore.checks.filter((c) => c.status !== 'pass');
    const SCORE_ISSUE_MAP: Record<string, { id: string; label: string; severity: UpdateIssue['severity'] }> = {
      'Internal Links':     { id: 'add_internal_links',  label: 'Add internal links',    severity: 'high'   },
      'External Links':     { id: 'add_external_links',  label: 'Add external links',    severity: 'medium' },
      'FAQ Section Present':{ id: 'add_faq',             label: 'Add FAQ section',       severity: 'high'   },
      'Paragraph Length':   { id: 'fix_paragraph_length',label: 'Fix long paragraphs',   severity: 'medium' },
      'Keyword Density':    { id: 'fix_keyword_density', label: 'Fix keyword density',   severity: 'high'   },
    };

    const existingIds = new Set(issues.map((i) => i.id));
    for (const check of failedChecks) {
      const mapped = SCORE_ISSUE_MAP[check.name];
      if (mapped && !existingIds.has(mapped.id) && issues.length < 7) {
        issues.push({ ...mapped, description: check.detail, selected: mapped.severity === 'high' });
        existingIds.add(mapped.id);
      }
    }

    if (surgicalResult.missingSections.length > 0 && !existingIds.has('add_missing_sections')) {
      issues.push({
        id: 'add_missing_sections',
        label: `Add ${surgicalResult.missingSections.length} missing section${surgicalResult.missingSections.length > 1 ? 's' : ''}`,
        description: surgicalResult.missingSections.join(', '),
        severity: 'medium',
        selected: false,
      });
    }

    if (gscQuickWins && gscQuickWins.length > 0 && !existingIds.has('optimize_gsc_keywords')) {
      issues.push({
        id: 'optimize_gsc_keywords',
        label: `Optimize ${gscQuickWins.length} GSC keyword${gscQuickWins.length > 1 ? 's' : ''}`,
        description: `Quick-win keywords at positions 4–15: ${gscQuickWins.slice(0, 3).map((k) => k.query).join(', ')}`,
        severity: 'high',
        selected: true,
      });
    }

    const result: AnalyzeResult = {
      originalHtml,
      originalText,
      analysis,
      issues,
      wordCount,
      sourceUrl,
      webflowItemId,
      metaTitle,
      metaDescription,
    };

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[update/analyze] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
