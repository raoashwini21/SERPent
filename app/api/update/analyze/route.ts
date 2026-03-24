import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '../../../../lib/jina';
import { callClaude } from '../../../../lib/claude';
import { scoreContent } from '../../../../lib/seo/content-scorer';
import { fetchBlogByUrl, fetchBlogBySlug } from '../../../../lib/webflow';
import { parseGSCData, findQuickWins, findMissingKeywords } from '../../../../lib/gsc-parser';
import { analyzeSERP } from '../../../../lib/seo/serp-analyzer';
import { discoverKeywords } from '../../../../lib/seo/keyword-discovery';
import { estimateKeywordMetrics } from '../../../../lib/seo/keyword-scoring';
import { searchWeb } from '../../../../lib/jina';
import type { BlogUpdateAnalysis, GSCKeyword } from '../../../../lib/types';

export interface AnalyzeResult {
  originalHtml: string;
  originalText: string;
  score: {
    overall: number;
    checks: { category: string; name: string; status: string; detail: string }[];
    suggestions: string[];
  };
  issues: UpdateIssue[];
  wordCount: number;
  url: string;
  blogUpdateAnalysis?: BlogUpdateAnalysis;
}

export interface UpdateIssue {
  id: string;
  label: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  selected: boolean;
}

interface OutdatedFact {
  quote: string;
  issue: string;
  suggestedFix: string;
}

interface YearReference {
  quote: string;
  oldYear: number;
}

interface BrokenClaim {
  quote: string;
  issue: string;
}

interface SurgicalAnalysis {
  outdatedFacts: OutdatedFact[];
  yearReferences: YearReference[];
  missingSections: string[];
  keywordGaps: string[];
  brokenClaims: BrokenClaim[];
}

const SURGICAL_SYSTEM = `You are an expert SEO content auditor. Analyze the provided blog and return ONLY specific, actionable issues. Do NOT suggest rewriting the whole blog. Find only what is genuinely wrong.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      webflow_item_id?: string;
      blog_url?: string;
      blog_html?: string;
      primary_keyword?: string;
      gsc_keywords?: string;
    };

    const { webflow_item_id, blog_url, blog_html, primary_keyword, gsc_keywords } = body;

    // ── a. Get content ────────────────────────────────────────────────────────
    let originalHtml = '';
    let fetchedUrl = blog_url || '';
    let webflowItemId = webflow_item_id;

    if (webflow_item_id) {
      console.log(`[update/analyze] Fetching from Webflow item: ${webflow_item_id}`);
      // Try fetching by slug if it looks like a slug, else list to find id
      const blog = await fetchBlogBySlug(webflow_item_id).catch(() => null);
      if (blog) {
        originalHtml = blog.postBody;
        webflowItemId = blog.id;
        fetchedUrl = fetchedUrl || `https://www.salesrobot.co/blogs/${blog.slug}`;
      }
    } else if (blog_url) {
      console.log(`[update/analyze] Fetching from URL: ${blog_url}`);
      // Try Webflow first
      const wfBlog = await fetchBlogByUrl(blog_url).catch(() => null);
      if (wfBlog && wfBlog.postBody) {
        originalHtml = wfBlog.postBody;
        webflowItemId = wfBlog.id;
      } else {
        const scraped = await scrapeUrl(blog_url);
        originalHtml = scraped
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
    } else if (blog_html) {
      originalHtml = blog_html;
    } else {
      return NextResponse.json({ error: 'One of webflow_item_id, blog_url, or blog_html is required' }, { status: 400 });
    }

    if (!originalHtml || originalHtml.trim().length < 100) {
      return NextResponse.json({ error: 'Could not retrieve blog content' }, { status: 400 });
    }

    const originalText = originalHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = originalText.split(/\s+/).filter(Boolean).length;

    // ── b. Keyword research ───────────────────────────────────────────────────
    const topicGuess = primary_keyword ||
      (fetchedUrl ? fetchedUrl.replace(/^https?:\/\/[^/]+\/blogs?\//, '').replace(/-/g, ' ').split('/')[0] : 'blog');

    let keywordData;
    try {
      const keywords = await discoverKeywords(topicGuess, 'blog');
      const serpContent = await searchWeb(topicGuess).catch(() => '');
      keywordData = await estimateKeywordMetrics(keywords, serpContent);
    } catch {
      keywordData = {
        primaryKeyword: topicGuess,
        secondaryKeywords: [],
        longTailKeywords: [],
        peopleAlsoAsk: [],
        keywordGroups: {},
      };
    }

    // ── c. SERP analysis ──────────────────────────────────────────────────────
    let serpAnalysis;
    try {
      serpAnalysis = await analyzeSERP(keywordData.primaryKeyword);
    } catch {
      serpAnalysis = null;
    }

    // ── d. SEO score ──────────────────────────────────────────────────────────
    const scoreResult = scoreContent(
      originalHtml,
      keywordData,
      { title: '', description: '', slug: '' }
    );

    // ── e. Claude surgical analysis ───────────────────────────────────────────
    const surgicalPrompt = `Analyze this blog. Do NOT suggest rewriting the whole thing. Only find SPECIFIC issues:
1. OUTDATED FACTS: exact quotes + why outdated
2. YEAR REFERENCES: old years (2023/2024/2025) that should be 2026
3. MISSING SECTIONS vs SERP competitors
4. KEYWORD GAPS
5. BROKEN CLAIMS

SERP competitors must-have sections: ${serpAnalysis?.mustHaveSections?.join(', ') || 'N/A'}
Target keyword: ${keywordData.primaryKeyword}

BLOG CONTENT (first 6000 chars):
${originalHtml.slice(0, 6000)}

Return JSON: { outdatedFacts: [{quote,issue,suggestedFix}], yearReferences: [{quote,oldYear}], missingSections: [string], keywordGaps: [string], brokenClaims: [{quote,issue}] }`;

    let surgical: SurgicalAnalysis = {
      outdatedFacts: [],
      yearReferences: [],
      missingSections: [],
      keywordGaps: [],
      brokenClaims: [],
    };

    try {
      const raw = await callClaude(SURGICAL_SYSTEM, surgicalPrompt, 2048);
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      surgical = JSON.parse(cleaned) as SurgicalAnalysis;
    } catch (err) {
      console.warn('[update/analyze] Surgical analysis parse failed:', err);
    }

    // Build issues list
    const issues: UpdateIssue[] = [];

    if (surgical.outdatedFacts?.length > 0) {
      issues.push({ id: 'fix_outdated_facts', label: 'Fix outdated facts', description: `${surgical.outdatedFacts.length} outdated fact(s) found`, severity: 'high', selected: true });
    }
    if (surgical.yearReferences?.length > 0) {
      issues.push({ id: 'update_years', label: 'Update year references', description: `Found old year references to update to 2026`, severity: 'high', selected: true });
    }
    if (surgical.missingSections?.length > 0) {
      issues.push({ id: 'add_missing_sections', label: 'Add missing sections', description: `${surgical.missingSections.length} section(s) competitors have but this post lacks`, severity: 'medium', selected: true });
    }
    if (surgical.keywordGaps?.length > 0) {
      issues.push({ id: 'fix_keyword_density', label: 'Fix keyword gaps', description: `${surgical.keywordGaps.length} keyword gap(s) to address`, severity: 'medium', selected: false });
    }

    // Standard checks from SEO scorer
    const ISSUE_MAP: Record<string, { id: string; label: string; severity: UpdateIssue['severity'] }> = {
      'Internal Links': { id: 'add_internal_links', label: 'Add internal links', severity: 'high' },
      'External Links': { id: 'add_external_links', label: 'Add external links', severity: 'medium' },
      'FAQ Section Present': { id: 'add_faq', label: 'Add FAQ section', severity: 'high' },
      'Paragraph Length': { id: 'fix_paragraph_length', label: 'Fix paragraph length', severity: 'medium' },
      'Keyword Density': { id: 'fix_keyword_density', label: 'Fix keyword density', severity: 'medium' },
    };

    for (const check of scoreResult.checks.filter((c) => c.status !== 'pass')) {
      const mapped = ISSUE_MAP[check.name];
      if (mapped && !issues.find((i) => i.id === mapped.id) && issues.length < 8) {
        issues.push({ ...mapped, description: check.detail, selected: mapped.severity === 'high' });
      }
    }

    issues.push({ id: 'fix_meta_tags', label: 'Optimize meta tags', description: 'Generate optimized title and meta description', severity: 'low', selected: false });

    // ── f. GSC data ───────────────────────────────────────────────────────────
    let gscQuickWins: GSCKeyword[] | undefined;
    let gscMissing: GSCKeyword[] | undefined;

    if (gsc_keywords) {
      const parsed = parseGSCData(gsc_keywords);
      if (parsed.length > 0) {
        gscQuickWins = findQuickWins(parsed);
        gscMissing = findMissingKeywords(parsed, originalHtml);

        if (gscQuickWins.length > 0) {
          issues.push({ id: 'optimize_gsc_keywords', label: 'Optimize GSC keywords', description: `${gscQuickWins.length} quick-win keyword(s) from Search Console`, severity: 'high', selected: true });
        }
      }
    }

    // ── g. Build BlogUpdateAnalysis ───────────────────────────────────────────
    const blogUpdateAnalysis: BlogUpdateAnalysis = {
      currentScore: scoreResult.overall,
      contentIssues: [
        ...surgical.outdatedFacts.map((f) => `Outdated: "${f.quote.slice(0, 80)}" — ${f.issue}`),
        ...surgical.brokenClaims.map((c) => `Broken claim: "${c.quote.slice(0, 80)}" — ${c.issue}`),
      ],
      seoIssues: scoreResult.suggestions,
      suggestedFixes: issues.map((i) => i.id),
      missingSections: surgical.missingSections || [],
      keywordGaps: surgical.keywordGaps || [],
      gscQuickWins,
      gscMissing,
      webflowItemId,
    };

    const result: AnalyzeResult = {
      originalHtml,
      originalText,
      score: scoreResult,
      issues,
      wordCount,
      url: fetchedUrl,
      blogUpdateAnalysis,
    };

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[update/analyze] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
