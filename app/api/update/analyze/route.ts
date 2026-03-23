import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '../../../../lib/jina';
import { callClaude } from '../../../../lib/claude';
import { scoreContent } from '../../../../lib/seo/content-scorer';

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
}

export interface UpdateIssue {
  id: string;
  label: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  selected: boolean;
}

const ANALYZE_SYSTEM = `You are an SEO content auditor. Analyze the provided blog post HTML and identify specific, actionable issues. Return a JSON array of issues. Each issue must have these fields:
- id: one of: update_year, fix_paragraph_length, add_internal_links, add_external_links, fix_keyword_density, fix_facts, add_faq, fix_meta_tags
- label: short human-readable label (max 6 words)
- description: one sentence describing the specific problem found
- severity: "high" | "medium" | "low"

Return ONLY a valid JSON array. No markdown, no explanation.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, keyword } = body as { url?: string; keyword?: string };

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    // 1. Scrape the page
    console.log(`[update/analyze] Scraping ${url}`);
    const scrapedText = await scrapeUrl(url);

    if (!scrapedText || scrapedText.trim().length < 100) {
      return NextResponse.json({ error: 'Could not fetch page content. Check the URL and try again.' }, { status: 400 });
    }

    // Convert scraped markdown-like content to basic HTML for scoring
    const originalHtml = scrapedText
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('# ')) return `<h1>${trimmed.slice(2)}</h1>`;
        if (trimmed.startsWith('## ')) return `<h2>${trimmed.slice(3)}</h2>`;
        if (trimmed.startsWith('### ')) return `<h3>${trimmed.slice(4)}</h3>`;
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return `<li>${trimmed.slice(2)}</li>`;
        return `<p>${trimmed}</p>`;
      })
      .join('\n');

    const wordCount = scrapedText.split(/\s+/).filter(Boolean).length;

    // 2. Score existing content
    const primaryKeyword = keyword || url.replace(/^https?:\/\/[^/]+\/blog\//, '').replace(/-/g, ' ').split('/')[0] || 'blog';
    const scoreResult = scoreContent(
      originalHtml,
      {
        primaryKeyword,
        secondaryKeywords: [],
        longTailKeywords: [],
        peopleAlsoAsk: [],
        keywordGroups: {},
      },
      { title: '', description: '', slug: '' }
    );

    // 3. Claude analysis for issues
    console.log(`[update/analyze] Running Claude analysis`);
    const analysisPrompt = `Analyze this blog post content and identify issues that need fixing.

URL: ${url}
Primary keyword hint: ${primaryKeyword}
Word count: ${wordCount}

CONTENT (first 3000 chars):
${scrapedText.slice(0, 3000)}

Identify up to 6 real issues from this list: update_year, fix_paragraph_length, add_internal_links, add_external_links, fix_keyword_density, fix_facts, add_faq, fix_meta_tags

For each issue, check if it is ACTUALLY a problem in the content above. Only include issues that are genuinely present.`;

    let issues: UpdateIssue[] = [];
    try {
      const raw = await callClaude(ANALYZE_SYSTEM, analysisPrompt, 1024);
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(cleaned) as Omit<UpdateIssue, 'selected'>[];
      issues = parsed.map((issue) => ({ ...issue, selected: issue.severity === 'high' }));
    } catch (err) {
      console.warn('[update/analyze] Claude analysis failed, using score-based fallback:', err);
      // Fallback: derive issues from SEO score checks
      const failedChecks = scoreResult.checks.filter((c) => c.status !== 'pass');
      const ISSUE_MAP: Record<string, { id: string; label: string; severity: UpdateIssue['severity'] }> = {
        'Internal Links': { id: 'add_internal_links', label: 'Add internal links', severity: 'high' },
        'External Links': { id: 'add_external_links', label: 'Add external links', severity: 'medium' },
        'FAQ Section Present': { id: 'add_faq', label: 'Add FAQ section', severity: 'high' },
        'Paragraph Length': { id: 'fix_paragraph_length', label: 'Fix paragraph length', severity: 'medium' },
        'Keyword Density': { id: 'fix_keyword_density', label: 'Fix keyword density', severity: 'high' },
      };
      for (const check of failedChecks) {
        const mapped = ISSUE_MAP[check.name];
        if (mapped && issues.length < 6) {
          issues.push({
            ...mapped,
            description: check.detail,
            selected: mapped.severity === 'high',
          });
        }
      }
      // Always include update_year as a low-severity suggestion
      if (!issues.find((i) => i.id === 'update_year')) {
        issues.push({
          id: 'update_year',
          label: 'Update year references',
          description: 'Update any outdated year references to current year.',
          severity: 'low',
          selected: false,
        });
      }
    }

    const result: AnalyzeResult = {
      originalHtml,
      originalText: scrapedText,
      score: scoreResult,
      issues,
      wordCount,
      url,
    };

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[update/analyze] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
