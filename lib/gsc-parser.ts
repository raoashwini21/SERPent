import type { GSCKeyword } from './types';

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

export function parseGSCData(csvContent: string): GSCKeyword[] {
  try {
    if (!csvContent || csvContent.trim().length === 0) return [];

    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    // Detect delimiter: tab or comma
    const headerLine = lines[0];
    const delimiter = headerLine.includes('\t') ? '\t' : ',';

    const headers = headerLine.split(delimiter).map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());

    // Find column indices
    const queryIdx = headers.findIndex((h) => h === 'top queries' || h === 'query' || h === 'queries');
    const clicksIdx = headers.findIndex((h) => h === 'clicks');
    const impressionsIdx = headers.findIndex((h) => h === 'impressions');
    const ctrIdx = headers.findIndex((h) => h === 'ctr');
    const positionIdx = headers.findIndex((h) => h === 'position');

    if (queryIdx === -1 || clicksIdx === -1 || impressionsIdx === -1) return [];

    const results: GSCKeyword[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));

      const query = cols[queryIdx];
      if (!query) continue;

      const clicks = parseInt(cols[clicksIdx] || '0', 10) || 0;
      const impressions = parseInt(cols[impressionsIdx] || '0', 10) || 0;

      let ctr = 0;
      if (ctrIdx !== -1 && cols[ctrIdx]) {
        const raw = cols[ctrIdx].replace('%', '').trim();
        ctr = parseFloat(raw) || 0;
        // Convert percentage to decimal if > 1
        if (ctr > 1) ctr = ctr / 100;
      }

      const position = positionIdx !== -1 ? parseFloat(cols[positionIdx] || '0') || 0 : 0;

      results.push({ query, clicks, impressions, ctr, position });
    }

    // Sort by impressions desc, return top 50
    results.sort((a, b) => b.impressions - a.impressions);
    return results.slice(0, 50);
  } catch {
    return [];
  }
}

/** Keywords at positions 4–15 with meaningful impressions — easiest ranking wins */
export function findQuickWins(gscData: GSCKeyword[]): GSCKeyword[] {
  return gscData
    .filter((kw) => kw.position >= 4 && kw.position <= 15 && kw.impressions >= 50)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);
}

/** Keywords with impressions but not mentioned in the blog HTML */
export function findMissingKeywords(gscData: GSCKeyword[], blogHtml: string): GSCKeyword[] {
  const text = stripHtml(blogHtml);
  return gscData
    .filter((kw) => kw.impressions >= 20 && !text.includes(kw.query.toLowerCase()))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);
}
