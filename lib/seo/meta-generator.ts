import { ContentBrief, KeywordData } from '../types';

const CURRENT_YEAR = new Date().getFullYear();
const SITE_URL = 'https://www.salesrobot.co';

export function generateMetaTags(
  brief: ContentBrief,
  keywordData: KeywordData,
  slug: string
): {
  title: string;
  description: string;
  keywords: string;
  og: { url: string; type: string; title: string; description: string; image: string };
  twitter: { card: string; title: string; description: string; image: string };
  canonical: string;
  sitemap: string;
} {
  const canonicalUrl = `${SITE_URL}/blog/${slug}`;
  const imagePlaceholder = `${SITE_URL}/blog/${slug}/og-image.png`;

  // Build title: primary keyword + year + hook + brand, under 70 chars
  let title = brief.blogTitle;
  if (!title.includes(String(CURRENT_YEAR))) {
    title = title.replace(/\|/, `${CURRENT_YEAR} |`).replace(/  +/, ' ');
  }
  if (!title.includes('SalesRobot') && title.length < 55) {
    title = `${title} | SalesRobot`;
  }
  title = title.slice(0, 70);

  // Build description: under 150 chars, contains primary keyword, active voice
  const primary = keywordData.primaryKeyword;
  const secondaryHint = keywordData.secondaryKeywords[0]?.keyword ?? '';
  let description = `Discover the best ${primary} strategies for ${CURRENT_YEAR}. ${secondaryHint ? `Covers ${secondaryHint} and more.` : ''} Start your free trial today.`;
  description = description.slice(0, 150);

  const keywords = [
    keywordData.primaryKeyword,
    ...keywordData.secondaryKeywords.map((k) => k.keyword),
  ]
    .slice(0, 10)
    .join(', ');

  return {
    title,
    description,
    keywords,
    og: {
      url: canonicalUrl,
      type: 'article',
      title,
      description,
      image: imagePlaceholder,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      image: imagePlaceholder,
    },
    canonical: canonicalUrl,
    sitemap: '/sitemap.xml',
  };
}
