import { GSCKeyword } from './types';

export function parseGSCData(csvContent: string): GSCKeyword[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  // Detect separator (tab or comma)
  const header = lines[0];
  const sep = header.includes('\t') ? '\t' : ',';

  const headers = header
    .split(sep)
    .map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());

  const queryIdx = headers.findIndex(
    (h) => h === 'top queries' || h === 'query' || h === 'queries'
  );
  const clicksIdx = headers.findIndex((h) => h === 'clicks');
  const impressionsIdx = headers.findIndex((h) => h === 'impressions');
  const ctrIdx = headers.findIndex((h) => h === 'ctr');
  const positionIdx = headers.findIndex((h) => h === 'position');

  if (queryIdx === -1) return [];

  const results: GSCKeyword[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));

    const query = cols[queryIdx] ?? '';
    if (!query) continue;

    const clicks = clicksIdx >= 0 ? parseInt(cols[clicksIdx] ?? '0', 10) || 0 : 0;
    const impressions =
      impressionsIdx >= 0 ? parseInt(cols[impressionsIdx] ?? '0', 10) || 0 : 0;
    const ctrRaw = ctrIdx >= 0 ? (cols[ctrIdx] ?? '0').replace('%', '') : '0';
    const ctr = parseFloat(ctrRaw) || 0;
    const position =
      positionIdx >= 0 ? parseFloat(cols[positionIdx] ?? '0') || 0 : 0;

    results.push({ query, clicks, impressions, ctr, position });
  }

  return results;
}

/** Keywords at positions 4–15 with meaningful impressions — easiest ranking wins */
export function findQuickWins(gscData: GSCKeyword[]): GSCKeyword[] {
  return gscData
    .filter((kw) => kw.position >= 4 && kw.position <= 15 && kw.impressions >= 50)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);
}

/** Keywords with impressions but not mentioned in the blog HTML */
export function findMissingKeywords(
  gscData: GSCKeyword[],
  blogHtml: string
): GSCKeyword[] {
  const lowerHtml = blogHtml.toLowerCase();
  return gscData
    .filter((kw) => {
      const query = kw.query.toLowerCase();
      return kw.impressions >= 20 && !lowerHtml.includes(query);
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);
}
