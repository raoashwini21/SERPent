import { searchWeb, scrapeUrl, delay } from '../jina';
import { callClaude } from '../claude';
import { SERPAnalysis, SERPResult } from '../types';

function parseSearchResults(markdown: string): SERPResult[] {
  const results: SERPResult[] = [];
  // Jina Search returns results in markdown format with numbered entries
  // Pattern: title, URL, and snippet blocks
  const blocks = markdown.split(/\n(?=\d+\.\s)/);

  for (const block of blocks.slice(0, 10)) {
    const titleMatch = block.match(/\d+\.\s+\*\*(.+?)\*\*/);
    const urlMatch = block.match(/(?:URL|url|Source):\s*(https?:\/\/\S+)/i) ||
      block.match(/(https?:\/\/[^\s\n]+)/);
    const snippetMatch = block.match(/(?:Description|snippet|Summary)?:?\s*\n?([\s\S]{30,400})/);

    if (titleMatch && urlMatch) {
      results.push({
        title: titleMatch[1].trim(),
        url: urlMatch[1].trim(),
        snippet: snippetMatch ? snippetMatch[1].trim().slice(0, 300) : '',
      });
    }
  }

  // Fallback: try line-by-line parsing if structured parsing yields nothing
  if (results.length === 0) {
    const lines = markdown.split('\n').filter((l) => l.trim().length > 0);
    let current: Partial<SERPResult> | null = null;

    for (const line of lines) {
      const urlMatch = line.match(/(https?:\/\/[^\s)]+)/);
      if (urlMatch && current?.title) {
        current.url = urlMatch[1];
        current.snippet = '';
        results.push(current as SERPResult);
        current = null;
        if (results.length >= 10) break;
      } else if (line.match(/^\d+\.\s+/) || line.match(/^#+\s+/)) {
        current = { title: line.replace(/^\d+\.\s+|^#+\s+|\*\*/g, '').trim() };
      }
    }
  }

  return results.slice(0, 10);
}

export async function analyzeSERP(keyword: string): Promise<SERPAnalysis> {
  // Step 1: Search
  const searchMarkdown = await searchWeb(keyword);

  // Step 2: Parse top 10 results
  const results = parseSearchResults(searchMarkdown);

  // Step 3: Scrape top 3
  const scrapedContents: string[] = [];
  const top3 = results.slice(0, 3);

  for (const result of top3) {
    try {
      const content = await scrapeUrl(result.url);
      scrapedContents.push(`=== ${result.title} (${result.url}) ===\n${content.slice(0, 4000)}`);
      await delay(200);
    } catch {
      // Skip failed scrapes
    }
  }

  // Step 4: Claude analysis
  const systemPrompt = `You are an SEO content strategist. Analyze SERP results and scraped pages to identify content opportunities. Return valid JSON only — no prose, no markdown fences.`;

  const userMessage = `Analyze these top Google results for the keyword: "${keyword}"

SEARCH RESULTS (top 10):
${results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`).join('\n\n')}

SCRAPED CONTENT (top 3):
${scrapedContents.join('\n\n---\n\n')}

Return a JSON object with EXACTLY this structure:
{
  "results": [
    { "title": "...", "url": "...", "snippet": "...", "wordCount": 2000, "headings": ["H2 heading 1", "H2 heading 2"] }
  ],
  "avgWordCount": 2500,
  "contentGaps": ["topic all competitors miss", "angle not covered well"],
  "searchIntent": "informational",
  "mustHaveSections": ["section all top results have"],
  "headingSuggestions": ["Keyword-optimized H2 suggestion as a question?"]
}

Rules:
- searchIntent: one of "informational", "investigational", "transactional"
- contentGaps: 3-6 topics the query searcher wants but competitors don't fully cover
- mustHaveSections: 4-8 sections that appear in majority of top results
- headingSuggestions: 6-10 H2 ideas framed as questions, keyword-optimized
- Estimate wordCount for each result based on scraped content depth
- Return ONLY the JSON, nothing else`;

  const raw = await callClaude(systemPrompt, userMessage, 3000);
  const cleaned = raw.replace(/```(?:json)?/g, '').trim();
  const parsed = JSON.parse(cleaned) as SERPAnalysis;

  // Merge parsed results with our scraped results if Claude returned empty
  if (!parsed.results || parsed.results.length === 0) {
    parsed.results = results;
  }

  return parsed;
}
