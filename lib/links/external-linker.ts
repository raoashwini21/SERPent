import { ResearchBrief } from '../types';

const AUTHORITY_LINKS: { keyword: RegExp; url: string; anchor: string }[] = [
  {
    keyword: /\bLinkedIn\b/,
    url: 'https://www.linkedin.com',
    anchor: 'LinkedIn',
  },
  {
    keyword: /\boutbound sales\b/i,
    url: 'https://blog.hubspot.com/sales/outbound-sales',
    anchor: 'outbound sales',
  },
  {
    keyword: /\bemail deliverability\b/i,
    url: 'https://blog.hubspot.com/marketing/email-deliverability',
    anchor: 'email deliverability',
  },
  {
    keyword: /\bsales automation\b/i,
    url: 'https://www.forbes.com/advisor/business/software/best-sales-automation-software/',
    anchor: 'sales automation',
  },
  {
    keyword: /\blead generation\b/i,
    url: 'https://blog.hubspot.com/marketing/beginner-inbound-lead-generation-guide-ht',
    anchor: 'lead generation',
  },
];

/** Check if a paragraph already has an external link */
function paraHasExternalLink(paraHtml: string): boolean {
  return /href="https?:\/\//i.test(paraHtml);
}

export function injectExternalLinks(html: string, research: ResearchBrief): string {
  let result = html;
  const injected = new Set<string>();

  // 1. G2 review link
  if (research.g2Rating && !injected.has('g2')) {
    const g2Url = `https://www.g2.com/products/${research.productName.toLowerCase().replace(/\s+/g, '-')}/reviews`;
    const g2Pattern = /(<p[^>]*>)((?:(?!<\/p>)[\s\S])*?)(G2)((?:(?!<\/p>)[\s\S])*?)(<\/p>)/i;
    result = result.replace(g2Pattern, (full, open, before, match, after, close) => {
      if (paraHasExternalLink(full)) return full;
      injected.add('g2');
      return `${open}${before}<a href="${g2Url}" target="_blank" rel="noopener noreferrer">${match}</a>${after}${close}`;
    });
  }

  // 2. Capterra link
  if (research.capterraRating && !injected.has('capterra')) {
    const capUrl = `https://www.capterra.com/p/search/?query=${encodeURIComponent(research.productName)}`;
    const capPattern = /(<p[^>]*>)((?:(?!<\/p>)[\s\S])*?)(Capterra)((?:(?!<\/p>)[\s\S])*?)(<\/p>)/i;
    result = result.replace(capPattern, (full, open, before, match, after, close) => {
      if (paraHasExternalLink(full)) return full;
      injected.add('capterra');
      return `${open}${before}<a href="${capUrl}" target="_blank" rel="noopener noreferrer">${match}</a>${after}${close}`;
    });
  }

  // 3. Authority keyword links (max 3, skip if paragraph already has external link)
  let authorityCount = 0;
  for (const link of AUTHORITY_LINKS) {
    if (authorityCount >= 3) break;
    if (injected.has(link.anchor)) continue;

    const pPattern = new RegExp(
      `(<p[^>]*>)((?:(?!<\\/p>)[\\s\\S])*?)(${link.keyword.source})((?:(?!<\\/p>)[\\s\\S])*?)(<\\/p>)`,
      'i'
    );

    const newResult = result.replace(pPattern, (full, open, before, match, after, close) => {
      if (paraHasExternalLink(full)) return full;
      injected.add(link.anchor);
      authorityCount++;
      return `${open}${before}<a href="${link.url}" target="_blank" rel="noopener noreferrer">${match}</a>${after}${close}`;
    });

    if (newResult !== result) {
      result = newResult;
    }
  }

  return result;
}
