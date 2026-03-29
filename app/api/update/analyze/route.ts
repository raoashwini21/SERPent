import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '../../../../lib/jina';
import { callClaude } from '../../../../lib/claude';
import { fetchBlogById, fetchBlogByUrl } from '../../../../lib/webflow';
import { findQuickWins, findMissingKeywords } from '../../../../lib/gsc-parser';
import type { GSCKeyword, BlogUpdateAnalysis } from '../../../../lib/types';

function extractTopicFromTitle(title: string): string {
  return title
    .replace(/\b(review|guide|complete|tutorial|how to|best|top|vs|comparison|2024|2025|2026)\b/gi, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join(' ');
}

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

const SURGICAL_SYSTEM = `You are an SEO content auditor performing a surgical analysis of a specific blog post. Your job is to find specific, concrete issues — not general suggestions.

Return a JSON object with these fields:
{
  "outdatedFacts": [{ "quote": "<exact text from article, max 80 chars>", "issue": "<what's wrong>", "suggestedFix": "<specific correction>" }],
  "yearReferences": [{ "quote": "<exact text with year>", "oldYear": 2023, "context": "<why this year is outdated>" }],
  "brokenClaims": [{ "quote": "<exact text>", "issue": "<why this claim is likely wrong/unverifiable>" }],
  "missingSections": ["<section title that should exist but doesn't>"],
  "keywordGaps": ["<keyword or phrase that should appear more>"]
}

Rules:
- You are analyzing THIS specific blog post — do not give generic advice
- "quote" must be VERBATIM text from the article (so we can find and replace it)
- Only flag real issues, not hypothetical ones
- OUTDATED FACTS: Quote the exact sentence that contains outdated info. Only flag things that are factually wrong or dated for 2026
- YEAR REFERENCES: Find exact quotes containing years 2023, 2024, or 2025 that should be updated to 2026. Quote the exact text
- MISSING SECTIONS: Compare to what top-ranking pages cover for the topic. List specific section topics this blog is missing
- KEYWORD GAPS: Keywords that should naturally appear but don't
- BROKEN CLAIMS: Specific claims that seem inaccurate — quote them
- If you find no issues in a category, return an empty array for that category
- Do NOT invent issues. Do NOT give generic blogging advice
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

    console.log('[ANALYZE] Content length:', originalHtml.length);
    if (originalHtml.trim().length < 500) {
      return NextResponse.json(
        { error: 'Could not fetch blog content. Please try pasting the HTML manually.' },
        { status: 400 }
      );
    }

    const originalText = htmlToText(originalHtml);
    const wordCount = originalText.split(/\s+/).filter(Boolean).length;

    // ── 2. Keyword / topic from hint or URL ──────────────────────────────────
    const keyword =
      primary_keyword ||
      (metaTitle ? extractTopicFromTitle(metaTitle) : '') ||
      (sourceUrl
        ? sourceUrl.replace(/^https?:\/\/[^/]+\/blog\//, '').replace(/-/g, ' ').split('/')[0]
        : '') ||
      'blog';
    console.log('[update/analyze] Using topic keyword:', keyword);

    // ── 3. Surgical Claude analysis ──────────────────────────────────────────
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
      const contentSnippet = originalHtml.slice(0, 6000);
      const raw = await callClaude(
        SURGICAL_SYSTEM,
        `BLOG TITLE: ${metaTitle || keyword}\nBLOG TOPIC: ${keyword}\nCurrent year: ${new Date().getFullYear()}\n\nBLOG CONTENT (first 6000 chars of HTML):\n${contentSnippet}\n\nFind ONLY issues that exist in THIS specific content. Do not give generic advice.`,
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
      contentIssues: {
        outdatedFacts: surgicalResult.outdatedFacts || [],
        yearReferences: surgicalResult.yearReferences || [],
        brokenClaims: surgicalResult.brokenClaims || [],
      },
      seoIssues: surgicalResult.keywordGaps || [],
      suggestedFixes: surgicalResult.keywordGaps || [],
      missingSections: surgicalResult.missingSections || [],
      keywordGaps: surgicalResult.keywordGaps || [],
      gscQuickWins,
      gscMissing,
      webflowItemId,
    };

    // ── 7. Derive issues[] for UI ─────────────────────────────────────────────
    const issues: UpdateIssue[] = [];
    const existingIds = new Set<string>();

    if (surgicalResult.outdatedFacts.length > 0) {
      issues.push({
        id: 'fix_outdated_facts',
        label: `Fix ${surgicalResult.outdatedFacts.length} outdated fact${surgicalResult.outdatedFacts.length > 1 ? 's' : ''}`,
        description: surgicalResult.outdatedFacts[0]?.issue || 'Outdated facts detected',
        severity: 'high',
        selected: true,
      });
      existingIds.add('fix_outdated_facts');
    }

    if (surgicalResult.yearReferences.length > 0) {
      issues.push({
        id: 'update_years',
        label: 'Update year references',
        description: `Found ${surgicalResult.yearReferences.length} outdated year reference${surgicalResult.yearReferences.length > 1 ? 's' : ''}`,
        severity: 'medium',
        selected: true,
      });
      existingIds.add('update_years');
    }

    if (surgicalResult.missingSections.length > 0 && !existingIds.has('add_missing_sections')) {
      issues.push({
        id: 'add_missing_sections',
        label: `Add ${surgicalResult.missingSections.length} missing section${surgicalResult.missingSections.length > 1 ? 's' : ''}`,
        description: surgicalResult.missingSections.join(', '),
        severity: 'medium',
        selected: false,
      });
      existingIds.add('add_missing_sections');
    }

    if (surgicalResult.keywordGaps.length > 0 && !existingIds.has('fix_keyword_density')) {
      issues.push({
        id: 'fix_keyword_density',
        label: `Add ${surgicalResult.keywordGaps.length} missing keyword${surgicalResult.keywordGaps.length > 1 ? 's' : ''}`,
        description: surgicalResult.keywordGaps.slice(0, 3).join(', '),
        severity: 'medium',
        selected: false,
      });
      existingIds.add('fix_keyword_density');
    }

    if (gscQuickWins && gscQuickWins.length > 0 && !existingIds.has('optimize_gsc_keywords')) {
      issues.push({
        id: 'optimize_gsc_keywords',
        label: `Optimize ${gscQuickWins.length} GSC keyword${gscQuickWins.length > 1 ? 's' : ''}`,
        description: `Quick-win keywords at positions 4–15: ${gscQuickWins.slice(0, 3).map((k) => k.query).join(', ')}`,
        severity: 'high',
        selected: true,
      });
      existingIds.add('optimize_gsc_keywords');
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
